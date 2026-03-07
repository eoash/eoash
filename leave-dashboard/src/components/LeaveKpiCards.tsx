"use client";

import { LeaveBalance } from "@/lib/types";

interface Props {
  balances: LeaveBalance[];
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

export default function LeaveKpiCards({ balances }: Props) {
  const totalEmployees = balances.length;
  const avgUsageRate =
    balances.length > 0
      ? balances.reduce((s, b) => s + b.usageRate, 0) / balances.length
      : 0;
  const thisMonthUsed = balances.reduce((s, b) => {
    const now = new Date();
    const monthRecords = b.records.filter((r) => {
      const d = new Date(r.startDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.category === "연차" && !r.deleteRequested;
    });
    return s + monthRecords.reduce((rs, r) => rs + r.days, 0);
  }, 0);
  const lowRemaining = balances.filter((b) => b.remaining <= 5 && b.remaining >= 0).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard
        title="총 직원"
        value={`${totalEmployees}명`}
        sub="EO Team 기준"
      />
      <KpiCard
        title="평균 사용률"
        value={`${(avgUsageRate * 100).toFixed(0)}%`}
        sub="올해 연차 기준"
      />
      <KpiCard
        title="이번 달 사용"
        value={`${thisMonthUsed}일`}
        sub={`${new Date().getMonth() + 1}월`}
      />
      <KpiCard
        title="잔여 5일 이하"
        value={`${lowRemaining}명`}
        sub="연차 소진 주의"
      />
    </div>
  );
}
