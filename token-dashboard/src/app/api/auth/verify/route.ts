import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, createSessionCookie } from "@/lib/board-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/board?auth=invalid", req.url));
  }

  const user = verifyMagicToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/board?auth=expired", req.url));
  }

  const cookie = createSessionCookie(user);
  const response = NextResponse.redirect(new URL("/board", req.url));
  response.headers.append("Set-Cookie", cookie);

  return response;
}
