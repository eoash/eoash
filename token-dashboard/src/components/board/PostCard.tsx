"use client";

import { useState } from "react";
import type { BoardPost } from "@/lib/notion-board";
import ReactionBar from "./ReactionBar";

interface Props {
  post: BoardPost;
  compact?: boolean;
}

export default function PostCard({ post, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isProduct = post.category === "프로덕트";

  // compact 모드 (Overview 위젯) — 한 줄 요약
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm">
        {post.pinned && <span className="text-[10px]">📌</span>}
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
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
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
      >
        {/* 카테고리 배지 */}
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
            isProduct
              ? "text-[#00E87A] bg-[#00E87A]/10"
              : "text-[#3B82F6] bg-[#3B82F6]/10"
          }`}
        >
          {isProduct ? "프로덕트" : "공지"}
        </span>

        {/* 고정 아이콘 */}
        {post.pinned && (
          <span className="text-[10px] text-[#F59E0B] shrink-0">📌</span>
        )}

        {/* 제목 */}
        <span className="text-sm font-medium text-gray-100 truncate flex-1">
          {post.title}
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
          {/* 본문 */}
          {post.body && (
            <p className="text-sm text-gray-400 leading-relaxed mb-2">
              {post.body}
            </p>
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

          {/* 리액션 */}
          <ReactionBar postId={post.id} reactions={post.reactions} />
        </div>
      )}
    </div>
  );
}
