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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("board.title")}</h1>
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
