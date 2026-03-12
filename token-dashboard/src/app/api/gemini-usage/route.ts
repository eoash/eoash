import { NextRequest, NextResponse } from "next/server";
import { EMAIL_TO_NAME } from "@/lib/constants";
import { queryRangeRaw, computeDailyIncrease, tsToDate } from "@/lib/prometheus";

// Gemini CLI OTel 메트릭: gemini_cli_token_usage_total
// labels: user_email, model, type (input/output/cache/thought/tool)

export interface GeminiMemberRow {
  name: string;
  email: string;
  input: number;
  output: number;
  cache: number;
  thought: number;
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    // Rolling window 계산 (fetchFromPrometheus와 동일 패턴)
    const now = new Date();
    const endDay = endDate ? new Date(`${endDate}T23:59:59Z`) : now;
    const end = (endDay > now ? now : endDay).toISOString();

    // 기본 365일 (start 미지정 시)
    const startDay = startDate
      ? new Date(`${startDate}T00:00:00Z`)
      : new Date(now.getTime() - 365 * 86400000);
    const daysDiff = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / 86400000));
    const rollingStart = new Date(now.getTime() - daysDiff * 86400 * 1000);
    // 1일 패딩: 첫 데이터포인트의 baseline 확보 (delta 계산용)
    const paddedStart = new Date(rollingStart.getTime() - 86400 * 1000);
    const start = paddedStart.toISOString();
    const actualStartDate = tsToDate(Math.floor(rollingStart.getTime() / 1000));

    // Raw counter query (increase() 사용 금지 — Collector 리셋 시 과다집계)
    const query = "sum by (user_email, type) (gemini_cli_token_usage_total)";
    const rawSeries = await queryRangeRaw(query, start, end);
    const dailySeries = computeDailyIncrease(rawSeries, actualStartDate);

    // user_email별로 type 합산
    const userMap = new Map<string, { input: number; output: number; cache: number; thought: number }>();

    for (const s of dailySeries) {
      const email = s.metric.user_email || "unknown";
      const type = s.metric.type || "unknown";

      if (!userMap.has(email)) {
        userMap.set(email, { input: 0, output: 0, cache: 0, thought: 0 });
      }
      const entry = userMap.get(email)!;

      // 일별 증가량 합산
      const total = s.values.reduce((sum, [, val]) => sum + Math.round(parseFloat(val) || 0), 0);

      if (type === "input") entry.input += total;
      else if (type === "output") entry.output += total;
      else if (type === "cache") entry.cache += total;
      else if (type === "thought") entry.thought += total;
      // tool 등 다른 type은 total에만 포함
    }

    // 응답 데이터 구성
    const data: GeminiMemberRow[] = [];
    for (const [email, tokens] of userMap.entries()) {
      const name = EMAIL_TO_NAME[email] ?? email.split("@")[0];
      const total = tokens.input + tokens.output + tokens.cache + tokens.thought;
      if (total === 0) continue; // 토큰 0인 유저 제외

      data.push({ name, email, ...tokens, total });
    }

    // total 기준 내림차순 정렬
    data.sort((a, b) => b.total - a.total);

    return NextResponse.json({ data });
  } catch (error) {
    console.warn("gemini-usage API error:", error);
    return NextResponse.json({ data: [] });
  }
}
