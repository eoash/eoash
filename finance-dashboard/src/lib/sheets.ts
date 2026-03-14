import { google } from "googleapis";
import type {
  RevenueMonthly,
  RevenueSegment,
  RevenueSegmentDetail,
  CashRegionSummary,
  IncomeMonthly,
  ExpenseCategory,
  FxRate,
} from "./types";
import { parseNumber } from "./utils";

function getSheets() {
  const authOptions: ConstructorParameters<typeof google.auth.GoogleAuth>[0] = {
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  };

  // 방법 1: Base64 인코딩된 SA JSON (Vercel 권장 — newline 문제 없음)
  if (process.env.GOOGLE_SA_KEY_BASE64) {
    const decoded = Buffer.from(process.env.GOOGLE_SA_KEY_BASE64, "base64").toString();
    const credentials = JSON.parse(decoded);
    authOptions.credentials = credentials;
  }
  // 방법 2: 개별 환경변수 (로컬 .env.local)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    authOptions.credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  // 방법 3: ADC (gcloud auth application-default login)

  const auth = new google.auth.GoogleAuth(authOptions);
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

async function readSheet(sheetName: string, range: string): Promise<string[][]> {
  const sheets = getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!${range}`,
    });
    return (res.data.values as string[][]) ?? [];
  } catch (err) {
    console.warn(`[readSheet] Failed to read '${sheetName}'!${range}:`, err);
    throw err;
  }
}

// ─── Sync Tab 헬퍼 ────────────────────────────
// _SYNC_ 탭 구조: Row1=메타데이터, Row2=헤더, Row3+=데이터

const SYNC_PREFIX = "_SYNC_";
const CURRENT_YEAR = new Date().getFullYear();

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseNumber(String(val ?? "0"));
}

interface SyncTab {
  headers: string[];
  data: unknown[][];
}

async function readSyncTab(tabName: string): Promise<SyncTab | null> {
  try {
    const rows = await readSheet(SYNC_PREFIX + tabName, "A1:Z500");
    if (rows.length < 3) return null;
    if (String(rows[0]?.[1] || "") !== "OK") return null;
    return {
      headers: (rows[1] || []).map((h) => String(h || "").trim()),
      data: rows.slice(2).filter((r) => r && r.some((cell) => cell !== "" && cell != null)),
    };
  } catch {
    return null;
  }
}

// ─── Revenue ──────────────────────────────────

/** API 응답 메타데이터 (디버그 + 모니터링용) */
export interface FetchMeta {
  _source: "sync" | "original";
  _fetchedAt: string;
}

export async function fetchRevenue(year: number = 2026): Promise<{
  monthly: RevenueMonthly[];
  months: string[];
  segments: RevenueSegment[];
  segmentDetails: RevenueSegmentDetail[];
  totalActual: number;
  totalTarget: number;
  _meta: FetchMeta;
}> {
  if (year === CURRENT_YEAR) {
    const sync = await readSyncTab("Revenue");
    if (sync) return { ...revenueFromSync(sync), _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
  }
  return { ...await revenueFromOriginal(year), _meta: { _source: "original", _fetchedAt: new Date().toISOString() } };
}

function revenueFromSync(sync: SyncTab) {
  // headers: [division, category, 1월, 2월, ...]
  const months = sync.headers.slice(2);
  const mc = months.length;

  const segmentDetails: RevenueSegmentDetail[] = [];
  const segmentMap = new Map<string, number>();
  const monthly: RevenueMonthly[] = [];
  let totalActual = 0;

  // 사업부별 그룹핑
  const groups = new Map<string, unknown[][]>();
  for (const row of sync.data) {
    const div = String(row[0] || "");
    if (!groups.has(div)) groups.set(div, []);
    groups.get(div)!.push(row);
  }

  for (const [division, rows] of groups) {
    if (division === "전체") {
      const totalRow = rows.find((r) => String(r[1]) === "합계");
      if (totalRow) {
        for (let m = 0; m < mc; m++) {
          const val = toNum(totalRow[m + 2]);
          monthly.push({ month: months[m] || `${m + 1}월`, actual: val, target: 0 });
          totalActual += val;
        }
      }
      continue;
    }

    const subtotalRow = rows.find((r) => String(r[1]) === "소계");
    const headcountRow = rows.find((r) => String(r[1]) === "인원수");
    const perPersonRow = rows.find((r) => String(r[1]) === "인당 매출");
    const itemRows = rows.filter((r) => !["소계", "인원수", "인당 매출"].includes(String(r[1])));

    const vals = (row: unknown[] | undefined) =>
      row ? Array.from({ length: mc }, (_, m) => toNum(row[m + 2])) : new Array(mc).fill(0);

    const subtotal = vals(subtotalRow);
    const segTotal = subtotal.reduce((s, v) => s + v, 0);
    segmentMap.set(division, segTotal);

    segmentDetails.push({
      segment: division,
      items: itemRows
        .map((r) => {
          const v = vals(r);
          return { name: String(r[1] || ""), monthly: v, total: v.reduce((s, n) => s + n, 0) };
        })
        .filter((it) => it.total > 0),
      subtotal,
      headcount: vals(headcountRow),
      perPerson: vals(perPersonRow),
      total: segTotal,
    });
  }

  const segments = Array.from(segmentMap.entries())
    .map(([segment, amount]) => ({ segment, amount }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, months, segments, segmentDetails, totalActual, totalTarget: REVENUE_TARGETS[CURRENT_YEAR] ?? 0 };
}

// 연간 매출 목표 (KRW 기준, 환율 1 USD = 1,450 KRW)
// 2026: $10M USD = ₩14,500,000,000
const REVENUE_TARGETS: Record<number, number> = {
  2026: 14_500_000_000,
};

async function revenueFromOriginal(year: number) {
  const rows = await readSheet(`${year} 매출`, "A1:T45");

  const months: string[] = [];
  const monthStartCol = 3;

  for (const row of rows) {
    if (row[monthStartCol] === "1월") {
      for (let c = monthStartCol; c < row.length; c++) {
        const label = (row[c] || "").trim();
        if (label && /^\d{1,2}월$/.test(label)) months.push(label);
        else break;
      }
      break;
    }
  }

  const monthCount = months.length;

  function parseRow(row: string[]): number[] {
    const vals: number[] = [];
    for (let c = monthStartCol; c < monthStartCol + monthCount; c++) {
      vals.push(parseNumber(row[c] || "0"));
    }
    return vals;
  }

  const segmentDetails: RevenueSegmentDetail[] = [];
  const segmentMap = new Map<string, number>();
  const monthly: RevenueMonthly[] = [];
  let totalActual = 0;

  let currentSegment = "";
  let currentItems: { name: string; monthly: number[]; total: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col1 = (row[1] || "").trim();
    const col2 = (row[2] || "").trim();

    if (col1 && col2 && col2 !== "소계" && col2 !== "인원수" && col2 !== "인당 매출" && col2 !== "합계") {
      currentSegment = col1;
      currentItems = [];
      const vals = parseRow(row);
      const total = vals.reduce((s, v) => s + v, 0);
      currentItems.push({ name: col2, monthly: vals, total });
      continue;
    }

    if (!col1 && col2 && col2 !== "소계" && col2 !== "인원수" && col2 !== "인당 매출" && col2 !== "합계" && currentSegment) {
      const vals = parseRow(row);
      const total = vals.reduce((s, v) => s + v, 0);
      currentItems.push({ name: col2, monthly: vals, total });
      continue;
    }

    if (col2 === "소계" && currentSegment) {
      const subtotal = parseRow(row);
      const segTotal = subtotal.reduce((s, v) => s + v, 0);
      segmentMap.set(currentSegment, segTotal);

      const headcountRow = rows[i + 1];
      const perPersonRow = rows[i + 2];
      const headcount =
        headcountRow && (headcountRow[2] || "").trim() === "인원수"
          ? parseRow(headcountRow)
          : new Array(monthCount).fill(0);
      const perPerson =
        perPersonRow && (perPersonRow[2] || "").trim() === "인당 매출"
          ? parseRow(perPersonRow)
          : new Array(monthCount).fill(0);

      segmentDetails.push({
        segment: currentSegment,
        items: currentItems.filter((it) => it.total > 0),
        subtotal,
        headcount,
        perPerson,
        total: segTotal,
      });
      currentSegment = "";
      currentItems = [];
      continue;
    }

    if (col2 === "합계") {
      const vals = parseRow(row);
      for (let m = 0; m < monthCount; m++) {
        monthly.push({
          month: months[m] || `${m + 1}월`,
          actual: vals[m],
          target: 0,
        });
        totalActual += vals[m];
      }
    }
  }

  const segments = Array.from(segmentMap.entries())
    .map(([segment, amount]) => ({ segment, amount }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, months, segments, segmentDetails, totalActual, totalTarget: REVENUE_TARGETS[year] ?? 0 };
}

// ─── Cash Position ────────────────────────────

export async function fetchCashPosition(year: number = 2026): Promise<{
  months: string[];
  monthlyData: import("./types").CashMonthly[];
  exchangeRates: { usdKrw: number; usdVnd: number };
  burnRate: number;
  runway: number;
  _meta: FetchMeta;
}> {
  if (year === CURRENT_YEAR) {
    const sync = await readSyncTab("Cash");
    if (sync) return { ...cashFromSync(sync), _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
  }
  return { ...await cashFromOriginal(year), _meta: { _source: "original", _fetchedAt: new Date().toISOString() } };
}

function cashFromSync(sync: SyncTab) {
  // headers: [region, currency, metric, month1, month2, ...]
  const months = sync.headers.slice(3);

  // 행 검색 헬퍼
  function findRow(region: string, currency: string, metric: string): unknown[] | undefined {
    return sync.data.find(
      (r) => String(r[0]) === region && String(r[1]) === currency && String(r[2]) === metric,
    );
  }

  function getVal(row: unknown[] | undefined, monthIdx: number): number {
    return row ? toNum(row[monthIdx + 3]) : 0;
  }

  // 환율
  const fxUsdRow = findRow("FX", "USD/KRW", "rate");
  const fxVndRow = findRow("FX", "USD/VND", "rate");
  const latestMonthIdx = months.length - 1;
  const usdKrw = fxUsdRow ? toNum(fxUsdRow[latestMonthIdx + 3]) || toNum(fxUsdRow[3]) || 1460 : 1460;
  const usdVnd = fxVndRow ? toNum(fxVndRow[latestMonthIdx + 3]) || toNum(fxVndRow[3]) || 0 : 0;

  // 지역별 행
  const krRow = findRow("Korea", "KRW", "Balance");
  const krInRow = findRow("Korea", "KRW", "Inflows");
  const krOutRow = findRow("Korea", "KRW", "Outflows");
  const krNetRow = findRow("Korea", "KRW", "Net Change");

  const usKrwRow = findRow("U.S.", "KRW", "Balance");
  const usKrwInRow = findRow("U.S.", "KRW", "Inflows");
  const usKrwOutRow = findRow("U.S.", "KRW", "Outflows");
  const usKrwNetRow = findRow("U.S.", "KRW", "Net Change");
  const usUsdRow = findRow("U.S.", "USD", "Balance");

  const vnKrwRow = findRow("Vietnam", "KRW", "Balance");
  const vnKrwInRow = findRow("Vietnam", "KRW", "Inflows");
  const vnKrwOutRow = findRow("Vietnam", "KRW", "Outflows");
  const vnKrwNetRow = findRow("Vietnam", "KRW", "Net Change");
  const vnVndRow = findRow("Vietnam", "VND", "Balance");

  const totalBalRow = findRow("Total", "KRW", "Balance");
  const totalInRow = findRow("Total", "KRW", "Inflows");
  const totalOutRow = findRow("Total", "KRW", "Outflows");
  const totalNetRow = findRow("Total", "KRW", "Net Change");

  const monthlyData: import("./types").CashMonthly[] = [];
  for (let m = 0; m < months.length; m++) {
    const regionKR: import("./types").CashRegionData = {
      region: "KR",
      regionLabel: "한국",
      balanceKrw: getVal(krRow, m),
      inflowsKrw: getVal(krInRow, m),
      outflowsKrw: getVal(krOutRow, m),
      netChangeKrw: getVal(krNetRow, m),
      balanceLocal: getVal(krRow, m),
      localCurrency: "KRW",
    };
    const regionUS: import("./types").CashRegionData = {
      region: "US",
      regionLabel: "미국",
      balanceKrw: getVal(usKrwRow, m),
      inflowsKrw: getVal(usKrwInRow, m),
      outflowsKrw: getVal(usKrwOutRow, m),
      netChangeKrw: getVal(usKrwNetRow, m),
      balanceLocal: getVal(usUsdRow, m),
      localCurrency: "USD",
    };
    const regionVN: import("./types").CashRegionData = {
      region: "VN",
      regionLabel: "베트남",
      balanceKrw: getVal(vnKrwRow, m),
      inflowsKrw: getVal(vnKrwInRow, m),
      outflowsKrw: getVal(vnKrwOutRow, m),
      netChangeKrw: getVal(vnKrwNetRow, m),
      balanceLocal: getVal(vnVndRow, m),
      localCurrency: "VND",
    };

    const totalBalance = getVal(totalBalRow, m) || regionKR.balanceKrw + regionUS.balanceKrw + regionVN.balanceKrw;
    const totalInflows = getVal(totalInRow, m);
    const totalOutflows = getVal(totalOutRow, m);
    const totalNetChange = getVal(totalNetRow, m);

    monthlyData.push({
      month: months[m],
      regions: [regionKR, regionUS, regionVN],
      totalBalanceKrw: totalBalance,
      totalInflowsKrw: totalInflows,
      totalOutflowsKrw: totalOutflows,
      totalNetChangeKrw: totalNetChange,
    });
  }

  const monthsWithOutflows = monthlyData.filter((m) => m.totalOutflowsKrw > 0);
  const burnRate =
    monthsWithOutflows.length > 0
      ? monthsWithOutflows.reduce((s, m) => s + m.totalOutflowsKrw, 0) / monthsWithOutflows.length
      : 0;
  const latestBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].totalBalanceKrw : 0;
  const runway = burnRate > 0 ? latestBalance / burnRate : 0;

  return { months, monthlyData, exchangeRates: { usdKrw, usdVnd }, burnRate, runway };
}

async function cashFromOriginal(year: number) {
  const rows = await readSheet(`${year} Cash Position Summary`, "A1:Z45");

  const monthHeaders = rows[0] || [];
  const months: string[] = [];
  for (let c = 3; c < monthHeaders.length; c++) {
    const label = (monthHeaders[c] || "").trim();
    if (label) months.push(label);
  }

  function findRegionRows(searchKey: string, maxRow: number): number {
    for (let i = 0; i < Math.min(rows.length, maxRow); i++) {
      if ((rows[i]?.[1] || "").trim().includes(searchKey) && (rows[i]?.[2] || "").trim() === "Balance") return i;
    }
    return -1;
  }

  const krRow = findRegionRows("Korea", 17);
  const usKrwRow = findRegionRows("U.S.", 17);
  const vnKrwRow = findRegionRows("Vietnam", 17);
  const totalRow = findRegionRows("Total", 17);

  let usUsdRow = -1;
  let vnVndRow = -1;
  for (let i = 17; i < rows.length; i++) {
    const col1 = (rows[i]?.[1] || "").trim();
    const col2 = (rows[i]?.[2] || "").trim();
    if (col1.includes("U.S.") && col1.includes("USD") && col2 === "Balance") usUsdRow = i;
    if (col1.includes("Vietnam") && col1.includes("VND") && col2 === "Balance") vnVndRow = i;
  }

  let usdKrw = 1460;
  let usdVnd = 0;
  for (let i = 17; i < rows.length; i++) {
    if ((rows[i]?.[2] || "").trim() === "exchange rate") {
      const col1 = (rows[i]?.[1] || "").trim();
      const latestCol = months.length > 0 ? months.length + 2 : 3;
      const val = parseNumber(rows[i]?.[latestCol] || rows[i]?.[3] || "0");
      if (col1 === "" && i < 30 && val > 0) usdKrw = val;
      if (i > 30 && val > 0) usdVnd = val;
    }
  }

  const monthlyData: import("./types").CashMonthly[] = [];
  for (let m = 0; m < months.length; m++) {
    const c = m + 3;
    const getVal = (rowIdx: number, offset: number) => parseNumber(rows[rowIdx + offset]?.[c] || "0");

    const regionKR: import("./types").CashRegionData = {
      region: "KR",
      regionLabel: "한국",
      balanceKrw: krRow >= 0 ? getVal(krRow, 0) : 0,
      inflowsKrw: krRow >= 0 ? getVal(krRow, 1) : 0,
      outflowsKrw: krRow >= 0 ? getVal(krRow, 2) : 0,
      netChangeKrw: krRow >= 0 ? getVal(krRow, 3) : 0,
      balanceLocal: krRow >= 0 ? getVal(krRow, 0) : 0,
      localCurrency: "KRW",
    };
    const regionUS: import("./types").CashRegionData = {
      region: "US",
      regionLabel: "미국",
      balanceKrw: usKrwRow >= 0 ? getVal(usKrwRow, 0) : 0,
      inflowsKrw: usKrwRow >= 0 ? getVal(usKrwRow, 1) : 0,
      outflowsKrw: usKrwRow >= 0 ? getVal(usKrwRow, 2) : 0,
      netChangeKrw: usKrwRow >= 0 ? getVal(usKrwRow, 3) : 0,
      balanceLocal: usUsdRow >= 0 ? parseNumber(rows[usUsdRow]?.[c] || "0") : 0,
      localCurrency: "USD",
    };
    const regionVN: import("./types").CashRegionData = {
      region: "VN",
      regionLabel: "베트남",
      balanceKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 0) : 0,
      inflowsKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 1) : 0,
      outflowsKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 2) : 0,
      netChangeKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 3) : 0,
      balanceLocal: vnVndRow >= 0 ? parseNumber(rows[vnVndRow]?.[c] || "0") : 0,
      localCurrency: "VND",
    };

    const totalBalance =
      totalRow >= 0 ? getVal(totalRow, 0) : regionKR.balanceKrw + regionUS.balanceKrw + regionVN.balanceKrw;
    const totalInflows = totalRow >= 0 ? getVal(totalRow, 1) : 0;
    const totalOutflows = totalRow >= 0 ? getVal(totalRow, 2) : 0;
    const totalNetChange = totalRow >= 0 ? getVal(totalRow, 3) : 0;

    monthlyData.push({
      month: months[m],
      regions: [regionKR, regionUS, regionVN],
      totalBalanceKrw: totalBalance,
      totalInflowsKrw: totalInflows,
      totalOutflowsKrw: totalOutflows,
      totalNetChangeKrw: totalNetChange,
    });
  }

  const monthsWithOutflows = monthlyData.filter((m) => m.totalOutflowsKrw > 0);
  const burnRate =
    monthsWithOutflows.length > 0
      ? monthsWithOutflows.reduce((s, m) => s + m.totalOutflowsKrw, 0) / monthsWithOutflows.length
      : 0;
  const latestBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].totalBalanceKrw : 0;
  const runway = burnRate > 0 ? latestBalance / burnRate : 0;

  return { months, monthlyData, exchangeRates: { usdKrw, usdVnd }, burnRate, runway };
}

// ─── Income Statement ─────────────────────────

export async function fetchIncome(): Promise<{
  monthly: IncomeMonthly[];
  expenses: ExpenseCategory[];
  totalRevenue: number;
  totalExpense: number;
  _meta: FetchMeta;
}> {
  const sync = await readSyncTab("Income");
  if (sync) return { ...incomeFromSync(sync), _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
  return { ...await incomeFromOriginal(), _meta: { _source: "original", _fetchedAt: new Date().toISOString() } };
}

function incomeFromSync(sync: SyncTab) {
  // headers: [type, category, 1월, 2월, ...]
  const months = sync.headers.slice(2);

  const revenueRow = sync.data.find((r) => String(r[0]) === "Revenue");
  const expensesRow = sync.data.find((r) => String(r[0]) === "Expenses");
  const expenseRows = sync.data.filter((r) => String(r[0]) === "Expense");

  const monthly: IncomeMonthly[] = [];
  let totalRevenue = 0;
  let totalExpense = 0;

  for (let m = 0; m < months.length; m++) {
    const revenue = revenueRow ? toNum(revenueRow[m + 2]) : 0;
    const expense = expensesRow ? Math.abs(toNum(expensesRow[m + 2])) : 0;
    monthly.push({ month: months[m], revenue, expense, netIncome: revenue - expense });
    totalRevenue += revenue;
    totalExpense += expense;
  }

  const expenses: ExpenseCategory[] = expenseRows
    .map((r) => ({
      category: String(r[1] || ""),
      amount: Math.abs(
        Array.from({ length: months.length }, (_, m) => toNum(r[m + 2])).reduce((s, v) => s + v, 0),
      ),
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, expenses, totalRevenue, totalExpense };
}

async function incomeFromOriginal() {
  const rows = await readSheet("2026년", "A1:V70");

  const monthStartCol = 8;
  const monthLabels: string[] = [];
  const headerRow = rows[3] || [];
  for (let c = monthStartCol; c < Math.min(headerRow.length, monthStartCol + 12); c++) {
    const label = (headerRow[c] || "").trim();
    if (label) monthLabels.push(label);
  }

  let revenueRow: string[] = [];
  let expensesRow: string[] = [];
  const expenseCategories: { name: string; values: number[] }[] = [];
  let inExpenseSection = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const col3 = (row[3] || "").trim();

    if (col3 === "Revenue") {
      revenueRow = row;
    }

    if (col3 === "Expenses") {
      expensesRow = row;
      inExpenseSection = true;
      continue;
    }

    if (inExpenseSection && col3) {
      const values: number[] = [];
      for (let c = monthStartCol; c < monthStartCol + monthLabels.length; c++) {
        values.push(parseNumber(row[c] || "0"));
      }
      const total = values.reduce((s, v) => s + v, 0);
      if (total !== 0) {
        expenseCategories.push({ name: col3, values });
      }
    }

    if (inExpenseSection && (col3 === "Net Income" || col3 === "EBITDA" || col3.startsWith("Net"))) {
      inExpenseSection = false;
    }
  }

  const monthly: IncomeMonthly[] = [];
  let totalRevenue = 0;
  let totalExpense = 0;

  for (let m = 0; m < monthLabels.length; m++) {
    const c = monthStartCol + m;
    const revenue = parseNumber(revenueRow[c] || "0");
    const expense = Math.abs(parseNumber(expensesRow[c] || "0"));
    monthly.push({
      month: monthLabels[m].replace("26. ", "").replace(".", "월"),
      revenue,
      expense,
      netIncome: revenue - expense,
    });
    totalRevenue += revenue;
    totalExpense += expense;
  }

  const expenses: ExpenseCategory[] = expenseCategories
    .map((cat) => ({
      category: cat.name,
      amount: Math.abs(cat.values.reduce((s, v) => s + v, 0)),
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, expenses, totalRevenue, totalExpense };
}

// ─── AR (미수금) ──────────────────────────────

export async function fetchAR(): Promise<{
  invoices: import("./types").ArInvoice[];
  agingBuckets: import("./types").ArAgingBucket[];
  clientSummaries: import("./types").ArClientSummary[];
  totalOutstanding: number;
  outstandingCount: number;
  avgCollectionDays: number;
  maxAgingDays: number;
  _meta: FetchMeta;
}> {
  const sync = await readSyncTab("AR");
  if (sync) return { ...arFromSync(sync), _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
  return { ...await arFromOriginal(), _meta: { _source: "original", _fetchedAt: new Date().toISOString() } };
}

function arFromSync(sync: SyncTab) {
  // headers: [month, client, amount, description, invoiceDate, paymentDate, collectionDays, note]
  const today = new Date();
  const invoices: import("./types").ArInvoice[] = [];

  for (const row of sync.data) {
    const client = String(row[1] || "").trim();
    const amount = toNum(row[2]);
    if (!client || amount === 0) continue;

    const paymentDateRaw = String(row[5] || "").trim();
    const hasPaid = paymentDateRaw.length > 0;
    const note = String(row[7] || "").trim();
    let status: "paid" | "unpaid" | "checking" | "scheduled" = hasPaid ? "paid" : "unpaid";
    if (!hasPaid && note === "확인필요") status = "checking";
    if (!hasPaid && (note.includes("예정") || note.includes("입금요청"))) status = "scheduled";

    const invoiceDate = String(row[4] || "").trim();
    let agingDays = 0;
    if (!hasPaid && invoiceDate) {
      const d = parseDate(invoiceDate);
      if (d) agingDays = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
    }

    const risk = hasPaid
      ? ("green" as const)
      : agingDays <= 30
        ? ("yellow" as const)
        : agingDays <= 60
          ? ("orange" as const)
          : ("red" as const);

    invoices.push({
      month: String(row[0] || "").trim(),
      client,
      amount,
      description: String(row[3] || "").trim(),
      invoiceDate,
      paymentDate: hasPaid ? paymentDateRaw : null,
      collectionDays: hasPaid ? toNum(row[6]) : 0,
      status,
      note,
      agingDays,
      risk,
    });
  }

  return buildArResult(invoices);
}

async function arFromOriginal() {
  const rows = await readSheet("거래처별 미수금/회수기간 관리표", "A1:R200");

  const today = new Date();
  const invoices: import("./types").ArInvoice[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 9) continue;
    if ((row[4] || "").trim() !== "Actual") continue;

    const client = (row[6] || "").trim();
    const amount = parseNumber(row[8] || "0");
    if (!client || amount === 0) continue;

    const invoiceDate = (row[10] || "").trim();
    const paymentDateRaw = (row[11] || "").trim();
    const collectionDays = parseNumber(row[12] || "0");
    const note = (row[16] || "").trim();

    const hasPaid = paymentDateRaw.length > 0;
    let status: "paid" | "unpaid" | "checking" | "scheduled" = hasPaid ? "paid" : "unpaid";
    if (!hasPaid && note === "확인필요") status = "checking";
    if (!hasPaid && (note.includes("예정") || note.includes("입금요청"))) status = "scheduled";

    let agingDays = 0;
    if (!hasPaid && invoiceDate) {
      const d = parseDate(invoiceDate);
      if (d) agingDays = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
    }

    const risk = hasPaid
      ? ("green" as const)
      : agingDays <= 30
        ? ("yellow" as const)
        : agingDays <= 60
          ? ("orange" as const)
          : ("red" as const);

    invoices.push({
      month: (row[5] || "").trim(),
      client,
      amount,
      description: (row[9] || "").trim(),
      invoiceDate,
      paymentDate: hasPaid ? paymentDateRaw : null,
      collectionDays: hasPaid ? collectionDays : 0,
      status,
      note,
      agingDays,
      risk,
    });
  }

  return buildArResult(invoices);
}

function buildArResult(invoices: import("./types").ArInvoice[]) {
  const outstanding = invoices.filter((inv) => inv.status !== "paid");
  const paid = invoices.filter((inv) => inv.status === "paid");

  const totalOutstanding = outstanding.reduce((s, inv) => s + inv.amount, 0);
  const outstandingCount = outstanding.length;
  const maxAgingDays = outstanding.length > 0 ? Math.max(...outstanding.map((inv) => inv.agingDays)) : 0;

  const paidWithDays = paid.filter((inv) => inv.collectionDays > 0);
  const avgCollectionDays =
    paidWithDays.length > 0
      ? Math.round(paidWithDays.reduce((s, inv) => s + inv.collectionDays, 0) / paidWithDays.length)
      : 0;

  const bucketDefs = [
    { label: "0-30일", min: 0, max: 30, color: "#00E87A" },
    { label: "31-60일", min: 31, max: 60, color: "#F59E0B" },
    { label: "61-90일", min: 61, max: 90, color: "#F97316" },
    { label: "90일+", min: 91, max: Infinity, color: "#EF4444" },
  ];
  const agingBuckets = bucketDefs.map((b) => {
    const items = outstanding.filter((inv) => inv.agingDays >= b.min && inv.agingDays <= b.max);
    return {
      label: b.label,
      count: items.length,
      amount: items.reduce((s, inv) => s + inv.amount, 0),
      color: b.color,
    };
  });

  const clientMap = new Map<string, { total: number; count: number; maxDays: number }>();
  for (const inv of outstanding) {
    const cur = clientMap.get(inv.client) || { total: 0, count: 0, maxDays: 0 };
    cur.total += inv.amount;
    cur.count += 1;
    cur.maxDays = Math.max(cur.maxDays, inv.agingDays);
    clientMap.set(inv.client, cur);
  }
  const clientSummaries: import("./types").ArClientSummary[] = Array.from(clientMap.entries())
    .map(([client, data]) => ({
      client,
      totalOutstanding: data.total,
      invoiceCount: data.count,
      oldestDays: data.maxDays,
      risk: (data.maxDays <= 30 ? "yellow" : data.maxDays <= 60 ? "orange" : "red") as "yellow" | "orange" | "red",
    }))
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  return {
    invoices,
    agingBuckets,
    clientSummaries,
    totalOutstanding,
    outstandingCount,
    avgCollectionDays,
    maxAgingDays,
  };
}

// ─── YoY 비교 ─────────────────────────────────

export async function fetchYoY(): Promise<{ rows: import("./types").YoYRow[]; _meta: FetchMeta }> {
  const sync = await readSyncTab("YoY");
  if (sync) return { rows: yoyFromSync(sync), _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
  return { rows: await yoyFromOriginal(), _meta: { _source: "original", _fetchedAt: new Date().toISOString() } };
}

function yoyFromSync(sync: SyncTab): import("./types").YoYRow[] {
  // headers: [year, 1월, ..., 12월, total, headcount, perPerson, target]
  return sync.data.map((row) => ({
    year: String(row[0] || ""),
    monthly: Array.from({ length: 12 }, (_, m) => toNum(row[m + 1])),
    total: toNum(row[13]),
    headcount: toNum(row[14]),
    perPerson: toNum(row[15]),
    target: row[16] ? toNum(row[16]) : undefined,
  }));
}

async function yoyFromOriginal(): Promise<import("./types").YoYRow[]> {
  const rows = await readSheet("매출비교", "A1:R15");
  const result: import("./types").YoYRow[] = [];
  for (const row of rows) {
    const label = (row[1] || "").trim();
    if (!label.includes("매출액")) continue;
    const year = label.replace("년도 매출액", "").trim();
    const monthly: number[] = [];
    for (let c = 2; c <= 13; c++) monthly.push(parseNumber(row[c] || "0"));
    const total = parseNumber(row[14] || "0");
    const headcount = parseNumber(row[15] || "0");
    const perPerson = parseNumber(row[16] || "0");
    const target = row[17] ? parseNumber(row[17]) : undefined;
    result.push({ year, monthly, total, headcount, perPerson, target });
  }
  return result;
}

// ─── 클라이언트별 매출 (A/R 데이터 활용) ──────

export async function fetchClientRevenue(): Promise<{
  invoices: import("./types").ArInvoice[];
  months: string[];
}> {
  const { invoices } = await fetchAR();
  const monthSet = new Set<string>();
  for (const inv of invoices) {
    if (inv.month) monthSet.add(inv.month);
  }
  const months = Array.from(monthSet).sort((a, b) => parseInt(a) - parseInt(b));
  return { invoices, months };
}

function parseDate(str: string): Date | null {
  const cleaned = str.replace(/\.\s*/g, "-").replace(/-$/, "").trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Withtax (세무법인 공식 데이터) ───────────────

export async function fetchWithtaxData(year: number = 2025): Promise<{
  monthly: import("./withtax-data").WithtaxMonthly[];
  yearly: import("./withtax-data").WithtaxYearly[];
  expenses: import("./withtax-data").ExpenseItem[];
  lastUpdated: string;
  _meta: FetchMeta;
} | null> {
  const sync = await readSyncTab("Withtax");
  if (!sync) return null;

  // METADATA 행에서 lastUpdated 추출
  const metaRow = sync.data.find((r) => String(r[0]) === "METADATA");
  const lastUpdated = metaRow ? String(metaRow[2] || "") : "";

  // _SYNC_Withtax 탭 구조:
  // headers: [type, year, item, v1, v2, ..., v12]
  // MONTHLY: v1-v12 = 1월~12월 값
  // YEARLY:  v1 = 연간 합계 값
  // EXPENSE: v1 = 금액, v2 = 비율(%)

  const MONTHLY_METRICS: (keyof import("./withtax-data").WithtaxMonthly)[] = [
    "서비스매출", "컨텐츠수입", "도서매출", "플랫폼매출",
    "수탁수익", "미국법인매출", "매출합계", "판관비합계",
    "영업외수익", "영업외비용", "당기순이익",
  ];

  // 월별 데이터 (요청 연도)
  const monthlyRows = sync.data.filter(
    (r) => String(r[0]) === "MONTHLY" && String(r[1]) === String(year),
  );
  const monthly: import("./withtax-data").WithtaxMonthly[] = Array.from({ length: 12 }, (_, m) => {
    const entry: Record<string, number | string> = { month: `${m + 1}월` };
    for (const key of MONTHLY_METRICS) {
      const row = monthlyRows.find((r) => String(r[2]) === key);
      entry[key] = row ? toNum(row[m + 3]) : 0;
    }
    return entry as unknown as import("./withtax-data").WithtaxMonthly;
  });

  // 연도별 요약 (전체 연도)
  const yearlyRows = sync.data.filter((r) => String(r[0]) === "YEARLY");
  const yearMap = new Map<string, Record<string, number>>();
  for (const row of yearlyRows) {
    const y = String(row[1]);
    const item = String(row[2]);
    const val = toNum(row[3]);
    if (!yearMap.has(y)) yearMap.set(y, {});
    yearMap.get(y)![item] = val;
  }
  const yearly: import("./withtax-data").WithtaxYearly[] = Array.from(yearMap.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([y, vals]) => ({
      year: y,
      매출합계: vals["매출합계"] ?? 0,
      판관비합계: vals["판관비합계"] ?? 0,
      당기순이익: vals["당기순이익"] ?? 0,
      매출항목: Object.fromEntries(
        Object.entries(vals).filter(([k]) => !["매출합계", "판관비합계", "당기순이익"].includes(k)),
      ),
    }));

  // 판관비 세부항목 (요청 연도)
  const expenseRows = sync.data.filter(
    (r) => String(r[0]) === "EXPENSE" && String(r[1]) === String(year),
  );
  const expenses: import("./withtax-data").ExpenseItem[] = expenseRows
    .map((r) => ({
      name: String(r[2]),
      amount: toNum(r[3]),
      ratio: r[4] ? toNum(r[4]) : 0,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, yearly, expenses, lastUpdated, _meta: { _source: "sync", _fetchedAt: new Date().toISOString() } };
}

// ─── FX ───────────────────────────────────────

export async function fetchFx(): Promise<FxRate[]> {
  // FX: Cash sync 탭에서 환율 읽기 시도, 없으면 원본
  const sync = await readSyncTab("Cash");
  const rates: FxRate[] = [
    { pair: "USD/KRW", rate: 0, change: 0, date: new Date().toISOString().slice(0, 10) },
    { pair: "USD/VND", rate: 0, change: 0, date: new Date().toISOString().slice(0, 10) },
  ];

  if (sync) {
    const fxUsdRow = sync.data.find(
      (r) => String(r[0]) === "FX" && String(r[1]) === "USD/KRW",
    );
    const fxVndRow = sync.data.find(
      (r) => String(r[0]) === "FX" && String(r[1]) === "USD/VND",
    );
    // 최신 월의 값 사용
    const months = sync.headers.slice(3);
    const lastIdx = months.length - 1 + 3;
    if (fxUsdRow) {
      const val = toNum(fxUsdRow[lastIdx]) || toNum(fxUsdRow[3]);
      if (val > 1000) rates[0].rate = val;
    }
    if (fxVndRow) {
      const val = toNum(fxVndRow[lastIdx]) || toNum(fxVndRow[3]);
      if (val > 20000) rates[1].rate = val;
    }
    if (rates[0].rate > 0 || rates[1].rate > 0) return rates;
  }

  // 원본 폴백
  const rows = await readSheet("2026 Cash Position Summary", "A1:Z5");
  for (const row of rows) {
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString() || "";
      if (cell.includes("KRW") || cell.includes("원")) {
        const val = parseNumber(row[j + 1] || "0");
        if (val > 1000) rates[0].rate = val;
      }
      if (cell.includes("VND")) {
        const val = parseNumber(row[j + 1] || "0");
        if (val > 20000) rates[1].rate = val;
      }
    }
  }

  return rates;
}
