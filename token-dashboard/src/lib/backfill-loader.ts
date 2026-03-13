/**
 * Backfill JSON 로더 — GitHub raw URL에서 실시간 fetch + 5분 캐시.
 * 빌드 없이 최신 backfill 데이터 반영. 로컬 개발은 fs fallback.
 */
import fs from "fs";
import path from "path";

interface BackfillFile {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/eoash/eoash/main/token-dashboard/src/lib/backfill";
const GITHUB_API_BASE =
  "https://api.github.com/repos/eoash/eoash/contents/token-dashboard/src/lib/backfill";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

let cachedFiles: BackfillFile[] | null = null;
let cacheTimestamp = 0;

function isLocal(): boolean {
  return !process.env.VERCEL && !process.env.CI;
}

/** 로컬 fs에서 backfill 읽기 (개발용) */
function loadFromFs(): BackfillFile[] {
  const dir = path.join(process.cwd(), "src/lib/backfill");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((name) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, name), "utf-8"));
        return { name, data: raw.data ?? [] };
      } catch {
        return { name, data: [] };
      }
    });
}

/** GitHub에서 backfill 파일 목록 + 내용 fetch */
async function loadFromGitHub(): Promise<BackfillFile[]> {
  // 1. 파일 목록 (인증 시 5,000req/hr, 비인증 60req/hr)
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  const ghToken = process.env.GITHUB_BACKFILL_TOKEN;
  if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

  const listRes = await fetch(GITHUB_API_BASE, {
    headers,
    cache: "no-store",
  });
  if (!listRes.ok) {
    console.warn(`backfill-loader: GitHub API ${listRes.status}, falling back to fs`);
    return loadFromFs();
  }

  const listing: { name: string }[] = await listRes.json();
  const jsonFiles = listing.filter((f) => f.name.endsWith(".json"));

  // 2. 병렬 fetch
  const results = await Promise.allSettled(
    jsonFiles.map(async (f) => {
      const res = await fetch(`${GITHUB_RAW_BASE}/${f.name}`, { cache: "no-store" });
      if (!res.ok) return { name: f.name, data: [] };
      const raw = await res.json();
      return { name: f.name, data: raw.data ?? [] };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<BackfillFile> => r.status === "fulfilled")
    .map((r) => r.value);
}

/** 캐시된 backfill 파일 반환 (5분 TTL) */
export async function getBackfillFiles(): Promise<BackfillFile[]> {
  const now = Date.now();
  if (cachedFiles && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFiles;
  }

  cachedFiles = isLocal() ? loadFromFs() : await loadFromGitHub();
  cacheTimestamp = now;
  return cachedFiles;
}
