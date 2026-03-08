"use client";

import { WITHTAX_EXPENSES_2025 } from "@/lib/withtax-data";

const data = WITHTAX_EXPENSES_2025.slice(0, 10);
const maxAmount = data[0].amount;

const BAR_COLORS = [
  "#FF6B6B", "#F87171", "#FB923C", "#FBBF24", "#FDE68A",
  "#A3E635", "#6EE7B7", "#5EEAD4", "#7DD3FC", "#A78BFA",
];

function fmt(v: number) {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  return `${(v / 1e4).toFixed(0)}만`;
}

export default function ExpenseTop10Chart() {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">판관비 TOP 10</h3>
      <p className="mb-3 text-xs text-gray-500">2025년 판관비 상위 10개 항목</p>
      <div className="flex flex-col gap-2.5 mt-4">
        {data.map((item, i) => (
          <div key={item.name} className="group relative">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-[100px] text-right shrink-0 truncate">
                {item.name}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 relative h-[26px] bg-[#1a1a1a] rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(item.amount / maxAmount) * 100}%`,
                      backgroundColor: BAR_COLORS[i],
                    }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 w-[100px]">
                  {fmt(item.amount)} ({item.ratio}%)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
