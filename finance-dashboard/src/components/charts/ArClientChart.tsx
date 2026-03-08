"use client";

import type { ArClientSummary } from "@/lib/types";
import { formatKRW } from "@/lib/utils";

const RISK_COLOR: Record<string, string> = {
  yellow: "#E8FF47",
  orange: "#F59E0B",
  red: "#EF4444",
};

const RISK_EMOJI: Record<string, string> = {
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
};

export default function ArClientChart({ data }: { data: ArClientSummary[] }) {
  const maxAmount = Math.max(...data.map((d) => d.totalOutstanding), 1);

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        거래처별 미수금 (Top {Math.min(data.length, 10)})
      </h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((c) => (
          <div key={c.client}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white truncate max-w-[180px]">
                {RISK_EMOJI[c.risk]} {c.client}
              </span>
              <span className="text-sm text-gray-400 font-mono">{formatKRW(c.totalOutstanding)}</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(c.totalOutstanding / maxAmount) * 100}%`,
                  backgroundColor: RISK_COLOR[c.risk],
                }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-xs text-gray-600">{c.invoiceCount}건</span>
              <span className="text-xs text-gray-600">최장 {c.oldestDays}일</span>
            </div>
          </div>
        ))}
      </div>
      {data.length === 0 && <p className="text-center text-gray-500 py-4">미수금 없음</p>}
    </div>
  );
}
