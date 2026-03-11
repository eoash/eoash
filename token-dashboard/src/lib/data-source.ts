import type { ClaudeCodeAnalyticsResponse, ClaudeCodeDataPoint } from "./types";
import { fetchFromPrometheus } from "./prometheus";
import { getMockAnalytics } from "./mock-data";
import fs from "fs";
import path from "path";

export type DataSource = "prometheus" | "mock";

export function getDataSource(): DataSource {
  if (process.env.PROMETHEUS_URL) return "prometheus";
  return "mock";
}

/** 이메일 정규화: 이중 도메인(a@b@c) 방지 + lowercase */
function sanitizeEmail(email: string): string {
  const parts = email.toLowerCase().split("@");
  if (parts.length >= 2) return `${parts[0]}@${parts[1]}`;
  return email.toLowerCase();
}

/** backfill/ 디렉토리의 모든 JSON을 읽어서 병합 + sanitize */
function loadAllBackfill(): ClaudeCodeDataPoint[] {
  const dir = path.join(process.cwd(), "src/lib/backfill");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const all: ClaudeCodeDataPoint[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.data)) {
        for (const d of parsed.data) {
          // sanitize emails
          if (d.actor?.email_address) {
            d.actor.email_address = sanitizeEmail(d.actor.email_address);
          }
          if (d.actor?.id) {
            d.actor.id = sanitizeEmail(d.actor.id);
          }
          all.push(d);
        }
      }
    } catch (e) {
      console.warn(`backfill: failed to parse ${file}:`, e);
    }
  }

  return all;
}

const backfillData = loadAllBackfill();

/** Codex 모델 여부 (gpt-* 계열은 /api/codex-usage에서 별도 서빙) */
function isCodexModel(model: string): boolean {
  return model.startsWith("gpt-");
}

/** 유저별 backfill 마지막 날짜 계산 (Claude 모델만, Codex 제외) */
function buildPerUserCutoff(): Map<string, string> {
  const cutoffs = new Map<string, string>();
  for (const d of backfillData) {
    if (isCodexModel(d.model)) continue;
    const email = d.actor?.email_address ?? d.actor?.id ?? "";
    const existing = cutoffs.get(email) ?? "";
    if (d.date > existing) cutoffs.set(email, d.date);
  }
  return cutoffs;
}

const perUserCutoff = buildPerUserCutoff();

/** 글로벌 backfill end (가장 최근 날짜) — 호환용 */
const BACKFILL_END = (() => {
  const dates = backfillData.map((d) => d.date);
  return dates.length > 0 ? dates.sort().pop()! : "";
})();

export function getBackfillEnd(): string {
  return BACKFILL_END;
}

/** <synthetic> 태그 제거 전처리 (이메일 + 모델) */
function filterSynthetic(data: ClaudeCodeDataPoint[]): ClaudeCodeDataPoint[] {
  return data.filter((d) => {
    const email = d.actor?.email_address ?? d.actor?.id ?? "";
    return !email.includes("<synthetic>") && d.model !== "<synthetic>";
  });
}

/** (email, model, date) 키 생성 */
function pointKey(d: ClaudeCodeDataPoint): string {
  const email = d.actor?.email_address ?? d.actor?.id ?? "";
  return `${email}|${d.model}|${d.date}`;
}

/** 토큰 합산 (input + output) */
function pointTotal(d: ClaudeCodeDataPoint): number {
  return d.input_tokens + d.output_tokens;
}

export async function fetchAnalytics(params: {
  start_date: string;
  end_date: string;
  group_by?: ("actor" | "model" | "date")[];
}): Promise<ClaudeCodeAnalyticsResponse> {
  const source = getDataSource();

  if (source === "mock") {
    return getMockAnalytics();
  }

  // Prometheus 전체 데이터 (cutoff 제한 없이)
  const promData = await fetchFromPrometheus(params);

  // Prometheus 데이터를 (email, model, date) 맵으로 인덱싱
  const promMap = new Map<string, ClaudeCodeDataPoint>();
  for (const d of promData.data) {
    const key = pointKey(d);
    promMap.set(key, d);
  }

  // Backfill: cutoff 이전 날짜만 (Codex 제외)
  const backfillPoints = backfillData.filter((d) => {
    if (isCodexModel(d.model)) return false;
    const email = d.actor?.email_address ?? d.actor?.id ?? "";
    const cutoff = perUserCutoff.get(email) ?? "";
    return (
      d.date >= params.start_date &&
      d.date <= params.end_date &&
      d.date <= cutoff
    );
  });

  // 병합: backfill 우선 (Admin API = ground truth), Prometheus는 보조
  // Prometheus 이중전송으로 부풀려진 데이터가 backfill을 덮어쓰지 않도록 함
  const merged = new Map<string, ClaudeCodeDataPoint>();

  for (const d of backfillPoints) {
    merged.set(pointKey(d), d);
  }

  for (const [key, promPoint] of promMap) {
    if (!merged.has(key)) {
      // Prometheus에만 있는 날짜 (cutoff 이후) → 그대로 사용
      merged.set(key, promPoint);
    }
    // backfill이 이미 있으면 항상 backfill 유지 (Admin API가 정확)
  }

  // 최종 날짜 범위 필터: Prometheus rolling window가 params.start_date보다
  // 일찍 시작할 수 있어서, backfill 보호가 빠진 과거 날짜의 부풀려진 데이터가
  // 그대로 통과하는 버그 방지 (days=1 "오늘" 조회에서 특히 영향 큼)
  const bounded = [...merged.values()].filter(
    (d) => d.date >= params.start_date && d.date <= params.end_date
  );

  return { data: filterSynthetic(bounded) };
}
