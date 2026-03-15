import { NextRequest, NextResponse } from "next/server";
import { incrementView } from "@/lib/notion-board";

export async function POST(req: NextRequest) {
  try {
    const { pageId } = await req.json();
    if (!pageId || typeof pageId !== "string") {
      return NextResponse.json({ error: "Invalid pageId" }, { status: 400 });
    }
    const views = await incrementView(pageId);
    return NextResponse.json({ views });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
