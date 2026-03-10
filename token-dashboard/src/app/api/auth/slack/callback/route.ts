import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/board-auth";
import { EMAIL_TO_NAME, NAME_TO_AVATAR } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/board", req.url));
  }

  const clientId = process.env.SLACK_CLIENT_ID ?? "";
  const clientSecret = process.env.SLACK_CLIENT_SECRET ?? "";
  const redirectUri = `${req.nextUrl.origin}/api/auth/slack/callback`;

  // Exchange code for token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.ok || !tokenData.authed_user?.access_token) {
    console.error("Slack OAuth failed:", tokenData.error);
    return NextResponse.redirect(new URL("/board?auth=error", req.url));
  }

  const userToken = tokenData.authed_user.access_token;

  // Get user identity
  const identityRes = await fetch("https://slack.com/api/users.identity", {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  const identityData = await identityRes.json();
  if (!identityData.ok) {
    console.error("Slack identity failed:", identityData.error);
    return NextResponse.redirect(new URL("/board?auth=error", req.url));
  }

  const email = (identityData.user?.email ?? "").toLowerCase();
  const name = EMAIL_TO_NAME[email] ?? identityData.user?.name ?? email;
  const avatar = NAME_TO_AVATAR[name] ?? identityData.user?.image_72;

  const cookie = createSessionCookie({ name, email, avatar });
  const response = NextResponse.redirect(new URL("/board", req.url));
  response.headers.append("Set-Cookie", cookie);

  return response;
}
