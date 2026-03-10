"use client";

import { useState } from "react";
import type { BoardPost } from "@/lib/notion-board";
import type { BoardUser } from "@/lib/board-types";
import PostCard from "./PostCard";
import { useT } from "@/lib/contexts/LanguageContext";

type Filter = "all" | "공지" | "프로덕트";

interface Props {
  posts: BoardPost[];
  user?: BoardUser | null;
  onDeleted?: () => void;
}

export default function BoardFeed({ posts, user, onDeleted }: Props) {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const pinned = filtered.filter((p) => p.pinned);
  const rest = filtered.filter((p) => !p.pinned);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("board.all") },
    { key: "공지", label: t("board.notice") },
    { key: "프로덕트", label: t("board.product") },
  ];

  return (
    <div>
      {/* 탭 필터 */}
      <div className="flex gap-2 mb-4">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === key
                ? "bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500 text-center py-12">
          {t("board.empty")}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden divide-y divide-gray-800/60">
          {/* 고정글 먼저 */}
          {pinned.map((post) => (
            <PostCard key={post.id} post={post} user={user} onDeleted={onDeleted} />
          ))}
          {/* 나머지 글 */}
          {rest.map((post) => (
            <PostCard key={post.id} post={post} user={user} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
