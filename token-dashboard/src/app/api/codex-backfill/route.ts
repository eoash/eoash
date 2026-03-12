import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_BACKFILL_TOKEN;
const REPO = "eoash/eoash";
const BRANCH = "main";
const REPO_PREFIX = "token-dashboard/";

interface CodexPushEntry {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
  reasoning_output_tokens?: number;
  sessions?: number;
  model?: string;
  commits?: number;
  pull_requests?: number;
}

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GITHUB_BACKFILL_TOKEN not configured" },
      { status: 500 }
    );
  }

  let body: { email: string; data: CodexPushEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email || !Array.isArray(body.data) || body.data.length === 0) {
    return NextResponse.json(
      { error: "Missing email or empty data array" },
      { status: 400 }
    );
  }

  // username 추출
  const raw = body.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
  const username = raw.replace(/\.\./g, "_");
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const filePath = `${REPO_PREFIX}src/lib/backfill/${username}.json`;

  // 기존 파일 읽기
  let sha: string | undefined;
  let existingData: Record<string, unknown>[] = [];
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
    );
    if (existing.ok) {
      const json = await existing.json();
      sha = json.sha;
      const decoded = Buffer.from(json.content, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed.data)) {
        existingData = parsed.data;
      }
    }
  } catch {
    // 파일 없음 — 새로 생성
  }

  // Codex 포맷 → backfill 포맷 변환 + merge
  const merged = new Map<string, Record<string, unknown>>();
  for (const d of existingData) {
    const rec = d as Record<string, unknown>;
    const key = `${rec.date}|${rec.model}`;
    merged.set(key, rec);
  }

  for (const entry of body.data) {
    const model = entry.model || "codex-unknown";
    const key = `${entry.date}|${model}`;

    // codex_push.py 필드 → backfill 필드 변환
    const rec: Record<string, unknown> = {
      date: entry.date,
      model,
      input_tokens: entry.input_tokens ?? 0,
      output_tokens: entry.output_tokens ?? 0,
      cache_read_tokens: entry.cached_input_tokens ?? 0,
      cache_creation_tokens: entry.reasoning_output_tokens ?? 0,
      session_count: entry.sessions ?? 0,
      commits: entry.commits ?? 0,
      lines_of_code: 0,
      pull_requests: entry.pull_requests ?? 0,
      actor: {
        email_address: body.email,
        id: body.email,
      },
    };

    // merge 모드: 같은 date+model이면 덮어쓰기 (최신 파싱이 정확)
    merged.set(key, rec);
  }

  const mergedArray = Array.from(merged.values()).sort((a, b) => {
    const da = a as Record<string, string>;
    const db = b as Record<string, string>;
    return da.date < db.date ? -1 : da.date > db.date ? 1
      : da.model < db.model ? -1 : da.model > db.model ? 1 : 0;
  });

  const content = JSON.stringify({ data: mergedArray }, null, 2);
  const b64Content = Buffer.from(content).toString("base64");

  const ghBody: Record<string, string> = {
    message: `backfill: ${body.email} codex 데이터 ${sha ? "merge" : "추가"} (${mergedArray.length}건)`,
    content: b64Content,
    branch: BRANCH,
  };
  if (sha) ghBody.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ghBody),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`GitHub API error ${res.status}:`, err);
    return NextResponse.json(
      { error: `GitHub API error: ${res.status}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    file: filePath,
    records: mergedArray.length,
    added: body.data.length,
    existing: existingData.length,
    message: "Codex backfill 완료. Vercel 재배포가 자동으로 트리거됩니다.",
  });
}
