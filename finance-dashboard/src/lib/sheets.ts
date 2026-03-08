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

// --- Revenue ---
// 시트 구조:
// Row 2: ["","","","1월","2월","3월","4월","5월"]   ← 월 헤더 (col D~)
// Row 3: ["","KR 한국","KR콘텐츠","0","12,000,000",...]   ← 세그먼트별 데이터
// Row 8: ["","","소계","1,611,557","13,146,838",...]       ← 사업부 소계
// Row 33: ["","","합계","328,878,450","103,297,941",...]    ← 전체 합계
export async function fetchRevenue(): Promise<{
  monthly: RevenueMonthly[];
  months: string[];
  segments: RevenueSegment[];
  segmentDetails: RevenueSegmentDetail[];
  totalActual: number;
  totalTarget: number;
}> {
  const rows = await readSheet("2026 매출", "A1:T45");

  // 월 헤더 찾기 (첫 번째 "1월"이 있는 행)
  const months: string[] = [];
  const monthStartCol = 3; // col D (index 3)

  for (const row of rows) {
    if (row[monthStartCol] === "1월") {
      for (let c = monthStartCol; c < row.length; c++) {
        const label = (row[c] || "").trim();
        // "1월"~"12월" 형태만 수집, "합계"/"목표" 등 비월 컬럼 제외
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

  // 사업부 블록 파싱: 사업부명 행 → 세부 항목들 → 소계 → 인원수 → 인당매출
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

    // 사업부명 행: col[1]에 이름이 있고 col[2]에 세부항목명이 있는 행
    if (col1 && col2 && col2 !== "소계" && col2 !== "인원수" && col2 !== "인당 매출" && col2 !== "합계") {
      currentSegment = col1;
      currentItems = [];
      // 이 행 자체도 세부 항목
      const vals = parseRow(row);
      const total = vals.reduce((s, v) => s + v, 0);
      currentItems.push({ name: col2, monthly: vals, total });
      continue;
    }

    // 세부 항목 행: col[1] 비어있고 col[2]에 항목명
    if (!col1 && col2 && col2 !== "소계" && col2 !== "인원수" && col2 !== "인당 매출" && col2 !== "합계" && currentSegment) {
      const vals = parseRow(row);
      const total = vals.reduce((s, v) => s + v, 0);
      currentItems.push({ name: col2, monthly: vals, total });
      continue;
    }

    // 소계 행
    if (col2 === "소계" && currentSegment) {
      const subtotal = parseRow(row);
      const segTotal = subtotal.reduce((s, v) => s + v, 0);
      segmentMap.set(currentSegment, segTotal);

      // 인원수, 인당 매출은 다음 행들
      const headcountRow = rows[i + 1];
      const perPersonRow = rows[i + 2];
      const headcount = headcountRow && (headcountRow[2] || "").trim() === "인원수"
        ? parseRow(headcountRow)
        : new Array(monthCount).fill(0);
      const perPerson = perPersonRow && (perPersonRow[2] || "").trim() === "인당 매출"
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

    // 합계 행
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

  return { monthly, months, segments, segmentDetails, totalActual, totalTarget: 0 };
}

// --- Cash Position ---
// 시트 구조 ("2026 Cash Position Summary"):
// Row 0: ["","","","2026.01","2026.02"]           ← 월 헤더
// Row 1-4: Korea (KRW) — Balance, Inflows, Outflows, Net Change
// Row 5-8: U.S. (KRW) — same
// Row 9-12: Vietnam (KRW) — same
// Row 13-16: Total (KR + US + VN) — same
// Row 18-22: U.S. (USD) detail + exchange rate
// Row 33-37: Vietnam (VND) detail + exchange rate
export async function fetchCashPosition(): Promise<{
  months: string[];
  monthlyData: import("./types").CashMonthly[];
  exchangeRates: { usdKrw: number; usdVnd: number };
  burnRate: number;
  runway: number;
}> {
  const rows = await readSheet("2026 Cash Position Summary", "A1:Z45");

  // 월 헤더 (Row 0)
  const monthHeaders = rows[0] || [];
  const months: string[] = [];
  for (let c = 3; c < monthHeaders.length; c++) {
    const label = (monthHeaders[c] || "").trim();
    if (label) months.push(label);
  }

  // KRW 섹션 파싱 (Row 0-16)
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

  // USD/VND 원본 — detail 섹션
  let usUsdRow = -1;
  let vnVndRow = -1;
  for (let i = 17; i < rows.length; i++) {
    const col0 = (rows[i]?.[0] || "").trim();
    const col1 = (rows[i]?.[1] || "").trim();
    const col2 = (rows[i]?.[2] || "").trim();
    if (col1.includes("U.S.") && col1.includes("USD") && col2 === "Balance") usUsdRow = i;
    if (col1.includes("Vietnam") && col1.includes("VND") && col2 === "Balance") vnVndRow = i;
  }

  // 환율
  let usdKrw = 1460;
  let usdVnd = 0;
  for (let i = 17; i < rows.length; i++) {
    if ((rows[i]?.[2] || "").trim() === "exchange rate") {
      const col1 = (rows[i]?.[1] || "").trim();
      const latestCol = months.length > 0 ? months.length + 2 : 3;
      const val = parseNumber(rows[i]?.[latestCol] || rows[i]?.[3] || "0");
      if (col1 === "" && i < 30 && val > 0) usdKrw = val; // USD section
      if (i > 30 && val > 0) usdVnd = val; // VND section
    }
  }

  // 월별 데이터 조립
  const monthlyData: import("./types").CashMonthly[] = [];
  for (let m = 0; m < months.length; m++) {
    const c = m + 3;
    const getVal = (rowIdx: number, offset: number) => parseNumber(rows[rowIdx + offset]?.[c] || "0");

    const regionKR: import("./types").CashRegionData = {
      region: "KR", regionLabel: "한국",
      balanceKrw: krRow >= 0 ? getVal(krRow, 0) : 0,
      inflowsKrw: krRow >= 0 ? getVal(krRow, 1) : 0,
      outflowsKrw: krRow >= 0 ? getVal(krRow, 2) : 0,
      netChangeKrw: krRow >= 0 ? getVal(krRow, 3) : 0,
      balanceLocal: krRow >= 0 ? getVal(krRow, 0) : 0,
      localCurrency: "KRW",
    };
    const regionUS: import("./types").CashRegionData = {
      region: "US", regionLabel: "미국",
      balanceKrw: usKrwRow >= 0 ? getVal(usKrwRow, 0) : 0,
      inflowsKrw: usKrwRow >= 0 ? getVal(usKrwRow, 1) : 0,
      outflowsKrw: usKrwRow >= 0 ? getVal(usKrwRow, 2) : 0,
      netChangeKrw: usKrwRow >= 0 ? getVal(usKrwRow, 3) : 0,
      balanceLocal: usUsdRow >= 0 ? parseNumber(rows[usUsdRow]?.[c] || "0") : 0,
      localCurrency: "USD",
    };
    const regionVN: import("./types").CashRegionData = {
      region: "VN", regionLabel: "베트남",
      balanceKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 0) : 0,
      inflowsKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 1) : 0,
      outflowsKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 2) : 0,
      netChangeKrw: vnKrwRow >= 0 ? getVal(vnKrwRow, 3) : 0,
      balanceLocal: vnVndRow >= 0 ? parseNumber(rows[vnVndRow]?.[c] || "0") : 0,
      localCurrency: "VND",
    };

    const totalBalance = totalRow >= 0 ? getVal(totalRow, 0) : regionKR.balanceKrw + regionUS.balanceKrw + regionVN.balanceKrw;
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

  // Burn Rate = 평균 월간 지출 (최근 데이터 있는 월 기준)
  const monthsWithOutflows = monthlyData.filter((m) => m.totalOutflowsKrw > 0);
  const burnRate = monthsWithOutflows.length > 0
    ? monthsWithOutflows.reduce((s, m) => s + m.totalOutflowsKrw, 0) / monthsWithOutflows.length
    : 0;

  // Runway = 최신 잔고 / 월평균 지출
  const latestBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].totalBalanceKrw : 0;
  const runway = burnRate > 0 ? latestBalance / burnRate : 0;

  return { months, monthlyData, exchangeRates: { usdKrw, usdVnd }, burnRate, runway };
}

// --- Income Statement ---
// 시트 구조 ("2026년"):
// Row 3: ["","","","","","","","","26. 01.","26. 02.", ... "26. 12."]  ← 월 헤더 (col I~T = index 8~19)
// Row 35: ["Income Statement"]
// Row 36: ["","","","Revenue","","","","","0","0",...]    ← Revenue 합계
// Row 43: ["","","","Expenses","","","","","0","0",...]   ← Expenses 합계
// Row 44: ["","","","직원 급여 및 복지","","","","","0",...]  ← 비용 카테고리
// Row 48: ["","","","사무실 유지관리","","","","","0",...]
// Row 59: ["","","","4대보험","","","","","0",...]
export async function fetchIncome(): Promise<{
  monthly: IncomeMonthly[];
  expenses: ExpenseCategory[];
  totalRevenue: number;
  totalExpense: number;
}> {
  const rows = await readSheet("2026년", "A1:V70");

  // 월 헤더 (Row 3, col I~ = index 8~)
  const monthStartCol = 8;
  const monthLabels: string[] = [];
  const headerRow = rows[3] || [];
  for (let c = monthStartCol; c < Math.min(headerRow.length, monthStartCol + 12); c++) {
    const label = (headerRow[c] || "").trim();
    if (label) monthLabels.push(label);
  }

  // Revenue와 Expenses 행 찾기
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

    // 비용 카테고리 수집 (Expenses 다음의 col[3]에 이름이 있는 행들)
    if (inExpenseSection && col3) {
      // 하위 소분류(col[4])가 아닌, 카테고리 합계(col[3])만 수집
      const values: number[] = [];
      for (let c = monthStartCol; c < monthStartCol + monthLabels.length; c++) {
        values.push(parseNumber(row[c] || "0"));
      }
      const total = values.reduce((s, v) => s + v, 0);
      if (total !== 0) {
        expenseCategories.push({ name: col3, values });
      }
    }

    // Net Income 등 나오면 비용 섹션 종료
    if (inExpenseSection && (col3 === "Net Income" || col3 === "EBITDA" || col3.startsWith("Net"))) {
      inExpenseSection = false;
    }
  }

  // 월별 수익 vs 비용
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

  // 비용 카테고리 합산
  const expenses: ExpenseCategory[] = expenseCategories
    .map((cat) => ({
      category: cat.name,
      amount: Math.abs(cat.values.reduce((s, v) => s + v, 0)),
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, expenses, totalRevenue, totalExpense };
}

// --- AR (미수금) ---
// 시트 구조 ("거래처별 미수금/회수기간 관리표"):
// Row 3: 헤더 — 홈택스, 작성일자, 상호, 공급가액, 품목명, 작성일자, 실제 정산일자, 회수일수, 발급일자, 회수일수, 입금여부, 평균 회수일수
// Row 4~: ["","","","","Actual","1월","거래처명","","금액","품목명","작성일","정산일","회수일수","발급일","회수일수","","메모"]
export async function fetchAR(): Promise<{
  invoices: import("./types").ArInvoice[];
  agingBuckets: import("./types").ArAgingBucket[];
  clientSummaries: import("./types").ArClientSummary[];
  totalOutstanding: number;
  outstandingCount: number;
  avgCollectionDays: number;
  maxAgingDays: number;
}> {
  const rows = await readSheet("거래처별 미수금/회수기간 관리표", "A1:R200");

  const today = new Date();
  const invoices: import("./types").ArInvoice[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 9) continue;
    if ((row[4] || "").trim() !== "Actual") continue;

    const month = (row[5] || "").trim();
    const client = (row[6] || "").trim();
    const amount = parseNumber(row[8] || "0");
    const description = (row[9] || "").trim();
    const invoiceDate = (row[10] || "").trim();
    const paymentDateRaw = (row[11] || "").trim();
    const collectionDays = parseNumber(row[12] || "0");
    const note = (row[16] || "").trim();

    if (!client || amount === 0) continue;

    const hasPaid = paymentDateRaw.length > 0;
    let status: "paid" | "unpaid" | "checking" | "scheduled" = hasPaid ? "paid" : "unpaid";
    if (!hasPaid && note === "확인필요") status = "checking";
    if (!hasPaid && (note.includes("예정") || note.includes("입금요청"))) status = "scheduled";

    // Aging 계산: 미수금이면 발급일~오늘, 정산완료면 0
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
      month,
      client,
      amount,
      description,
      invoiceDate,
      paymentDate: hasPaid ? paymentDateRaw : null,
      collectionDays: hasPaid ? collectionDays : 0,
      status,
      note,
      agingDays,
      risk,
    });
  }

  // 미수금만
  const outstanding = invoices.filter((inv) => inv.status !== "paid");
  const paid = invoices.filter((inv) => inv.status === "paid");

  const totalOutstanding = outstanding.reduce((s, inv) => s + inv.amount, 0);
  const outstandingCount = outstanding.length;
  const maxAgingDays = outstanding.length > 0 ? Math.max(...outstanding.map((inv) => inv.agingDays)) : 0;

  // 평균 회수일수 (정산완료 건 기준)
  const paidWithDays = paid.filter((inv) => inv.collectionDays > 0);
  const avgCollectionDays =
    paidWithDays.length > 0
      ? Math.round(paidWithDays.reduce((s, inv) => s + inv.collectionDays, 0) / paidWithDays.length)
      : 0;

  // Aging buckets
  const bucketDefs = [
    { label: "0-30일", min: 0, max: 30, color: "#E8FF47" },
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

  // Client summary (미수금만)
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

  return { invoices, agingBuckets, clientSummaries, totalOutstanding, outstandingCount, avgCollectionDays, maxAgingDays };
}

