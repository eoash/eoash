"use client";

import { useEffect, useState, useCallback } from "react";
import BoardFeed from "@/components/board/BoardFeed";
import WritePostForm from "@/components/board/WritePostForm";
import type { BoardPost } from "@/lib/notion-board";
import type { BoardUser } from "@/lib/board-types";
import { useT } from "@/lib/contexts/LanguageContext";

export default function BoardPage() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [user, setUser] = useState<BoardUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const loadPosts = useCallback(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreated = () => {
    setShowWrite(false);
    setLoading(true);
    loadPosts();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("board.title")}</h1>
        <div className="flex items-center gap-2">
          {/* Auth status */}
          {!authLoading && user && (
            <div className="flex items-center gap-2">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-gray-400">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          )}

          {/* Write button */}
          {!showWrite && (
            <button
              onClick={() => {
                if (!user) {
                  window.location.href = "/api/auth/slack";
                } else {
                  setShowWrite(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("board.write")}
            </button>
          )}
        </div>
      </div>

      {/* 글쓰기 폼 */}
      {showWrite && user && (
        <div className="mb-6">
          <WritePostForm
            user={user}
            onClose={() => setShowWrite(false)}
            onCreated={handleCreated}
          />
        </div>
      )}

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
