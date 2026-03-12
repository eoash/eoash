import { NextRequest, NextResponse } from "next/server";
import { fetchAnalytics } from "@/lib/data-source";
import { EMAIL_TO_NAME, EXCLUDED_EMAILS, DEFAULT_DAYS } from "@/lib/constants";
import { resolveActorName } from "@/lib/constants";
import { getDateRange } from "@/lib/utils";
import { queryRangeRaw, computeDailyIncrease, tsToDate } from "@/lib/prometheus";
import { aggregateMembers } from "@/lib/aggregators/leaderboard";
import fs from "fs";
import path from "path";

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

function fetchCodex(startDate: string, endDate: string) {
  const backfillDir = path.join(process.cwd(), "src/lib/backfill");
  const memberMap = new Map<string, number>();

  for (const file of fs.readdirSync(backfillDir).filter((f) => f.endsWith(".json"))) {
    const email = `${file.replace(".json", "")}@eoeoeo.net`;
    const raw = JSON.parse(fs.readFileSync(path.join(backfillDir, file), "utf-8"));
    let total = 0;
    for (const e of raw.data ?? []) {
      if (!e.model || (!e.model.startsWith("gpt-") && !e.model.toLowerCase().includes("codex"))) continue;
      if (startDate && e.date < startDate) continue;
      if (endDate && e.date > endDate) continue;
      total += (e.input_tokens ?? 0) + (e.output_tokens ?? 0) + (e.cache_read_tokens ?? 0) + (e.cache_creation_tokens ?? 0);
    }
    if (total > 0) {
      const name = EMAIL_TO_NAME[email] ?? email.split("@")[0];
      memberMap.set(name, (memberMap.get(name) ?? 0) + total);
    }
  }
  return memberMap;
}

async function fetchGemini(startDate: string, endDate: string) {
  const now = new Date();
  const endDay = endDate ? new Date(`${endDate}T23:59:59Z`) : now;
  const end = (endDay > now ? now : endDay).toISOString();
  const startDay = startDate
    ? new Date(`${startDate}T00:00:00Z`)
    : new Date(now.getTime() - 365 * 86400000);
  const daysDiff = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / 86400000));
  const rollingStart = new Date(now.getTime() - daysDiff * 86400 * 1000);
  const paddedStart = new Date(rollingStart.getTime() - 86400 * 1000);
  const start = paddedStart.toISOString();
  const actualStartDate = tsToDate(Math.floor(rollingStart.getTime() / 1000));

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
