import { google } from "googleapis";
import type {
  RevenueMonthly,
  RevenueSegment,
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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${range}`,
  });
  return (res.data.values as string[][]) ?? [];
}

// --- Revenue ---
// 시트 구조:
// Row 2: ["","","","1월","2월","3월","4월","5월"]   ← 월 헤더 (col D~)
// Row 3: ["","KR 한국","KR콘텐츠","0","12,000,000",...]   ← 세그먼트별 데이터
// Row 8: ["","","소계","1,611,557","13,146,838",...]       ← 사업부 소계
// Row 33: ["","","합계","328,878,450","103,297,941",...]    ← 전체 합계
export async function fetchRevenue(): Promise<{
  monthly: RevenueMonthly[];
  segments: RevenueSegment[];
  totalActual: number;
  totalTarget: number;
}> {
  const rows = await readSheet("2026 매출", "A1:T45");

  // 월 헤더 찾기 (첫 번째 "1월"이 있는 행)
  const months: string[] = [];
  let monthStartCol = 3; // col D (index 3)

  for (const row of rows) {
    if (row[monthStartCol] === "1월") {
      for (let c = monthStartCol; c < row.length; c++) {
        if (row[c]) months.push(row[c]);
      }
      break;
    }
  }

  // 사업부별 소계 행 수집 (세그먼트)
  const segmentMap = new Map<string, number>();
  const segmentMonthly = new Map<string, number[]>();

  // 합계 행에서 월별 합계 추출
  const monthly: RevenueMonthly[] = [];
  let totalActual = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const col2 = (row[2] || "").trim();
    const col1 = (row[1] || "").trim();

    // 사업부 소계 행: col[2] === "소계"
    if (col2 === "소계") {
      // 사업부 이름은 해당 블록의 col[1]에 있음
      // 이전 행들을 거슬러 올라가 사업부명 찾기
      let segmentName = "";
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j]?.[1]?.trim()) {
          segmentName = rows[j][1].trim();
          break;
        }
      }
      if (!segmentName) segmentName = `사업부 ${segmentMap.size + 1}`;

      const monthlyValues: number[] = [];
      let segTotal = 0;
      for (let c = monthStartCol; c < monthStartCol + months.length; c++) {
        const val = parseNumber(row[c] || "0");
        monthlyValues.push(val);
        segTotal += val;
      }
      segmentMap.set(segmentName, segTotal);
      segmentMonthly.set(segmentName, monthlyValues);
    }

    // 합계 행: col[2] === "합계"
    if (col2 === "합계") {
      for (let c = monthStartCol; c < monthStartCol + months.length; c++) {
        const val = parseNumber(row[c] || "0");
        monthly.push({
          month: months[c - monthStartCol] || `${c - monthStartCol + 1}월`,
          actual: val,
          target: 0, // 목표 데이터는 별도 시트에 있을 수 있음
        });
        totalActual += val;
      }
    }
  }

  const segments = Array.from(segmentMap.entries())
    .map(([segment, amount]) => ({ segment, amount }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { monthly, segments, totalActual, totalTarget: 0 };
}

// --- Cash Position ---
// 시트 구조:
// Row 0: ["","","","2026.01","2026.02"]           ← 월 헤더
// Row 1: ["","Korea (KRW)","Balance","₩141,753,433","₩94,596,329"]
// Row 5: ["","U.S. (KRW)","Balance","₩196,819,914","₩103,075,752"]
// Row 9: ["","Vietnam (KRW)","Balance","₩24,821,438","₩11,712,299"]
// Row 13: ["","Total (KR + US + VN)","Balance","₩363,394,785","₩209,384,380"]
export async function fetchCashPosition(): Promise<{
  regions: CashRegionSummary[];
  totalUsd: number;
}> {
  const rows = await readSheet("2026 Cash Position Summary", "A1:Z15");

  // 월 헤더 (Row 0)
  const monthHeaders = rows[0] || [];
  // 가장 마지막 월의 데이터를 사용 (최신)
  let latestMonthCol = 3; // col D (기본)
  for (let c = monthHeaders.length - 1; c >= 3; c--) {
    if (monthHeaders[c]?.trim()) {
      latestMonthCol = c;
      break;
    }
  }

  const regionConfigs = [
    { searchKey: "Korea", region: "KR", regionLabel: "한국", currency: "KRW" },
    { searchKey: "U.S.", region: "US", regionLabel: "미국", currency: "KRW" },
    { searchKey: "Vietnam", region: "VN", regionLabel: "베트남", currency: "KRW" },
  ];

  const regions: CashRegionSummary[] = [];

  for (const config of regionConfigs) {
    // Balance 행 찾기
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const col1 = (row?.[1] || "").trim();
      const col2 = (row?.[2] || "").trim();

      if (col1.includes(config.searchKey) && col2 === "Balance") {
        const balance = parseNumber(row[latestMonthCol] || "0");

        // Cash Inflows, Outflows, Net Change는 다음 행들
        const inflows = parseNumber(rows[i + 1]?.[latestMonthCol] || "0");
        const outflows = parseNumber(rows[i + 2]?.[latestMonthCol] || "0");

        regions.push({
          region: config.region,
          regionLabel: config.regionLabel,
          banks: [
            {
              bank: `${config.regionLabel} 합산`,
              currency: config.currency,
              balance,
              balanceUsd: balance, // 이미 KRW 환산 데이터
            },
          ],
          totalUsd: balance,
        });
        break;
      }
    }
  }

  // Total 행
  let totalUsd = 0;
  for (const row of rows) {
    if ((row?.[1] || "").includes("Total")) {
      const col2 = (row?.[2] || "").trim();
      if (col2 === "Balance") {
        totalUsd = parseNumber(row[latestMonthCol] || "0");
        break;
      }
    }
  }
  if (totalUsd === 0) {
    totalUsd = regions.reduce((sum, r) => sum + r.totalUsd, 0);
  }

  return { regions, totalUsd };
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
