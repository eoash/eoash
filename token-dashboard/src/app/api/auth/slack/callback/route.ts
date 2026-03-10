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

  // Exchange code for token (OpenID Connect)
  const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.ok || !tokenData.access_token) {
    console.error("Slack OIDC token failed:", tokenData.error);
    return NextResponse.redirect(new URL("/board?auth=error", req.url));
  }

  // Get user info (OpenID Connect)
  const userInfoRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const userInfo = await userInfoRes.json();
  if (!userInfo.ok) {
    console.error("Slack OIDC userInfo failed:", userInfo.error);
    return NextResponse.redirect(new URL("/board?auth=error", req.url));
  }

  const email = (userInfo.email ?? "").toLowerCase();
  const name = EMAIL_TO_NAME[email] ?? userInfo.name ?? email;
  const avatar = NAME_TO_AVATAR[name] ?? userInfo.picture;

  const cookie = createSessionCookie({ name, email, avatar });
  const response = NextResponse.redirect(new URL("/board", req.url));
  response.headers.append("Set-Cookie", cookie);

  return response;
}
