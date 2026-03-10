import { NextRequest, NextResponse } from "next/server";
import { fetchComments, createComment } from "@/lib/notion-board";

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  try {
    const comments = await fetchComments(postId);
    return NextResponse.json({ comments });
  } catch (e) {
    console.error("Comments fetch error:", e);
    return NextResponse.json({ comments: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postId, author, content } = (await req.json()) as {
      postId: string;
      author: string;
      content: string;
    };

    if (!postId || !author?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (author.length > 20 || content.length > 500) {
      return NextResponse.json({ error: "Too long" }, { status: 400 });
    }

    const comment = await createComment(postId, author.trim(), content.trim());
    return NextResponse.json({ comment });
  } catch (e) {
    console.error("Comment create error:", e);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 502 },
    );
  }
}
