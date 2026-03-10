"use client";

import { useState, useEffect } from "react";
import type { BoardComment } from "@/lib/notion-board";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

interface Props {
  postId: string;
  userName?: string; // 로그인된 사용자 이름
  onLoginClick?: () => void;
}

export default function CommentSection({ postId, userName, onLoginClick }: Props) {
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/board/comments?postId=${postId}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const submit = async () => {
    if (!userName || !content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/board/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, author: userName, content: content.trim() }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setContent("");
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-800/50">
      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-xs text-gray-600 py-1">댓글 불러오는 중...</div>
      ) : comments.length > 0 ? (
        <div className="space-y-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="group/comment flex gap-2 text-sm">
              <span className="text-[#00E87A] font-medium shrink-0 text-xs mt-0.5">
                {c.author}
              </span>
              <span className="text-gray-300 text-xs leading-relaxed flex-1">
                {c.content}
              </span>
              <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">
                {timeAgo(c.createdAt)}
              </span>
              {userName === c.author && (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/board/comments", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ commentId: c.id, author: c.author }),
                    });
                    if (res.ok) setComments((prev) => prev.filter((x) => x.id !== c.id));
                  }}
                  className="text-[10px] text-gray-700 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover/comment:opacity-100 shrink-0 mt-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* 댓글 작성 */}
      {userName ? (
        <div className="flex gap-2 items-start">
          <span className="shrink-0 px-2 py-1.5 rounded-md bg-gray-800/40 border border-gray-700/50 text-xs text-gray-400">
            {userName}
          </span>
          <input
            type="text"
            placeholder="댓글을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="flex-1 px-2 py-1.5 rounded-md bg-gray-800/70 border border-gray-700 text-xs text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "..." : "등록"}
          </button>
        </div>
      ) : (
        <button
          onClick={onLoginClick}
          className="text-xs text-gray-500 hover:text-[#00E87A] transition-colors cursor-pointer py-1"
        >
          댓글을 작성하려면 <span className="underline underline-offset-2">로그인</span>하세요
        </button>
      )}
    </div>
  );
}
