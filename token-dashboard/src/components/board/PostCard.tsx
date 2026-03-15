"use client";

import { useState, type ReactNode } from "react";
import type { BoardPost } from "@/lib/notion-board";
import type { BoardUser } from "@/lib/board-types";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";

const IMG_EXT_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?/gi;
const ANY_URL_RE = /https?:\/\/\S+/g;

function renderBody(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const combined = new RegExp(
    `(${IMG_EXT_RE.source})|(${ANY_URL_RE.source})`,
    "gi",
  );
  let m;

  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    const url = m[0];
    if (m[1]) {
      parts.push(
        <img
          key={m.index}
          src={url}
          alt=""
          className="rounded-lg max-w-full max-h-96 my-2 block"
          loading="lazy"
        />,
      );
    } else {
      parts.push(
        <a
          key={m.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00E87A] hover:underline break-all"
        >
          {url.length > 70
            ? url.replace(/^https?:\/\//, "").slice(0, 60) + "…"
            : url.replace(/^https?:\/\//, "")}
        </a>,
      );
    }
    lastIndex = m.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface Props {
  post: BoardPost;
  compact?: boolean;
  user?: BoardUser | null;
  onDeleted?: () => void;
  onUpdated?: (updated: BoardPost) => void;
  defaultOpen?: boolean;
  onLoginClick?: () => void;
}

export default function PostCard({ post, compact, user, onDeleted, onUpdated, defaultOpen, onLoginClick }: Props) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  const [views, setViews] = useState(post.views);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editLink, setEditLink] = useState(post.link ?? "");
  const [saving, setSaving] = useState(false);

  const canDelete = user && user.name === post.author && !post.pinned;
  const canEdit = user && user.name === post.author && !post.pinned;

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      const key = `viewed_${post.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        fetch("/api/board/views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: post.id }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.views) setViews(d.views); })
          .catch(() => { /* silent */ });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/board", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: post.id, author: post.author }),
      });
      if (res.ok) onDeleted?.();
    } catch { /* silent */ }
    finally { setDeleting(false); }
  };

  const startEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditLink(post.link ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/board/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: post.id,
          title: editTitle.trim(),
          body: editBody.trim(),
          author: post.author,
          link: editLink.trim() || undefined,
        }),
      });
      if (res.ok) {
        const { post: updated } = await res.json();
        setEditing(false);
        onUpdated?.(updated);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const isProduct = post.category === "프로덕트";

  // compact 모드 (Overview 위젯) — 한 줄 요약
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm">
        {post.pinned && <span className="text-xs">📌</span>}
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
            isProduct
              ? "text-[#00E87A] bg-[#00E87A]/10"
              : "text-[#3B82F6] bg-[#3B82F6]/10"
          }`}
        >
          {isProduct ? "프로덕트" : "공지"}
        </span>
        {post.link ? (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-200 hover:text-[#00E87A] transition-colors truncate"
          >
            {post.title}
          </a>
        ) : (
          <span className="text-gray-200 truncate">{post.title}</span>
        )}
        <span className="text-gray-600 text-xs shrink-0 ml-auto">
          {post.date.slice(5)}
        </span>
      </div>
    );
  }

  // 포럼형 — 제목 행 + 클릭 펼침
  return (
    <div
      className={`border-b border-gray-800/60 transition-colors ${
        expanded ? "bg-gray-900/40" : "hover:bg-gray-900/30"
      }`}
    >
      {/* 메인 행 */}
      <button
        onClick={handleExpand}
        className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
      >
        {/* 카테고리 배지 */}
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
            isProduct
              ? "text-[#00E87A] bg-[#00E87A]/10"
              : "text-[#3B82F6] bg-[#3B82F6]/10"
          }`}
        >
          {isProduct ? "프로덕트" : "공지"}
        </span>

        {/* 고정 아이콘 */}
        {post.pinned && (
          <span className="text-xs text-[#F59E0B] shrink-0">📌</span>
        )}

        {/* 제목 */}
        <span className="text-sm font-medium text-gray-100 truncate flex-1">
          {post.title}
          {post.edited && (
            <span className="text-xs text-gray-500 font-normal ml-1.5">(편집됨)</span>
          )}
        </span>

        {/* 조회수 */}
        <span className="text-xs text-gray-600 shrink-0 hidden sm:inline flex items-center gap-0.5">
          <svg className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {views}
        </span>

        {/* 메타 — 작성자 + 날짜 */}
        <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">
          {post.author}
        </span>
        <span className="text-xs text-gray-600 shrink-0">
          {post.date.slice(5)}
        </span>

        {/* 펼침 화살표 */}
        <svg
          className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 펼침 영역 */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {editing ? (
            /* 편집 모드 */
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 focus:border-[#00E87A]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">본문</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 focus:border-[#00E87A]/50 focus:outline-none resize-none"
                />
                <div className="text-right text-xs text-gray-600 mt-0.5">
                  {editBody.length}/2000
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  링크 <span className="text-gray-600">(선택)</span>
                </label>
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editTitle.trim() || !editBody.trim() || saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            /* 읽기 모드 */
            <>
              {/* 본문 */}
              {post.body && (
                <div className="text-sm text-gray-400 leading-relaxed mb-2 whitespace-pre-wrap">
                  {renderBody(post.body)}
                </div>
              )}

              {/* 링크 */}
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#00E87A] hover:underline mb-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {post.link.replace(/^https?:\/\//, "").slice(0, 50)}
                </a>
              )}

              {/* 모바일 작성자 표시 */}
              <div className="text-xs text-gray-500 sm:hidden mb-2">
                {post.author} · {post.date}
              </div>

              {/* 리액션 + 편집/삭제 */}
              <div className="flex items-center justify-between">
                <ReactionBar postId={post.id} reactions={post.reactions} />
                <div className="flex items-center gap-3">
                  {canEdit && (
                    <button
                      onClick={startEdit}
                      className="text-xs text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      편집
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                    >
                      {deleting ? "삭제 중..." : "삭제"}
                    </button>
                  )}
                </div>
              </div>

              {/* 댓글 */}
              <CommentSection postId={post.id} userName={user?.name} onLoginClick={onLoginClick} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