// --- YoY 비교 ---
export async function fetchYoY(): Promise<import("./types").YoYRow[]> {
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

// --- 클라이언트별 매출 (A/R 데이터 활용) ---
export async function fetchClientRevenue(): Promise<import("./types").ClientRevenue[]> {
  const { invoices } = await fetchAR();
  const map = new Map<string, import("./types").ClientRevenue>();
  for (const inv of invoices) {
    const cur = map.get(inv.client) || { client: inv.client, totalAmount: 0, invoiceCount: 0, paidAmount: 0, unpaidAmount: 0, paidCount: 0, unpaidCount: 0, avgCollectionDays: 0 };
    cur.totalAmount += inv.amount;
    cur.invoiceCount += 1;
    if (inv.status === "paid") { cur.paidAmount += inv.amount; cur.paidCount += 1; cur.avgCollectionDays += inv.collectionDays; }
    else { cur.unpaidAmount += inv.amount; cur.unpaidCount += 1; }
    map.set(inv.client, cur);
  }
  return Array.from(map.values())
    .map((c) => ({ ...c, avgCollectionDays: c.paidCount > 0 ? Math.round(c.avgCollectionDays / c.paidCount) : 0 }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

function parseDate(str: string): Date | null {
  // "2025-01-05" or "2025. 1. 17" formats
  const cleaned = str.replace(/\.\s*/g, "-").replace(/-$/, "").trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// --- FX ---
export async function fetchFx(): Promise<FxRate[]> {
  // FX data might come from the cash position sheet or a dedicated sheet
  // For now, we'll return current rates from the cash position data
  const rows = await readSheet("2026 Cash Position Summary", "A1:Z5");

  // Look for FX rates in the header area
  const rates: FxRate[] = [
    { pair: "USD/KRW", rate: 0, change: 0, date: new Date().toISOString().slice(0, 10) },
    { pair: "USD/VND", rate: 0, change: 0, date: new Date().toISOString().slice(0, 10) },
  ];

  // Try to find rate values in the sheet
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
