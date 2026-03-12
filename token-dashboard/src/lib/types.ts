// ============================================================
// Claude Code Analytics Types (OTel / Prometheus)
// ============================================================

export interface ClaudeCodeActor {
  type: "api_key" | "user";
  id: string;
  email_address?: string;
  name?: string;
}

export interface ClaudeCodeDataPoint {
  actor: ClaudeCodeActor;
  model: string;
  date: string;
  session_count: number;
  lines_of_code: number;
  commits: number;
  pull_requests: number;
  tool_acceptance_rate: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
}

export interface ClaudeCodeAnalyticsResponse {
  data: ClaudeCodeDataPoint[];
}

/**
 * JSON 파싱된 raw 데이터를 정규화 — 누락 필드를 0으로 채움.
 * backfill JSON / Prometheus 결과가 모든 필드를 보장하지 않으므로,
 * 데이터 경계(loadAllBackfill, API route)에서 1회 적용하면
 * 이후 aggregator에서 `?? 0` 불필요.
 */
export function normalizeDataPoint(d: Record<string, unknown>): ClaudeCodeDataPoint {
  return {
    actor: (d.actor as ClaudeCodeActor) ?? { type: "user", id: "unknown", email_address: "unknown" },
    model: (d.model as string) ?? "",
    date: (d.date as string) ?? "",
    session_count: (d.session_count as number) ?? 0,
    lines_of_code: (d.lines_of_code as number) ?? 0,
    commits: (d.commits as number) ?? 0,
    pull_requests: (d.pull_requests as number) ?? 0,
    tool_acceptance_rate: (d.tool_acceptance_rate as number) ?? 0,
    input_tokens: (d.input_tokens as number) ?? 0,
    output_tokens: (d.output_tokens as number) ?? 0,
    cache_read_tokens: (d.cache_read_tokens as number) ?? 0,
    cache_creation_tokens: (d.cache_creation_tokens as number) ?? 0,
  };
}
