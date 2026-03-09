"use client";

import { useState, useMemo, useEffect } from "react";
import KpiCard from "@/components/cards/KpiCard";
import { formatKRW } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";
import type { ArInvoice, ClientRevenue } from "@/lib/types";

function aggregateClients(invoices: ArInvoice[]): ClientRevenue[] {
  const map = new Map<string, ClientRevenue>();
  for (const inv of invoices) {
    const cur = map.get(inv.client) || {
      client: inv.client, totalAmount: 0, invoiceCount: 0,
      paidAmount: 0, unpaidAmount: 0, paidCount: 0, unpaidCount: 0, avgCollectionDays: 0,
    };
    cur.totalAmount += inv.amount;
    cur.invoiceCount += 1;
    if (inv.status === "paid") {
      cur.paidAmount += inv.amount;
      cur.paidCount += 1;
      cur.avgCollectionDays += inv.collectionDays;
    } else {
      cur.unpaidAmount += inv.amount;
      cur.unpaidCount += 1;
    }
    map.set(inv.client, cur);
  }
  return Array.from(map.values())
    .map((c) => ({ ...c, avgCollectionDays: c.paidCount > 0 ? Math.round(c.avgCollectionDays / c.paidCount) : 0 }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

function extractYear(dateStr: string): number {
  const m = dateStr.match(/^(\d{4})/);
  return m ? parseInt(m[1]) : 0;
}

export default function ClientsDashboard({ invoices }: { invoices: ArInvoice[] }) {
  const { t } = useT();

  // 연도 목록 추출
  const years = useMemo(() => {
    const s = new Set<number>();
    for (const inv of invoices) {
      const y = extractYear(inv.invoiceDate);
      if (y > 2000) s.add(y);
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [invoices]);

  const [selectedYear, setSelectedYear] = useState(() => years[0] || new Date().getFullYear());

  // 연도 필터 적용된 인보이스
  const yearFiltered = useMemo(() =>
    invoices.filter((inv) => extractYear(inv.invoiceDate) === selectedYear),
    [invoices, selectedYear]
  );

  // 연도 필터 적용 후 월 목록
  const yearMonths = useMemo(() => {
    const s = new Set<string>();
    for (const inv of yearFiltered) if (inv.month) s.add(inv.month);
    return Array.from(s).sort((a, b) => parseInt(a) - parseInt(b));
  }, [yearFiltered]);

  const [startMonth, setStartMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-start-month");
      if (saved && yearMonths.includes(saved)) return saved;
    }
    return yearMonths[0] ?? "";
  });
  const [endMonth, setEndMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-end-month");
      if (saved && yearMonths.includes(saved)) return saved;
    }
    return yearMonths[yearMonths.length - 1] ?? "";
  });

  // 연도 변경 시 월 필터 리셋
  useEffect(() => {
    setStartMonth(yearMonths[0] ?? "");
    setEndMonth(yearMonths[yearMonths.length - 1] ?? "");
  }, [selectedYear, yearMonths]);

  useEffect(() => { localStorage.setItem("clients-start-month", startMonth); }, [startMonth]);
  useEffect(() => { localStorage.setItem("clients-end-month", endMonth); }, [endMonth]);

  const filtered = useMemo(() => {
    const si = yearMonths.indexOf(startMonth);
    const ei = yearMonths.indexOf(endMonth);
    if (si < 0 || ei < 0) return yearFiltered;
    const validMonths = new Set(yearMonths.slice(Math.min(si, ei), Math.max(si, ei) + 1));
    return yearFiltered.filter((inv) => validMonths.has(inv.month));
  }, [yearFiltered, yearMonths, startMonth, endMonth]);

  const clients = useMemo(() => aggregateClients(filtered), [filtered]);

  const totalRevenue = clients.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = clients.reduce((s, c) => s + c.paidAmount, 0);
  const totalUnpaid = clients.reduce((s, c) => s + c.unpaidAmount, 0);
  const avgDays = clients.filter((c) => c.avgCollectionDays > 0);
  const overallAvgDays = avgDays.length > 0 ? Math.round(avgDays.reduce((s, c) => s + c.avgCollectionDays, 0) / avgDays.length) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#E8FF47] cursor-pointer">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-gray-500">{t("clients.subtitle.source")}</span>
          <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#E8FF47] cursor-pointer">
            {yearMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="text-gray-500">~</span>
          <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)}
            className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#E8FF47] cursor-pointer">
            {yearMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard title={t("clients.totalRevenue")} value={formatKRW(totalRevenue)} subtitle={`${clients.length} ${t("common.places")}`} tooltip={t("clients.totalRevenue.tip")} />
        <KpiCard title={t("clients.settled")} value={formatKRW(totalPaid)} subtitle={totalRevenue > 0 ? `${Math.round((totalPaid / totalRevenue) * 100)}%` : "0%"} tooltip={t("clients.settled.tip")} />
        <KpiCard title={t("clients.outstanding")} value={formatKRW(totalUnpaid)} subtitle={`${clients.filter((c) => c.unpaidCount > 0).length} ${t("common.places")}`} tooltip={t("clients.outstanding.tip")} trend={totalUnpaid > 0 ? { value: Math.round((totalUnpaid / totalRevenue) * 100), isPositive: false } : undefined} />
        <KpiCard title={t("clients.avgDays")} value={`${overallAvgDays}${t("common.days")}`} subtitle={t("clients.avgDays.sub")} tooltip={t("clients.avgDays.tip")} />
      </div>

      {/* Client Table */}
      <div className="rounded-xl bg-[#111111] border border-[#222] p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("clients.table.title")} ({clients.length}{t("common.places")})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left py-2 px-3 text-gray-500">{t("clients.table.rank")}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t("clients.table.client")}</th>
              <th className="text-right py-2 px-3 text-gray-500">{t("clients.table.revenue")}</th>
              <th className="text-right py-2 px-3 text-gray-500">{t("clients.table.count")}</th>
              <th className="text-center py-2 px-3 text-gray-500">{t("clients.table.status")}</th>
              <th className="text-right py-2 px-3 text-gray-500">{t("clients.table.outstanding")}</th>
              <th className="hidden md:table-cell text-right py-2 px-3 text-gray-500">{t("clients.table.days")}</th>
              <th className="hidden md:table-cell text-right py-2 px-3 text-gray-500">{t("clients.table.share")}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => {
              const pct = totalRevenue > 0 ? (c.totalAmount / totalRevenue) * 100 : 0;
              return (
                <tr key={c.client} className="border-b border-[#111] hover:bg-white/5">
                  <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                  <td className="py-2 px-3 text-white max-w-[200px] truncate">{c.client}</td>
                  <td className="py-2 px-3 text-right text-white font-mono">{formatKRW(c.totalAmount)}</td>
                  <td className="py-2 px-3 text-right text-gray-400">{c.invoiceCount}{t("common.count")}</td>
                  <td className="py-2 px-3 text-center">
                    {c.unpaidCount === 0 ? (
                      <span className="text-green-400 text-xs">{t("clients.table.allSettled")}</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">{c.paidCount}/{c.invoiceCount}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {c.unpaidAmount > 0 ? (
                      <span className="text-red-400 font-mono">{formatKRW(c.unpaidAmount)}</span>
                    ) : (
                      <span className="text-gray-600">&mdash;</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell py-2 px-3 text-right text-gray-400">{c.avgCollectionDays > 0 ? `${c.avgCollectionDays}${t("common.days")}` : "—"}</td>
                  <td className="hidden md:table-cell py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#E8FF47] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
