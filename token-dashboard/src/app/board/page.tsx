"use client";

import { useEffect, useState } from "react";
import BoardFeed from "@/components/board/BoardFeed";
import type { BoardPost } from "@/lib/notion-board";
import { useT } from "@/lib/contexts/LanguageContext";

export default function BoardPage() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const notionDbUrl = "https://www.notion.so/422fb59814f64a6fbbb1097cd8969285";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("board.title")}</h1>
        <a
          href={notionDbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("board.write")}
        </a>
      </div>
      {loading ? (
        <div className="text-gray-400 text-center py-12">
          {t("common.loading")}
        </div>
      ) : (
        <BoardFeed posts={posts} />
      )}
    </div>
  );
}
