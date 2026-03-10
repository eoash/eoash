import { NextRequest, NextResponse } from "next/server";
import {
  fetchBoardPosts,
  updateReaction,
  type ReactionEmoji,
} from "@/lib/notion-board";

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
