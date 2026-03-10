import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/board-auth";

export async function GET(req: NextRequest) {
  const user = getUserFromCookies(req.headers.get("cookie"));
  return NextResponse.json({ user });
}
