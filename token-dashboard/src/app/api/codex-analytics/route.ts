import { NextRequest, NextResponse } from "next/server";
import { readCodexBackfillRaw } from "@/lib/codex-backfill";

/**
 * Codex analytics API — returns ClaudeCodeDataPoint[] shape
 * (same format as /api/analytics for unified data layer)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    const data = readCodexBackfillRaw(startDate, endDate);
    return NextResponse.json({ data });
  } catch (error) {
    console.warn("codex-analytics API error:", error);
    return NextResponse.json({ data: [] });
  }
}
