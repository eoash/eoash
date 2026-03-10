import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Slack not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/slack/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "openid,profile,email",
    redirect_uri: redirectUri,
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://slack.com/openid/connect/authorize?${params.toString()}`,
  );
}
