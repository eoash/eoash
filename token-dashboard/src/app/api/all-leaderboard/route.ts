import { NextRequest, NextResponse } from "next/server";
import { fetchAnalytics } from "@/lib/data-source";
import { EMAIL_TO_NAME, EXCLUDED_EMAILS, DEFAULT_DAYS } from "@/lib/constants";
import { getDateRange } from "@/lib/utils";
import { queryRangeRaw, computeDailyIncrease } from "@/lib/prometheus";
import { aggregateMembers } from "@/lib/aggregators/leaderboard";
import { readCodexBackfill } from "@/lib/codex-backfill";
import { computeGeminiRange } from "@/lib/gemini-range";

export interface AllMemberRow {
  name: string;
  claude: number;
  codex: number;
  gemini: number;
  total: number;
}

async function fetchClaude(startDate: string, endDate: string) {
  const raw = await fetchAnalytics({
    start_date: startDate,
    end_date: endDate,
    group_by: ["actor", "model", "date"],
  });
  const filtered = raw.data.filter(
    (d) => !EXCLUDED_EMAILS.has(d.actor.email_address ?? ""),
  );
  return aggregateMembers(filtered);
}

function fetchCodex(startDate: string, endDate: string): Map<string, number> {
  const memberMap = readCodexBackfill(startDate, endDate);
  const totals = new Map<string, number>();
  for (const [email, m] of memberMap) {
    const total = m.input + m.output + m.cached + m.reasoning;
    if (total > 0) {
      const name = EMAIL_TO_NAME[email] ?? email.split("@")[0];
      totals.set(name, (totals.get(name) ?? 0) + total);
    }
  }
  return totals;
}

async function fetchGemini(startDate: string, endDate: string) {
  const { start, end, actualStartDate } = computeGeminiRange(startDate, endDate);

  const query = "sum by (user_email, type) (gemini_cli_token_usage_total)";
  const rawSeries = await queryRangeRaw(query, start, end);
  const dailySeries = computeDailyIncrease(rawSeries, actualStartDate);

  const userMap = new Map<string, number>();
  for (const s of dailySeries) {
    const email = s.metric.user_email || "unknown";
    const total = s.values.reduce((sum, [, val]) => sum + Math.round(parseFloat(val) || 0), 0);
    const name = EMAIL_TO_NAME[email] ?? email.split("@")[0];
    userMap.set(name, (userMap.get(name) ?? 0) + total);
  }
  return userMap;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const days = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS));

    let startDate: string;
    let endDate: string;
    if (startParam && endParam) {
      startDate = startParam;
      endDate = endParam;
    } else {
      const range = getDateRange(days);
      startDate = range.start;
      endDate = range.end;
    }

    const [claudeRows, codexMap, geminiMap] = await Promise.all([
      fetchClaude(startDate, endDate),
      fetchCodex(startDate, endDate),
      fetchGemini(startDate, endDate),
    ]);

    const map = new Map<string, AllMemberRow>();
    for (const r of claudeRows) {
      const e = map.get(r.name) ?? { name: r.name, claude: 0, codex: 0, gemini: 0, total: 0 };
      e.claude += r.total;
      map.set(r.name, e);
    }
    for (const [name, total] of codexMap) {
      const e = map.get(name) ?? { name, claude: 0, codex: 0, gemini: 0, total: 0 };
      e.codex += total;
      map.set(name, e);
    }
    for (const [name, total] of geminiMap) {
      const e = map.get(name) ?? { name, claude: 0, codex: 0, gemini: 0, total: 0 };
      e.gemini += total;
      map.set(name, e);
    }

    const data = Array.from(map.values())
      .map((r) => ({ ...r, total: r.claude + r.codex + r.gemini }))
      .filter((r) => r.total > 0);
    data.sort((a, b) => b.total - a.total);

    return NextResponse.json({ data });
  } catch (error) {
    console.warn("all-leaderboard API error:", error);
    return NextResponse.json({ data: [] });
  }
}
