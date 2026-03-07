import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_BACKFILL_TOKEN;
const REPO = "eoash/token-dashboard";
const BRANCH = "main";

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GITHUB_BACKFILL_TOKEN not configured" },
      { status: 500 }
    );
  }

  let body: { email: string; data: unknown[] };
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

  const raw = body.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
  const username = raw.replace(/\.\./g, "_");
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const filePath = `src/lib/backfill/codex/${username}.json`;
  const content = JSON.stringify({ data: body.data }, null, 2);
  const b64Content = Buffer.from(content).toString("base64");

  let sha: string | undefined;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
    );
    if (existing.ok) {
      const json = await existing.json();
      sha = json.sha;
    }
  } catch {
    // file doesn't exist
  }

  const ghBody: Record<string, string> = {
    message: `codex-backfill: ${body.email} 데이터 ${sha ? "업데이트" : "추가"}`,
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
    records: body.data.length,
    message: "Vercel 재배포가 자동으로 트리거됩니다.",
  });
}
