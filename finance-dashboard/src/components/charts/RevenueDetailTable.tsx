"use client";

import { useState, Fragment } from "react";
import type { RevenueSegmentDetail } from "@/lib/types";

const SEGMENT_COLORS: Record<string, string> = {
  "KR 한국": "#E8FF47",
  "플래닛 한국": "#47B8FF",
  "GL 글로벌": "#34D399",
};

function formatAmount(n: number): string {
  if (n === 0) return "-";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

interface Props {
  details: RevenueSegmentDetail[];
  months: string[];
}

export default function RevenueDetailTable({ details, months }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(details.map((d) => d.segment)));

  const toggle = (seg: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return next;
    });
  };

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">사업부별 매출 상세</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333]">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium w-40">항목</th>
              {months.map((m) => (
                <th key={m} className="text-right py-2 px-2 text-gray-500 font-medium min-w-[72px]">
                  {m}
                </th>
              ))}
              <th className="text-right py-2 pl-3 text-gray-500 font-medium min-w-[80px]">합계</th>
            </tr>
          </thead>
          <tbody>
            {details.map((seg) => {
              const isOpen = expanded.has(seg.segment);
              const color = SEGMENT_COLORS[seg.segment] || "#999";

              return (
                <Fragment key={seg.segment}>
                  {/* 사업부 소계 행 */}
                  <tr
                    className="border-b border-[#222] cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggle(seg.segment)}
                  >
                    <td className="py-2.5 pr-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-gray-500 text-xs">{isOpen ? "▼" : "▶"}</span>
                        {seg.segment}
                      </div>
                    </td>
                    {seg.subtotal.map((v, i) => (
                      <td key={i} className="text-right py-2.5 px-2 font-semibold text-white">
                        {formatAmount(v)}
                      </td>
                    ))}
                    <td className="text-right py-2.5 pl-3 font-bold" style={{ color }}>
                      {formatAmount(seg.total)}
                    </td>
                  </tr>

                  {/* 세부 항목 */}
                  {isOpen &&
                    seg.items.map((item) => (
                      <tr
                        key={item.name}
                        className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2 pr-4 pl-8 text-gray-400">{item.name}</td>
                        {item.monthly.map((v, i) => (
                          <td key={i} className="text-right py-2 px-2 text-gray-400">
                            {formatAmount(v)}
                          </td>
                        ))}
                        <td className="text-right py-2 pl-3 text-gray-300">
                          {formatAmount(item.total)}
                        </td>
                      </tr>
                    ))}

                  {/* 인당 매출 행 */}
                  {isOpen && seg.headcount.some((h) => h > 0) && (
                    <tr className="border-b border-[#222]">
                      <td className="py-2 pr-4 pl-8 text-gray-600 text-xs">
                        인당 매출 ({seg.headcount.find((h) => h > 0)}명)
                      </td>
                      {seg.perPerson.map((v, i) => (
                        <td key={i} className="text-right py-2 px-2 text-gray-600 text-xs">
                          {formatAmount(v)}
                        </td>
                      ))}
                      <td className="text-right py-2 pl-3 text-gray-600 text-xs">-</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
