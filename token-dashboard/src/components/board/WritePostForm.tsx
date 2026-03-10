"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/contexts/LanguageContext";

const AUTHOR_KEY = "board-comment-author";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function WritePostForm({ onClose, onCreated }: Props) {
  const { t } = useT();
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(AUTHOR_KEY);
    if (saved) setAuthor(saved);
  }, []);

  const canSubmit = author.trim() && title.trim() && body.trim() && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    localStorage.setItem(AUTHOR_KEY, author.trim());

    try {
      const res = await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category: "프로덕트",
          author: author.trim(),
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
        {/* 작성자 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            작성자
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름을 입력하세요"
            maxLength={20}
            className="w-full px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:border-[#00E87A]/50 focus:outline-none"
          />
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            제목
          </label>
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
          <label className="text-xs text-gray-500 mb-1 block">
            본문
          </label>
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

        {/* 카테고리 안내 */}
        <div className="text-[10px] text-gray-600">
          카테고리는 자동으로 &apos;프로덕트&apos;로 설정됩니다. 공지는 운영팀만 작성할 수 있습니다.
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
