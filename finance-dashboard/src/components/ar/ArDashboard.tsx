"use client";

import { useState, useEffect, useMemo } from "react";
import KpiCard from "@/components/cards/KpiCard";
import ArAgingChart from "@/components/charts/ArAgingChart";
import ArClientChart from "@/components/charts/ArClientChart";
import ArTable from "@/components/charts/ArTable";
import { formatKRW } from "@/lib/utils";
import type { ArInvoice, ArAgingBucket, ArClientSummary } from "@/lib/types";
import { useT } from "@/lib/contexts/LanguageContext";

/** "1월" → 1, "12월" → 12 */
function monthToNum(m: string): number {
  return parseInt(m.replace("월", ""), 10) || 0;
}

interface Props {
  invoices: ArInvoice[];
}

export default function ArDashboard({ invoices }: Props) {
  const { t } = useT();
  const allMonths = useMemo(() => {
    const set = new Set(invoices.map((inv) => inv.month));
    return [...set].sort((a, b) => monthToNum(a) - monthToNum(b));
  }, [invoices]);

  const [startMonth, setStartMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ar-start-month");
      if (saved && allMonths.includes(saved)) return saved;
    }
    return allMonths[0] ?? "1월";
  });
  const [endMonth, setEndMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ar-end-month");
      if (saved && allMonths.includes(saved)) return saved;
    }
    return allMonths[allMonths.length - 1] ?? "12월";
  });

  useEffect(() => {
    localStorage.setItem("ar-start-month", startMonth);
  }, [startMonth]);

  useEffect(() => {
    localStorage.setItem("ar-end-month", endMonth);
  }, [endMonth]);

  const filtered = useMemo(() => {
    const s = monthToNum(startMonth);
    const e = monthToNum(endMonth);
    return invoices.filter((inv) => {
      const m = monthToNum(inv.month);
      return m >= s && m <= e;
    });
  }, [invoices, startMonth, endMonth]);

  // KPI 재계산
  const stats = useMemo(() => {
    const today = new Date();
    const outstanding = filtered.filter((inv) => inv.status !== "paid");
    const paid = filtered.filter((inv) => inv.status === "paid");

    const totalOutstanding = outstanding.reduce((s, inv) => s + inv.amount, 0);
    const outstandingCount = outstanding.length;
    const maxAgingDays = outstanding.length > 0 ? Math.max(...outstanding.map((inv) => inv.agingDays)) : 0;

    const paidWithDays = paid.filter((inv) => inv.collectionDays > 0);
    const avgCollectionDays =
      paidWithDays.length > 0
        ? Math.round(paidWithDays.reduce((s, inv) => s + inv.collectionDays, 0) / paidWithDays.length)
        : 0;

    // Aging buckets
    const bucketDefs = [
      { label: t("ar.aging.0_30"), min: 0, max: 30, color: "#00E87A" },
      { label: t("ar.aging.31_60"), min: 31, max: 60, color: "#F59E0B" },
      { label: t("ar.aging.61_90"), min: 61, max: 90, color: "#F97316" },
      { label: t("ar.aging.90plus"), min: 91, max: Infinity, color: "#EF4444" },
    ];
    const agingBuckets: ArAgingBucket[] = bucketDefs.map((b) => {
      const items = outstanding.filter((inv) => inv.agingDays >= b.min && inv.agingDays <= b.max);
      return { label: b.label, count: items.length, amount: items.reduce((s, inv) => s + inv.amount, 0), color: b.color };
    });

    // Client summaries
    const clientMap = new Map<string, { total: number; count: number; maxDays: number }>();
    for (const inv of outstanding) {
      const cur = clientMap.get(inv.client) || { total: 0, count: 0, maxDays: 0 };
      cur.total += inv.amount;
      cur.count += 1;
      cur.maxDays = Math.max(cur.maxDays, inv.agingDays);
      clientMap.set(inv.client, cur);
    }
    const clientSummaries: ArClientSummary[] = Array.from(clientMap.entries())
      .map(([client, data]) => ({
        client,
        totalOutstanding: data.total,
        invoiceCount: data.count,
        oldestDays: data.maxDays,
        risk: (data.maxDays <= 30 ? "yellow" : data.maxDays <= 60 ? "orange" : "red") as "yellow" | "orange" | "red",
      }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const redCount = clientSummaries.filter((c) => c.risk === "red").length;
    const orangeCount = clientSummaries.filter((c) => c.risk === "orange").length;

    return { totalOutstanding, outstandingCount, avgCollectionDays, maxAgingDays, agingBuckets, clientSummaries, redCount, orangeCount };
  }, [filtered, t]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("ar.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#00E87A]/50"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-gray-500">~</span>
          <select
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#00E87A]/50"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-1">{t("ar.subtitle")}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={t("ar.outstanding")}
          value={formatKRW(stats.totalOutstanding)}
          subtitle={`${stats.outstandingCount}${t("common.count")}`}
          tooltip={t("ar.outstanding.tip")}
        />
        <KpiCard
          title={t("ar.avgDays")}
          value={`${stats.avgCollectionDays}${t("common.days")}`}
          subtitle={t("ar.avgDays.sub")}
          tooltip={t("ar.avgDays.tip")}
        />
        <KpiCard
          title={t("ar.oldest")}
          value={`${stats.maxAgingDays}${t("common.days")}`}
          subtitle={t("ar.oldest.sub")}
          tooltip={t("ar.oldest.tip")}
          trend={stats.maxAgingDays > 60 ? { value: stats.maxAgingDays, isPositive: false } : undefined}
        />
        <KpiCard
          title={t("ar.riskClients")}
          value={`${stats.redCount + stats.orangeCount}${t("common.places")}`}
          subtitle={`🔴 ${stats.redCount}${t("common.places")} · 🟠 ${stats.orangeCount}${t("common.places")}`}
          tooltip={t("ar.riskClients.tip")}
          trend={stats.redCount > 0 ? { value: stats.redCount, isPositive: false } : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ArAgingChart data={stats.agingBuckets} />
        </div>
        <div>
          <ArClientChart data={stats.clientSummaries} />
        </div>
      </div>

      {/* Detail Table */}
      <ArTable invoices={filtered} />
    </div>
  );
}
