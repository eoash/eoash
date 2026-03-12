import { NextRequest, NextResponse } from "next/server";
import { EMAIL_TO_NAME } from "@/lib/constants";
import fs from "fs";
import path from "path";

/**
 * Codex analytics API — returns ClaudeCodeDataPoint[] shape
 * (same format as /api/analytics for unified data layer)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start") ?? "";
    const endDate = searchParams.get("end") ?? "";

    const backfillDir = path.join(process.cwd(), "src/lib/backfill");
    const result: Record<string, unknown>[] = [];

    for (const file of fs.readdirSync(backfillDir).filter((f) => f.endsWith(".json"))) {
      const username = file.replace(".json", "");
      const email = `${username}@eoeoeo.net`;
      const name = EMAIL_TO_NAME[email] ?? username;

      const raw = JSON.parse(fs.readFileSync(path.join(backfillDir, file), "utf-8"));
      const entries = (raw.data ?? []).filter(
        (e: Record<string, unknown>) => {
          const model = (e.model as string) ?? "";
          if (!model.startsWith("gpt-") && !model.toLowerCase().includes("codex")) return false;
          if (startDate && (e.date as string) < startDate) return false;
          if (endDate && (e.date as string) > endDate) return false;
          return true;
        }
      );

      for (const e of entries) {
        result.push({
          actor: {
            type: "user",
            id: email,
            email_address: email,
            name,
          },
          model: (e.model as string) ?? "codex-unknown",
          date: e.date as string,
          session_count: (e.session_count as number) ?? 0,
          lines_of_code: (e.lines_of_code as number) ?? 0,
          commits: (e.commits as number) ?? 0,
          pull_requests: (e.pull_requests as number) ?? 0,
          tool_acceptance_rate: 0,
          input_tokens: (e.input_tokens as number) ?? 0,
          output_tokens: (e.output_tokens as number) ?? 0,
          cache_read_tokens: (e.cache_read_tokens as number) ?? 0,
          cache_creation_tokens: (e.cache_creation_tokens as number) ?? 0,
        });
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.warn("codex-analytics API error:", error);
    return NextResponse.json({ data: [] });
  }
}
