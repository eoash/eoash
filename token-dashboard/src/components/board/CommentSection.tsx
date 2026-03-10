"use client";

import { useState, useEffect, useRef } from "react";
import type { BoardComment } from "@/lib/notion-board";

const AUTHOR_KEY = "board-comment-author";

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

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(AUTHOR_KEY);
    if (saved) setAuthor(saved);

    fetch(`/api/board/comments?postId=${postId}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const submit = async () => {
    if (!author.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    localStorage.setItem(AUTHOR_KEY, author.trim());

    try {
      const res = await fetch("/api/board/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, author: author.trim(), content: content.trim() }),
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
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="text-[#00E87A] font-medium shrink-0 text-xs mt-0.5">
                {c.author}
              </span>
              <span className="text-gray-300 text-xs leading-relaxed flex-1">
                {c.content}
              </span>
              <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">
                {timeAgo(c.createdAt)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* 댓글 작성 */}
      <div className="flex gap-2 items-start">
        <input
          ref={inputRef}
          type="text"
          placeholder="이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          maxLength={20}
          className="w-16 shrink-0 px-2 py-1.5 rounded-md bg-gray-800/70 border border-gray-700 text-xs text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
        />
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
          disabled={submitting || !author.trim() || !content.trim()}
          className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? "..." : "등록"}
        </button>
      </div>
    </div>
  );
}
