import { NextRequest, NextResponse } from "next/server";
import { fetchComments, createComment, archivePost } from "@/lib/notion-board";
import { getUserFromCookies } from "@/lib/board-auth";

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

export async function DELETE(req: NextRequest) {
  const user = getUserFromCookies(req.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { commentId, author } = (await req.json()) as {
      commentId: string;
      author: string;
    };

    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    if (author !== user.name) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await archivePost(commentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Comment delete error:", e);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 502 },
    );
  }
}
