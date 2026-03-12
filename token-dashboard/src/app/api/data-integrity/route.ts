import { NextResponse } from "next/server";
import { fetchAnalytics, getDataSource } from "@/lib/data-source";
import { EXCLUDED_EMAILS } from "@/lib/constants";
import { getDateRange } from "@/lib/utils";
import type { ClaudeCodeDataPoint } from "@/lib/types";
import fs from "fs";
import path from "path";

/**
 * /api/data-integrity — 데이터 무결성 검증
 *
 * 스파이크 감지, 유실 감지, backfill↔Prometheus 경계 검증.
 * 배포 전/후에 호출하여 데이터 이상을 조기 발견.
 */

const SPIKE_THRESHOLD = 10; // 전일 대비 10x 이상이면 스파이크
const MIN_TOKENS_FOR_SPIKE = 100_000; // 10만 이하는 변동 무시

/** backfill JSON에서 (email, date) → 총 토큰 인덱스 생성 */
function buildBackfillIndex(): Map<string, number> {
  const dir = path.join(process.cwd(), "src/lib/backfill");
  if (!fs.existsSync(dir)) return new Map();

  const index = new Map<string, number>();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.data)) continue;
      for (const d of parsed.data) {
        const email = (d.actor?.email_address ?? d.actor?.id ?? "").toLowerCase();
        if (!email) continue;
        const key = `${email}|${d.date}`;
        const tokens = (d.input_tokens ?? 0) + (d.output_tokens ?? 0);
        index.set(key, (index.get(key) ?? 0) + tokens);
      }
    } catch {
      // skip malformed files
    }
  }
  return index;
}

interface IntegrityCheck {
  status: "pass" | "warn" | "fail";
  spikes: SpikeAlert[];
  drops: DropAlert[];
  summary: string;
  checkedUsers: number;
  checkedDays: number;
  timestamp: string;
}

interface SpikeAlert {
  user: string;
  date: string;
  tokens: number;
  prevDayTokens: number;
  ratio: number;
  verdict: "ok" | "check";
  verdictReason: string;
}

interface DropAlert {
  user: string;
  lastSeenDate: string;
  missingDays: number;
}

export async function GET() {
  if (getDataSource() === "mock") {
    return NextResponse.json({
      status: "pass",
      spikes: [],
      drops: [],
      summary: "mock mode — skipped",
      checkedUsers: 0,
      checkedDays: 0,
      timestamp: new Date().toISOString(),
    } satisfies IntegrityCheck);
  }

  try {
    // 최근 7일 데이터 조회
    const { start, end } = getDateRange(7);
    const raw = await fetchAnalytics({ start_date: start, end_date: end });
    const data = raw.data.filter(
      (d) => !EXCLUDED_EMAILS.has(d.actor.email_address ?? "")
    );

    // 유저별 일별 총 토큰 집계
    const userDayTokens = new Map<string, Map<string, number>>();
    for (const d of data) {
      const email = d.actor.email_address ?? d.actor.id ?? "";
      if (!userDayTokens.has(email)) userDayTokens.set(email, new Map());
      const dayMap = userDayTokens.get(email)!;
      const total = (d.input_tokens ?? 0) + (d.output_tokens ?? 0);
      dayMap.set(d.date, (dayMap.get(d.date) ?? 0) + total);
    }

    // 전체 날짜 목록 (정렬)
    const allDates = [...new Set(data.map((d) => d.date))].sort();

    const spikes: SpikeAlert[] = [];
    const drops: DropAlert[] = [];
    const bfIndex = buildBackfillIndex();

    for (const [email, dayMap] of userDayTokens) {
      const sortedDates = [...dayMap.keys()].sort();

      // 1. 스파이크 감지: 연속 두 날의 토큰 비교
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = dayMap.get(sortedDates[i - 1]) ?? 0;
        const curr = dayMap.get(sortedDates[i]) ?? 0;

        if (prev > 0 && curr > MIN_TOKENS_FOR_SPIKE) {
          const ratio = curr / prev;
          if (ratio >= SPIKE_THRESHOLD) {
            // 자동 판정: backfill이 해당 날짜를 커버하면 정상
            const bfKey = `${email.toLowerCase()}|${sortedDates[i]}`;
            const bfTokens = bfIndex.get(bfKey);
            let verdict: "ok" | "check" = "check";
            let verdictReason = "backfill 없음 — Prometheus 스파이크 대시보드 노출 가능";
            if (bfTokens !== undefined) {
              verdict = "ok";
              verdictReason = `backfill 커버 (${bfTokens.toLocaleString()} tokens) — 대시보드 정상`;
            }

            spikes.push({
              user: email,
              date: sortedDates[i],
              tokens: curr,
              prevDayTokens: prev,
              ratio: Math.round(ratio * 10) / 10,
              verdict,
              verdictReason,
            });
          }
        }
      }

      // 2. 유실 감지: 마지막 데이터 이후 2일 이상 공백 (활성 유저 기준)
      if (sortedDates.length >= 3) {
        const lastDate = sortedDates[sortedDates.length - 1];
        const today = allDates[allDates.length - 1];
        if (lastDate < today) {
          const lastIdx = allDates.indexOf(lastDate);
          const todayIdx = allDates.indexOf(today);
          const missingDays = todayIdx - lastIdx;
          if (missingDays >= 2) {
            drops.push({
              user: email,
              lastSeenDate: lastDate,
              missingDays,
            });
          }
        }
      }
    }

    const hasSpikes = spikes.length > 0;
    const hasDrops = drops.length > 0;
    const hasRealSpikes = spikes.some((s) => s.verdict === "check");
    const status = hasRealSpikes ? "fail" : hasSpikes ? "warn" : hasDrops ? "warn" : "pass";

    const parts: string[] = [];
    if (hasSpikes) parts.push(`${spikes.length} spike(s)`);
    if (hasDrops) parts.push(`${drops.length} drop(s)`);

    return NextResponse.json({
      status,
      spikes,
      drops,
      summary: parts.length > 0 ? parts.join(", ") : "all clean",
      checkedUsers: userDayTokens.size,
      checkedDays: allDates.length,
      timestamp: new Date().toISOString(),
    } satisfies IntegrityCheck);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "fail" as const,
        spikes: [],
        drops: [],
        summary: `error: ${message}`,
        checkedUsers: 0,
        checkedDays: 0,
        timestamp: new Date().toISOString(),
      } satisfies IntegrityCheck,
      { status: 500 }
    );
  }
}
