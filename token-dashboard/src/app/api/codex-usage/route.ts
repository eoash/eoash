import { NextRequest, NextResponse } from "next/server";
import { EMAIL_TO_NAME } from "@/lib/constants";
import { readCodexBackfill } from "@/lib/codex-backfill";

export interface CodexMemberRow {
  name: string;
  email: string;
  input: number;
  output: number;
  cached: number;
  reasoning: number;
  total: number;
  commits: number;
  sessions: number;
  pull_requests: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    const memberMap = readCodexBackfill(startDate, endDate);

    const data: CodexMemberRow[] = [];
    for (const [email, m] of memberMap) {
      const total = m.input + m.output + m.cached + m.reasoning;
      if (total === 0) continue;
      const name = EMAIL_TO_NAME[email] ?? email.split("@")[0];
      const { email: _e, ...tokens } = m;
      data.push({ name, email, ...tokens, total });
    }

    data.sort((a, b) => b.total - a.total);
    return NextResponse.json({ data });
  } catch (error) {
    console.warn("codex-usage API error:", error);
    return NextResponse.json({ data: [] });
  }
}
