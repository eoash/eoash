import { NextRequest, NextResponse } from "next/server";
import {
  fetchBoardPosts,
  updateReaction,
  archivePost,
  type ReactionEmoji,
} from "@/lib/notion-board";
import { getUserFromCookies } from "@/lib/board-auth";

const VALID_EMOJIS: ReactionEmoji[] = ["👍", "💡", "🙌"];

export async function GET() {
  try {
    const posts = await fetchBoardPosts();
    return NextResponse.json(
      { posts },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    console.error("Board fetch error:", e);
    return NextResponse.json({ posts: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, emoji, delta } = body as {
      pageId: string;
      emoji: ReactionEmoji;
      delta: 1 | -1;
    };

    if (
      !pageId ||
      !VALID_EMOJIS.includes(emoji) ||
      ![1, -1].includes(delta)
    ) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    await updateReaction(pageId, emoji, delta);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Board reaction error:", e);
    return NextResponse.json(
      { error: "Failed to update reaction" },
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
    const { pageId, author } = (await req.json()) as {
      pageId: string;
      author: string;
    };

    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    // 본인 글만 삭제 가능
    if (author !== user.name) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await archivePost(pageId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Board delete error:", e);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 502 },
    );
  }
}
