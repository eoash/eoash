"use client";

import { useEffect, useState, useCallback } from "react";
import BoardFeed from "@/components/board/BoardFeed";
import WritePostForm from "@/components/board/WritePostForm";
import type { BoardPost } from "@/lib/notion-board";
import type { BoardUser } from "@/lib/board-types";
import { useT } from "@/lib/contexts/LanguageContext";
import { TEAM_MEMBERS } from "@/lib/constants";

const AUTHOR_OPTIONS = TEAM_MEMBERS.filter((m) => m.avatar).map((m) => m.name).sort();

export default function BoardPage() {
  const { t } = useT();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [user, setUser] = useState<BoardUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login flow state
  const [showLogin, setShowLogin] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [loginStatus, setLoginStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  // Check auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Check URL params for auth errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "expired") {
      setLoginStatus("error");
      setShowLogin(true);
      window.history.replaceState({}, "", "/board");
    }
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

  const handleLoginRequest = async () => {
    if (!selectedName) return;
    setLoginStatus("sending");

    try {
      const res = await fetch("/api/auth/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedName }),
      });

      if (res.ok) {
        setLoginStatus("sent");
      } else {
        setLoginStatus("error");
      }
    } catch {
      setLoginStatus("error");
    }
  };

  const handleWriteClick = () => {
    if (!user) {
      setShowLogin(true);
    } else {
      setShowWrite(true);
    }
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
          {!showWrite && !showLogin && (
            <button
              onClick={handleWriteClick}
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

      {/* Login flow */}
      {showLogin && !user && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Slack 인증</h2>
            <button
              onClick={() => {
                setShowLogin(false);
                setLoginStatus("idle");
              }}
              className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>

          {loginStatus === "sent" ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">📩</div>
              <p className="text-sm text-gray-300 mb-1">
                <strong>{selectedName}</strong>님의 Slack DM으로 인증 링크를 보냈습니다
              </p>
              <p className="text-xs text-gray-500">
                Slack에서 &quot;로그인하기&quot; 버튼을 클릭하세요 (5분 유효)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                본인 확인을 위해 Slack DM으로 인증 링크를 보내드립니다.
              </p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  이름 선택
                </label>
                <select
                  value={selectedName}
                  onChange={(e) => setSelectedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 focus:border-[#00E87A]/50 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    본인 이름을 선택하세요
                  </option>
                  {AUTHOR_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {loginStatus === "error" && (
                <p className="text-xs text-red-400">
                  인증 요청에 실패했습니다. 다시 시도해주세요.
                </p>
              )}
              <button
                onClick={handleLoginRequest}
                disabled={!selectedName || loginStatus === "sending"}
                className="w-full py-2 rounded-lg text-sm font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {loginStatus === "sending"
                  ? "발송 중..."
                  : "Slack DM으로 인증 링크 받기"}
              </button>
            </div>
          )}
        </div>
      )}

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
