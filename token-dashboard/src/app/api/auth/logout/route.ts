import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/board-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
