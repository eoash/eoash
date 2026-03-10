"use client";

import { useState } from "react";
import { useT } from "@/lib/contexts/LanguageContext";
import type { BoardUser } from "@/lib/board-types";

const CATEGORIES = ["프로덕트", "공지"] as const;
type Category = (typeof CATEGORIES)[number];

interface Props {
  user: BoardUser;
  onClose: () => void;
  onCreated: () => void;
}

export default function WritePostForm({ user, onClose, onCreated }: Props) {
  const { t } = useT();
  const [category, setCategory] = useState<Category>("프로덕트");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && body.trim() && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          author: user.name,
          link: link.trim() || undefined,
        }),
      });

      if (res.ok) {
        onCreated();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("board.write")}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-sm"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* 작성자 (잠금) + 카테고리 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">작성자</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700/50 text-sm text-gray-300">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span>{user.name}</span>
              <svg
                className="w-3 h-3 text-gray-600 ml-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 focus:border-[#00E87A]/50 focus:outline-none appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
          />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">본문</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="AI로 만든 프로덕트, 활용 팁, 유용한 프롬프트 등을 공유해주세요"
            maxLength={2000}
            rows={5}
            className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none resize-none"
          />
          <div className="text-right text-[10px] text-gray-600 mt-0.5">
            {body.length}/2000
          </div>
        </div>

        {/* 링크 (선택) */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            링크 <span className="text-gray-600">(선택)</span>
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30 hover:bg-[#00E87A]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
