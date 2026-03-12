import fs from "fs";
import path from "path";
import { EMAIL_TO_NAME } from "./constants";

export interface CodexBackfillEntry {
  date: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
  commits?: number;
  session_count?: number;
  pull_requests?: number;
  lines_of_code?: number;
}

export interface CodexUserData {
  email: string;
  input: number;
  output: number;
  cached: number;
  reasoning: number;
  commits: number;
  sessions: number;
  pull_requests: number;
}

export function isCodexModel(model: string): boolean {
  return model.startsWith("gpt-") || model.toLowerCase().includes("codex");
}

/** backfill에서 Codex 엔트리를 ClaudeCodeDataPoint[] 형태로 반환 (codex-analytics용) */
export function readCodexBackfillRaw(startDate: string, endDate: string): Record<string, unknown>[] {
  const backfillDir = path.join(process.cwd(), "src/lib/backfill");
  if (!fs.existsSync(backfillDir)) return [];

  const result: Record<string, unknown>[] = [];
  for (const file of fs.readdirSync(backfillDir).filter((f) => f.endsWith(".json"))) {
    const username = file.replace(".json", "");
    const email = `${username}@eoeoeo.net`;
    const name = EMAIL_TO_NAME[email] ?? username;

    const raw = JSON.parse(fs.readFileSync(path.join(backfillDir, file), "utf-8"));
    for (const e of raw.data ?? []) {
      if (!e.model || !isCodexModel(e.model)) continue;
      if (startDate && e.date < startDate) continue;
      if (endDate && e.date > endDate) continue;

      result.push({
        actor: { type: "user", id: email, email_address: email, name },
        model: e.model ?? "codex-unknown",
        date: e.date,
        session_count: e.session_count ?? 0,
        lines_of_code: e.lines_of_code ?? 0,
        commits: e.commits ?? 0,
        pull_requests: e.pull_requests ?? 0,
        tool_acceptance_rate: 0,
        input_tokens: e.input_tokens ?? 0,
        output_tokens: e.output_tokens ?? 0,
        cache_read_tokens: e.cache_read_tokens ?? 0,
        cache_creation_tokens: e.cache_creation_tokens ?? 0,
      });
    }
  }
  return result;
}

/**
 * backfill/*.json에서 Codex 모델(gpt-*, codex) 레코드를 읽어 유저별 집계.
 * codex-usage API와 all-leaderboard API가 공유.
 */
export function readCodexBackfill(startDate: string, endDate: string): Map<string, CodexUserData> {
  const backfillDir = path.join(process.cwd(), "src/lib/backfill");
  const memberMap = new Map<string, CodexUserData>();

  if (!fs.existsSync(backfillDir)) return memberMap;

  for (const file of fs.readdirSync(backfillDir).filter((f) => f.endsWith(".json"))) {
    const username = file.replace(".json", "");
    const email = `${username}@eoeoeo.net`;
    const raw = JSON.parse(fs.readFileSync(path.join(backfillDir, file), "utf-8"));
    const entries: CodexBackfillEntry[] = (raw.data ?? []).filter(
      (e: CodexBackfillEntry) => {
        if (!e.model || !isCodexModel(e.model)) return false;
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
      },
    );
    if (entries.length === 0) continue;

    const m = memberMap.get(email) ?? { email, input: 0, output: 0, cached: 0, reasoning: 0, commits: 0, sessions: 0, pull_requests: 0 };
    for (const e of entries) {
      m.input += e.input_tokens ?? 0;
      m.output += e.output_tokens ?? 0;
      m.cached += e.cache_read_tokens ?? 0;
      m.reasoning += e.cache_creation_tokens ?? 0;
      m.commits += e.commits ?? 0;
      m.sessions += e.session_count ?? 0;
      m.pull_requests += e.pull_requests ?? 0;
    }
    memberMap.set(email, m);
  }
  return memberMap;
}
