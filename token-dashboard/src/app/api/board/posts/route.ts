import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/lib/notion-board";

export async function POST(req: NextRequest) {
  try {
    const { title, body, category, author, link } = (await req.json()) as {
      title: string;
      body: string;
      category: "공지" | "프로덕트";
      author: string;
      link?: string;
    };

    if (!title?.trim() || !body?.trim() || !author?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (title.length > 100 || body.length > 2000 || author.length > 20) {
      return NextResponse.json({ error: "Too long" }, { status: 400 });
    }

    if (category !== "프로덕트" && category !== "공지") {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const post = await createPost(
      title.trim(),
      body.trim(),
      category,
      author.trim(),
      link?.trim() || undefined,
    );

    return NextResponse.json({ post });
  } catch (e) {
    console.error("Post create error:", e);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 502 },
    );
  }
}
