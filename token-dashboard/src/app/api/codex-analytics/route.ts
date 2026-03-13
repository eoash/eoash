import { NextRequest, NextResponse } from "next/server";
import { readCodexBackfillRaw } from "@/lib/codex-backfill";
import { IS_DEMO } from "@/lib/constants";
import { getMockCodexDataPoints } from "@/lib/mock-data";

/**
 * Codex analytics API — returns ClaudeCodeDataPoint[] shape
 * (same format as /api/analytics for unified data layer)
 */
export async function GET(req: NextRequest) {
  if (IS_DEMO) {
    return NextResponse.json({ data: getMockCodexDataPoints() });
  }

  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    const data = await readCodexBackfillRaw(startDate, endDate);
    return NextResponse.json({ data });
  } catch (error) {
    console.warn("codex-analytics API error:", error);
    return NextResponse.json({ data: [] });
  }
}
