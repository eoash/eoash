import { NextResponse } from "next/server";
import { google } from "googleapis";

export const revalidate = 60; // 60초 ISR 캐싱 — Sheets API rate limit 보호

interface CheckResult {
  status: "ok" | "warn" | "fail";
  latencyMs: number;
  detail?: string;
}

function getSheets() {
  const authOptions: ConstructorParameters<typeof google.auth.GoogleAuth>[0] = {
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  };
  if (process.env.GOOGLE_SA_KEY_BASE64) {
    const decoded = Buffer.from(process.env.GOOGLE_SA_KEY_BASE64, "base64").toString();
    authOptions.credentials = JSON.parse(decoded);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    authOptions.credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return google.sheets({ version: "v4", auth: new google.auth.GoogleAuth(authOptions) });
}

async function checkSheets(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "'_SYNC_Revenue'!A1:B1",
    });
    const latencyMs = Date.now() - start;
    const rows = res.data.values ?? [];
    if (rows.length === 0) {
      return { status: "warn", latencyMs, detail: "Empty response from Sheets API" };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "fail", latencyMs: Date.now() - start, detail: String(err) };
  }
}

async function checkSyncTabs(): Promise<CheckResult> {
  const start = Date.now();
  const tabs = ["_SYNC_Revenue", "_SYNC_Cash", "_SYNC_AR", "_SYNC_YoY", "_SYNC_Income"];
  const issues: string[] = [];

  try {
    const sheets = getSheets();
    for (const tab of tabs) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID!,
          range: `'${tab}'!A1:B1`,
        });
        const rows = res.data.values ?? [];
        const statusCell = rows[0]?.[1] ?? "";
        if (statusCell !== "OK") {
          issues.push(`${tab}: status="${statusCell}" (expected "OK")`);
        }
      } catch {
        issues.push(`${tab}: not found or inaccessible`);
      }
    }
    const latencyMs = Date.now() - start;
    if (issues.length > 0) {
      return { status: "warn", latencyMs, detail: issues.join("; ") };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "fail", latencyMs: Date.now() - start, detail: String(err) };
  }
}

async function checkFxApi(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usd.json", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { status: "warn", latencyMs, detail: `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (!data.usd?.krw || data.usd.krw < 1000) {
      return { status: "warn", latencyMs, detail: `KRW rate=${data.usd?.krw} (suspicious)` };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "warn", latencyMs: Date.now() - start, detail: String(err) };
  }
}

async function checkRevenueData(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "'_SYNC_Revenue'!A1:Z50",
    });
    const latencyMs = Date.now() - start;
    const rows = res.data.values ?? [];

    // Check sync status
    if (rows.length < 3 || rows[0]?.[1] !== "OK") {
      return { status: "warn", latencyMs, detail: "Sync tab not ready" };
    }

    // Check that total row exists and has non-zero value
    const totalRow = rows.find((r) => r[0] === "전체" && r[1] === "합계");
    if (!totalRow) {
      return { status: "warn", latencyMs, detail: "Missing total row (전체/합계)" };
    }

    // Check first month has data
    const firstMonthVal = parseFloat(String(totalRow[2] || "0").replace(/[^0-9.-]/g, ""));
    if (firstMonthVal === 0) {
      return { status: "warn", latencyMs, detail: "First month revenue is 0" };
    }

    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "fail", latencyMs: Date.now() - start, detail: String(err) };
  }
}

export async function GET() {
  const [sheetsCheck, syncCheck, fxCheck, revenueCheck] = await Promise.all([
    checkSheets(),
    checkSyncTabs(),
    checkFxApi(),
    checkRevenueData(),
  ]);

  const checks = {
    sheets_api: sheetsCheck,
    sync_tabs: syncCheck,
    fx_api: fxCheck,
    revenue_data: revenueCheck,
  };

  const statuses = Object.values(checks).map((c) => c.status);
  const overallStatus = statuses.includes("fail") ? "fail" : statuses.includes("warn") ? "warn" : "ok";

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
}
