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

/** backfill/ 디렉토리의 모든 JSON을 읽어서 병합 */
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
        all.push(...parsed.data);
      }
    } catch {
      // skip invalid files
    }
  }

  return all;
}

const backfillData = loadAllBackfill();

/** 유저별 backfill 마지막 날짜 — 해당 날짜까지 JSON, 이후 Prometheus */
function buildPerUserBackfillEnd(data: ClaudeCodeDataPoint[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of data) {
    const email = d.actor?.email_address || "";
    if (!email) continue;
    const current = map.get(email) || "";
    if (d.date > current) map.set(email, d.date);
  }
  return map;
}

const userBackfillEnd = buildPerUserBackfillEnd(backfillData);

export function getBackfillEnd(): string {
  // 전체 backfill 중 가장 늦은 날짜 (호환용)
  const dates = [...userBackfillEnd.values()];
  return dates.length > 0 ? dates.sort().pop()! : "";
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

  // Prometheus + backfill JSON 병합 (유저별 구간 분리)
  // 유저의 backfill 마지막 날짜까지 → backfill JSON
  // 유저의 backfill 마지막 날짜 이후 → Prometheus
  // backfill이 없는 유저 → Prometheus 전체 사용
  const promData = await fetchFromPrometheus(params);

  const promPoints = promData.data.filter((d) => {
    const email = d.actor?.email_address || "";
    const end = userBackfillEnd.get(email);
    return !end || d.date > end;
  });

  const backfillPoints = backfillData.filter((d) => {
    const email = d.actor?.email_address || "";
    const end = userBackfillEnd.get(email) || "";
    return d.date >= params.start_date && d.date <= params.end_date && d.date <= end;
  });

  return { data: [...backfillPoints, ...promPoints] };
}
