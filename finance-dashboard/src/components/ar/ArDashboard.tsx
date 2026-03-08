"use client";

import { useState, useMemo } from "react";
import KpiCard from "@/components/cards/KpiCard";
import ArAgingChart from "@/components/charts/ArAgingChart";
import ArClientChart from "@/components/charts/ArClientChart";
import ArTable from "@/components/charts/ArTable";
import { formatKRW } from "@/lib/utils";
import type { ArInvoice, ArAgingBucket, ArClientSummary } from "@/lib/types";

/** "1월" → 1, "12월" → 12 */
function monthToNum(m: string): number {
  return parseInt(m.replace("월", ""), 10) || 0;
}

interface Props {
  invoices: ArInvoice[];
}

export default function ArDashboard({ invoices }: Props) {
  const allMonths = useMemo(() => {
    const set = new Set(invoices.map((inv) => inv.month));
    return [...set].sort((a, b) => monthToNum(a) - monthToNum(b));
  }, [invoices]);

  const [startMonth, setStartMonth] = useState(allMonths[0] ?? "1월");
  const [endMonth, setEndMonth] = useState(allMonths[allMonths.length - 1] ?? "12월");

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
      { label: "0-30일", min: 0, max: 30, color: "#E8FF47" },
      { label: "31-60일", min: 31, max: 60, color: "#F59E0B" },
      { label: "61-90일", min: 61, max: 90, color: "#F97316" },
      { label: "90일+", min: 91, max: Infinity, color: "#EF4444" },
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
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">A/R 현황</h1>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#E8FF47]/50"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-gray-500">~</span>
          <select
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#E8FF47]/50"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-1">거래처별 미수금 / 회수기간 관리</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title="미수금 합계"
          value={formatKRW(stats.totalOutstanding)}
          subtitle={`${stats.outstandingCount}건 미정산`}
          tooltip="정산일이 비어있는 건의 공급가액 합계. 확인필요·입금예정 포함"
        />
        <KpiCard
          title="평균 회수일수"
          value={`${stats.avgCollectionDays}일`}
          subtitle="정산완료 건 기준"
          tooltip="실제 정산된 건들의 발급일→정산일 평균 소요일수"
        />
        <KpiCard
          title="최장 미수금"
          value={`${stats.maxAgingDays}일`}
          subtitle="발급일 기준 경과일"
          tooltip="현재 미수금 중 가장 오래된 건의 발급일 기준 경과일수"
          trend={stats.maxAgingDays > 60 ? { value: stats.maxAgingDays, isPositive: false } : undefined}
        />
        <KpiCard
          title="리스크 거래처"
          value={`${stats.redCount + stats.orangeCount}곳`}
          subtitle={`🔴 ${stats.redCount}곳 · 🟠 ${stats.orangeCount}곳`}
          tooltip="미수금 경과 31일 이상인 거래처 수. 🔴 60일+, 🟠 31-60일"
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
