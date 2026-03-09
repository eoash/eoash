"use client";

import React, { useState } from "react";
import type { ArInvoice } from "@/lib/types";
import { formatKRW } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

const RISK_BADGE_CLASS: Record<string, string> = {
  green: "bg-green-500/15 text-green-400",
  yellow: "bg-yellow-500/15 text-yellow-400",
  orange: "bg-orange-500/15 text-orange-400",
  red: "bg-red-500/15 text-red-400",
};

type Filter = "all" | "unpaid" | "checking" | "scheduled";

export default function ArTable({ invoices }: { invoices: ArInvoice[] }) {
  const { t } = useT();
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

  const riskBadgeLabel: Record<string, string> = {
    green: t("ar.risk.green"),
    yellow: t("ar.risk.yellow"),
    orange: t("ar.risk.orange"),
    red: t("ar.risk.red"),
  };

  const statusLabel: Record<string, string> = {
    paid: t("ar.status.paid"),
    unpaid: t("ar.status.unpaid"),
    checking: t("ar.status.checking"),
    scheduled: t("ar.status.scheduled"),
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "unpaid", label: t("ar.table.filterUnpaid"), count: invoices.filter((i) => i.status !== "paid").length },
    { key: "checking", label: t("ar.table.filterChecking"), count: invoices.filter((i) => i.status === "checking").length },
    { key: "scheduled", label: t("ar.table.filterScheduled"), count: invoices.filter((i) => i.status === "scheduled").length },
    { key: "all", label: t("ar.table.filterAll"), count: invoices.length },
  ];

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">{t("ar.table.title")}</h3>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-[#00E87A]/15 text-[#00E87A]"
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
              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t("ar.table.client")}</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">{t("ar.table.amount")}</th>
              <th className="hidden md:table-cell text-left py-2 px-3 text-gray-500 font-medium">{t("ar.table.item")}</th>
              <th className="hidden md:table-cell text-center py-2 px-3 text-gray-500 font-medium">{t("ar.table.date")}</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">{t("ar.table.status")}</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">{t("ar.table.risk")}</th>
              <th className="hidden md:table-cell text-left py-2 px-3 text-gray-500 font-medium">{t("ar.table.note")}</th>
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
                      <span className="text-[#00E87A] font-semibold">{month}</span>
                      <span className="text-gray-500 ml-2">({monthInvoices.length}{t("common.count")})</span>
                      <span className="text-gray-400 ml-2">{formatKRW(monthTotal)}</span>
                    </td>
                    <td colSpan={5} className="py-2 px-3 text-right text-gray-500 text-xs">
                      {isExpanded ? "▼" : "▶"}
                    </td>
                  </tr>
                  {isExpanded &&
                    monthInvoices.map((inv, j) => {
                      const badgeClass = RISK_BADGE_CLASS[inv.risk];
                      return (
                        <tr key={j} className="border-b border-[#111] hover:bg-white/3">
                          <td className="py-2 px-3 text-white">{inv.client}</td>
                          <td className="py-2 px-3 text-right text-white font-mono">
                            {formatKRW(inv.amount)}
                          </td>
                          <td className="hidden md:table-cell py-2 px-3 text-gray-400 max-w-[200px] truncate">
                            {inv.description}
                          </td>
                          <td className="hidden md:table-cell py-2 px-3 text-center text-gray-400 text-xs">
                            {inv.invoiceDate}
                          </td>
                          <td className="py-2 px-3 text-center text-xs">
                            {statusLabel[inv.status]}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                            >
                              {inv.status === "paid" ? riskBadgeLabel[inv.risk] : `${inv.agingDays}${t("common.days")}`}
                            </span>
                          </td>
                          <td className="hidden md:table-cell py-2 px-3 text-gray-500 text-xs">{inv.note}</td>
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
        <p className="text-center text-gray-500 py-8">{t("ar.table.noData")}</p>
      )}
    </div>
  );
}
