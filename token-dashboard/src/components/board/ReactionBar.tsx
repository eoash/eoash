"use client";

import { useState, useEffect } from "react";
import type { ReactionEmoji } from "@/lib/notion-board";

const STORAGE_KEY = "board-reactions";
const EMOJIS: ReactionEmoji[] = ["👍", "💡", "🙌"];

interface Props {
  postId: string;
  reactions: Record<ReactionEmoji, number>;
  compact?: boolean;
}

function loadReacted(): Record<string, ReactionEmoji[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReacted(data: Record<string, ReactionEmoji[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function ReactionBar({ postId, reactions, compact }: Props) {
  const [counts, setCounts] = useState(reactions);
  const [reacted, setReacted] = useState<ReactionEmoji[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = loadReacted();
    setReacted(stored[postId] ?? []);
  }, [postId]);

  const toggle = async (emoji: ReactionEmoji) => {
    const already = reacted.includes(emoji);
    const delta = already ? -1 : 1;

    // Optimistic update
    setCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, prev[emoji] + delta),
    }));
    const next = already
      ? reacted.filter((e) => e !== emoji)
      : [...reacted, emoji];
    setReacted(next);
    const stored = loadReacted();
    stored[postId] = next;
    saveReacted(stored);

    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: postId, emoji, delta }),
      });
    } catch {
      /* optimistic UI already updated */
    }
  };

  if (!mounted) return null;

  return (
    <div className={`flex gap-1.5 ${compact ? "mt-1.5" : "mt-3"}`}>
      {EMOJIS.map((emoji) => {
        const active = reacted.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              active
                ? "border-[#00E87A]/40 bg-[#00E87A]/10 text-[#00E87A]"
                : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            <span>{emoji}</span>
            <span>{counts[emoji]}</span>
          </button>
        );
      })}
    </div>
  );
}
