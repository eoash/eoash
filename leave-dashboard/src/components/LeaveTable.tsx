"use client";

import Link from "next/link";
import { LeaveBalance } from "@/lib/types";

interface Props {
  balances: LeaveBalance[];
}

function UsageBar({ rate }: { rate: number }) {
  const pct = Math.min(rate * 100, 100);
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function LeaveTable({ balances }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">소속</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">발생</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">사용</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">잔여</th>
            <th className="px-4 py-3 font-medium text-gray-600">사용률</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr
              key={b.employee.id}
              className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/member/${encodeURIComponent(b.employee.name)}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {b.employee.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500">{b.employee.company || "-"}</td>
              <td className="px-4 py-3 text-right text-gray-700">{b.entitled}일</td>
              <td className="px-4 py-3 text-right text-gray-700">{b.used}일</td>
              <td className="px-4 py-3 text-right">
                <span
                  className={`font-semibold ${
                    b.remaining <= 3
                      ? "text-red-600"
                      : b.remaining <= 5
                      ? "text-amber-600"
                      : "text-gray-900"
                  }`}
                >
                  {b.remaining}일
                </span>
              </td>
              <td className="px-4 py-3">
                <UsageBar rate={b.usageRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
