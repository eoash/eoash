"use client";

import React, { useState } from "react";
import type { ArInvoice } from "@/lib/types";
import { formatKRW } from "@/lib/utils";

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  green: { label: "정산완료", className: "bg-green-500/15 text-green-400" },
  yellow: { label: "0-30일", className: "bg-yellow-500/15 text-yellow-400" },
  orange: { label: "31-60일", className: "bg-orange-500/15 text-orange-400" },
  red: { label: "60일+", className: "bg-red-500/15 text-red-400" },
};

const STATUS_LABEL: Record<string, string> = {
  paid: "✅ 정산",
  unpaid: "⏳ 미수금",
  checking: "❓ 확인필요",
  scheduled: "📅 입금예정",
};

type Filter = "all" | "unpaid" | "checking" | "scheduled";

export default function ArTable({ invoices }: { invoices: ArInvoice[] }) {
  const [filter, setFilter] = useState<Filter>("unpaid");
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? invoices
      : filter === "unpaid"
        ? invoices.filter((inv) => inv.status !== "paid")
        : invoices.filter((inv) => inv.status === filter);

  // Group by month
  const months = [...new Set(filtered.map((inv) => inv.month))];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "unpaid", label: "미수금 전체", count: invoices.filter((i) => i.status !== "paid").length },
    { key: "checking", label: "확인필요", count: invoices.filter((i) => i.status === "checking").length },
    { key: "scheduled", label: "입금예정", count: invoices.filter((i) => i.status === "scheduled").length },
    { key: "all", label: "전체 (정산포함)", count: invoices.length },
  ];

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">거래처별 미수금 상세</h3>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-[#E8FF47]/15 text-[#E8FF47]"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">거래처</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">공급가액</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">품목</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">발급일</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">상태</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">리스크</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">비고</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const monthInvoices = filtered.filter((inv) => inv.month === month);
              const monthTotal = monthInvoices.reduce((s, inv) => s + inv.amount, 0);
              const isExpanded = expandedMonth === null || expandedMonth === month;

              return (
                <React.Fragment key={month}>
                  <tr
                    className="border-b border-[#1a1a1a] cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                  >
                    <td colSpan={2} className="py-2 px-3">
                      <span className="text-[#E8FF47] font-semibold">{month}</span>
                      <span className="text-gray-500 ml-2">({monthInvoices.length}건)</span>
                      <span className="text-gray-400 ml-2">{formatKRW(monthTotal)}</span>
                    </td>
                    <td colSpan={5} className="py-2 px-3 text-right text-gray-500 text-xs">
                      {isExpanded ? "▼" : "▶"}
                    </td>
                  </tr>
                  {isExpanded &&
                    monthInvoices.map((inv, j) => {
                      const badge = RISK_BADGE[inv.risk];
                      return (
                        <tr key={j} className="border-b border-[#111] hover:bg-white/3">
                          <td className="py-2 px-3 text-white">{inv.client}</td>
                          <td className="py-2 px-3 text-right text-white font-mono">
                            {formatKRW(inv.amount)}
                          </td>
                          <td className="py-2 px-3 text-gray-400 max-w-[200px] truncate">
                            {inv.description}
                          </td>
                          <td className="py-2 px-3 text-center text-gray-400 text-xs">
                            {inv.invoiceDate}
                          </td>
                          <td className="py-2 px-3 text-center text-xs">
                            {STATUS_LABEL[inv.status]}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                            >
                              {inv.status === "paid" ? badge.label : `${inv.agingDays}일`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{inv.note}</td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">해당 조건의 데이터가 없습니다</p>
      )}
    </div>
  );
}
