import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EMAIL_TO_NAME } from "@/lib/constants";

interface CodexDayRecord {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  reasoning_output_tokens: number;
  sessions: number;
  model: string;
}

interface CodexMemberRow {
  name: string;
  initial: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  sessions: number;
  model: string;
}

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const backfillDir = path.join(process.cwd(), "src/lib/backfill/codex");

  let files: string[] = [];
  try {
    files = fs.readdirSync(backfillDir).filter((f) => f.endsWith(".json"));
  } catch {
    return NextResponse.json({ data: [] });
  }

  const members: CodexMemberRow[] = [];

  for (const file of files) {
    const username = file.replace(".json", "");
    const name = EMAIL_TO_NAME[username] ?? username;

    try {
      const raw = fs.readFileSync(path.join(backfillDir, file), "utf-8");
      const { data } = JSON.parse(raw) as { data: CodexDayRecord[] };

      const filtered = data.filter((d) => d.date >= cutoffStr);
      if (filtered.length === 0) continue;

      const agg = filtered.reduce(
        (acc, d) => ({
          inputTokens: acc.inputTokens + d.input_tokens,
          outputTokens: acc.outputTokens + d.output_tokens,
          cachedInputTokens: acc.cachedInputTokens + d.cached_input_tokens,
          reasoningTokens: acc.reasoningTokens + d.reasoning_output_tokens,
          sessions: acc.sessions + d.sessions,
          model: d.model || acc.model,
        }),
        { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, sessions: 0, model: "" },
      );

      members.push({
        name,
        initial: name[0]?.toUpperCase() ?? "?",
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        cachedInputTokens: agg.cachedInputTokens,
        reasoningTokens: agg.reasoningTokens,
        totalTokens: agg.inputTokens + agg.outputTokens,
        sessions: agg.sessions,
        model: agg.model,
      });
    } catch (e) {
      console.warn(`codex backfill parse error: ${file}`, e);
    }
  }

  members.sort((a, b) => b.totalTokens - a.totalTokens);

  return NextResponse.json({ data: members });
}
