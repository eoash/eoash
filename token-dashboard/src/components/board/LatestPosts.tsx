"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BoardPost } from "@/lib/notion-board";
import PostCard from "./PostCard";
import { useT } from "@/lib/contexts/LanguageContext";

export default function LatestPosts() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setPosts((d.posts ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t("board.latest")}</h2>
        <Link
          href="/board"
          className="text-sm text-[#00E87A] hover:underline"
        >
          {t("board.more")}
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} compact />
        ))}
      </div>
    </div>
  );
}
