"use client";

import { useState, useEffect } from "react";

interface DataFreshnessProps {
  fetchedAt: string;
  source?: "sync" | "original";
}

export default function DataFreshness({ fetchedAt, source }: DataFreshnessProps) {
  const [label, setLabel] = useState<string>("");
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const update = () => {
      const diffSec = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 1000);
      if (diffSec < 60) setLabel("방금 전");
      else if (diffSec < 3600) setLabel(`${Math.floor(diffSec / 60)}분 전`);
      else setLabel(`${Math.floor(diffSec / 3600)}시간 전`);
      setIsStale(diffSec > 600);
    };
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [fetchedAt]);

  if (!label) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs mb-3 ${isStale ? "text-yellow-500" : "text-gray-500"}`}>
      {isStale && <span>⚠</span>}
      <span>마지막 업데이트 {label}</span>
      {source && (
        <span className="text-gray-600">· {source === "sync" ? "자동 동기화" : "원본 시트"}</span>
      )}
    </div>
  );
}
