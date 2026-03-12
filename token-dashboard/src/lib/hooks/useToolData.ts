"use client";

import { useState, useEffect, useMemo } from "react";
import type { ClaudeCodeDataPoint } from "@/lib/types";
import { useDateRange } from "@/lib/contexts/DateRangeContext";
import { useTool, type ToolType } from "@/lib/contexts/ToolContext";

interface UseToolDataResult {
  data: ClaudeCodeDataPoint[];
  loading: boolean;
  error: string | null;
}

const API_MAP: Record<Exclude<ToolType, "all">, string> = {
  claude: "/api/analytics",
  codex: "/api/codex-analytics",
  gemini: "/api/gemini-analytics",
};

async function fetchToolData(tool: string, start: string, end: string): Promise<ClaudeCodeDataPoint[]> {
  const url = `${API_MAP[tool as keyof typeof API_MAP]}?start=${start}&end=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${tool} API 오류 (${res.status})`);
  const json = await res.json();
  return json.data ?? [];
}

/**
 * "All" 모드: 3개 도구 데이터 병합 + 커밋/PR 중복 제거
 *
 * 같은 날짜+같은 사용자의 커밋은 git log 기반이라 Claude/Codex에 중복 카운팅됨.
 * 해결: (email, date)별로 커밋/PR은 최대값만 유지, 나머지 도구 데이터는 0으로 설정.
 */
function deduplicateActivity(data: ClaudeCodeDataPoint[]): ClaudeCodeDataPoint[] {
  // 1단계: (email, date) 별 최대 commits/PRs 찾기
  const maxActivity = new Map<string, { commits: number; pull_requests: number }>();
  for (const d of data) {
    const email = d.actor.email_address ?? d.actor.id;
    const key = `${email}|${d.date}`;
    const cur = maxActivity.get(key) ?? { commits: 0, pull_requests: 0 };
    cur.commits = Math.max(cur.commits, d.commits ?? 0);
    cur.pull_requests = Math.max(cur.pull_requests, d.pull_requests ?? 0);
    maxActivity.set(key, cur);
  }

  // 2단계: 첫 등장 도구에만 활동 지표 할당, 나머지는 0
  const assigned = new Set<string>();
  return data.map((d) => {
    const email = d.actor.email_address ?? d.actor.id;
    const key = `${email}|${d.date}`;
    if (assigned.has(key)) {
      // 이미 다른 도구에서 활동 지표를 가져감 → 0으로 설정
      return { ...d, commits: 0, pull_requests: 0 };
    }
    assigned.add(key);
    const max = maxActivity.get(key)!;
    return { ...d, commits: max.commits, pull_requests: max.pull_requests };
  });
}

export function useToolData(): UseToolDataResult {
  const { tool } = useTool();
  const { range } = useDateRange();
  const [rawData, setRawData] = useState<{ tool: string; data: ClaudeCodeDataPoint[] }>({
    tool: "claude",
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { start, end } = range;

    if (tool === "all") {
      // 3개 병렬 fetch — 부분 실패 허용 (성공한 도구 데이터만 표시)
      Promise.allSettled([
        fetchToolData("claude", start, end),
        fetchToolData("codex", start, end),
        fetchToolData("gemini", start, end),
      ])
        .then((results) => {
          if (cancelled) return;
          const merged: ClaudeCodeDataPoint[] = [];
          const failed: string[] = [];
          const tools = ["Claude", "Codex", "Gemini"] as const;
          results.forEach((r, i) => {
            if (r.status === "fulfilled") merged.push(...r.value);
            else { console.warn(`${tools[i]} fetch failed:`, r.reason); failed.push(tools[i]); }
          });
          setRawData({ tool, data: merged });
          if (failed.length > 0 && failed.length < 3) {
            setError(`${failed.join(", ")} 데이터를 불러오지 못했습니다.`);
          } else if (failed.length === 3) {
            setError("데이터를 불러오지 못했습니다.");
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      fetchToolData(tool, start, end)
        .then((data) => { if (!cancelled) setRawData({ tool, data }); })
        .catch((e: unknown) => {
          if (!cancelled) {
            console.error(`${tool} fetch failed:`, e);
            setError("데이터를 불러오지 못했습니다.");
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [tool, range.start, range.end]);

  // "All" 모드에서만 중복 제거 적용
  const data = useMemo(() => {
    if (rawData.tool === "all") return deduplicateActivity(rawData.data);
    return rawData.data;
  }, [rawData]);

  return { data, loading, error };
}
