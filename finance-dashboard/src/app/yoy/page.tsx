import { fetchYoY } from "@/lib/sheets";
import { formatKRW, formatNumber } from "@/lib/utils";
import KpiCard from "@/components/cards/KpiCard";
import YoYChart from "@/components/charts/YoYChart";

export const revalidate = 300;

export default async function YoYPage() {
  let data;
  try {
    data = await fetchYoY();
  } catch (error) {
    console.error("[YoYPage] fetchYoY failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">YoY 매출 비교</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400">데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const yoyGrowth = prev && prev.total > 0 ? ((latest.total - prev.total) / prev.total) * 100 : 0;
  const cagr = data.length >= 2
    ? (Math.pow(latest.total / data[0].total, 1 / (data.length - 1)) - 1) * 100
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">YoY 매출 비교</h1>
        <span className="text-xs text-gray-500">2020 — {latest.year}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={`${latest.year} 매출`}
          value={formatKRW(latest.total)}
          subtitle={latest.target ? `목표: ${formatKRW(latest.target)}` : undefined}
          tooltip={`${latest.year} 연간 매출 합계`}
        />
        <KpiCard
          title="YoY 성장률"
          value={`${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth.toFixed(1)}%`}
          subtitle={prev ? `vs ${prev.year} ${formatKRW(prev.total)}` : undefined}
          tooltip="전년 대비 매출 성장률"
          trend={yoyGrowth !== 0 ? { value: Math.abs(Math.round(yoyGrowth)), isPositive: yoyGrowth > 0 } : undefined}
        />
        <KpiCard
          title="CAGR"
          value={`${cagr.toFixed(1)}%`}
          subtitle={`${data[0].year} — ${latest.year}`}
          tooltip="연평균 복합 성장률 (Compound Annual Growth Rate)"
        />
        <KpiCard
          title="인당 매출"
          value={formatKRW(latest.perPerson)}
          subtitle={`${latest.headcount}명 기준`}
          tooltip={`${latest.year} 총매출 / 인원수`}
          trend={prev && prev.perPerson > 0 ? {
            value: Math.abs(Math.round(((latest.perPerson - prev.perPerson) / prev.perPerson) * 100)),
            isPositive: latest.perPerson > prev.perPerson,
          } : undefined}
        />
      </div>

      <YoYChart data={data} />

      {/* 연도별 테이블 */}
      <div className="mt-6 rounded-xl bg-[#111111] border border-[#222] p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">연도별 상세</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left py-2 px-3 text-gray-500">연도</th>
              <th className="text-right py-2 px-3 text-gray-500">매출</th>
              <th className="text-right py-2 px-3 text-gray-500">YoY</th>
              <th className="text-right py-2 px-3 text-gray-500">인원</th>
              <th className="text-right py-2 px-3 text-gray-500">인당 매출</th>
              {latest.target && <th className="text-right py-2 px-3 text-gray-500">목표</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const prevRow = i > 0 ? data[i - 1] : null;
              const growth = prevRow && prevRow.total > 0 ? ((row.total - prevRow.total) / prevRow.total) * 100 : 0;
              return (
                <tr key={row.year} className="border-b border-[#111] hover:bg-white/5">
                  <td className="py-2 px-3 text-[#E8FF47] font-semibold">{row.year}</td>
                  <td className="py-2 px-3 text-right text-white font-mono">{formatKRW(row.total)}</td>
                  <td className={`py-2 px-3 text-right font-medium ${growth > 0 ? "text-green-400" : growth < 0 ? "text-red-400" : "text-gray-500"}`}>
                    {i > 0 ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-400">{row.headcount}명</td>
                  <td className="py-2 px-3 text-right text-gray-400 font-mono">{formatKRW(row.perPerson)}</td>
                  {latest.target && <td className="py-2 px-3 text-right text-gray-500">{row.target ? formatKRW(row.target) : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
