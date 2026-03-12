import { NextRequest, NextResponse } from "next/server";
import { EMAIL_TO_NAME } from "@/lib/constants";
import { queryRangeRaw, computeDailyIncrease, tsToDate } from "@/lib/prometheus";
import { computeGeminiRange } from "@/lib/gemini-range";

/**
 * Gemini analytics API — returns ClaudeCodeDataPoint[] shape
 * (same format as /api/analytics for unified data layer)
 *
 * Gemini OTel metrics: gemini_cli_token_usage_total
 * labels: user_email, model, type (input/output/cache/thought)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    const { start, end, actualStartDate } = computeGeminiRange(startDate, endDate);

    // Raw counter + daily delta (increase() 사용 금지)
    // user_email + model + type 별로 조회
    const query = "sum by (user_email, model, type) (gemini_cli_token_usage_total)";
    const rawSeries = await queryRangeRaw(query, start, end);
    const dailySeries = computeDailyIncrease(rawSeries, actualStartDate);

    // (email, model, date) → token types 집계
    const pointMap = new Map<string, {
      email: string; model: string; date: string;
      input: number; output: number; cache: number; thought: number;
    }>();

    for (const s of dailySeries) {
      const email = s.metric.user_email || "unknown";
      const model = s.metric.model || "gemini-unknown";
      const type = s.metric.type || "unknown";

      for (const [ts, val] of s.values) {
        const date = tsToDate(parseFloat(String(ts)));
        const key = `${email}|${model}|${date}`;
        const tokens = Math.round(parseFloat(val) || 0);
        if (tokens <= 0) continue;

        if (!pointMap.has(key)) {
          pointMap.set(key, { email, model, date, input: 0, output: 0, cache: 0, thought: 0 });
        }
        const p = pointMap.get(key)!;
        if (type === "input") p.input += tokens;
        else if (type === "output") p.output += tokens;
        else if (type === "cache") p.cache += tokens;
        else if (type === "thought") p.thought += tokens;
      }
    }

    // ClaudeCodeDataPoint[] 형태로 변환
    const result = Array.from(pointMap.values()).map((p) => {
      const name = EMAIL_TO_NAME[p.email] ?? p.email.split("@")[0];
      return {
        actor: {
          type: "user" as const,
          id: p.email,
          email_address: p.email,
          name,
        },
        model: p.model,
        date: p.date,
        session_count: 0,
        lines_of_code: 0,
        commits: 0,
        pull_requests: 0,
        tool_acceptance_rate: 0,
        input_tokens: p.input,
        output_tokens: p.output,
        cache_read_tokens: p.cache,
        cache_creation_tokens: p.thought,
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.warn("gemini-analytics API error:", error);
    return NextResponse.json({ data: [] });
  }
}
