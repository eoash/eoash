import { fetchRevenue, fetchCashPosition, fetchAR } from "@/lib/sheets";
import KpiCard from "@/components/cards/KpiCard";
import DataFreshness from "@/components/common/DataFreshness";
import { formatKRW, formatCompactKRW } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 300;

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      <Link href={href} className="text-xs text-[#00E87A] hover:underline">자세히 →</Link>
    </div>
  );
}

export default async function OverviewPage() {
  const year = 2026;
  const fetchedAt = new Date().toISOString();

  const [revenueResult, cashResult, arResult] = await Promise.allSettled([
    fetchRevenue(year),
    fetchCashPosition(year),
    fetchAR(),
  ]);

  const revenue = revenueResult.status === "fulfilled" ? revenueResult.value : null;
  const cash = cashResult.status === "fulfilled" ? cashResult.value : null;
  const ar = arResult.status === "fulfilled" ? arResult.value : null;

  // Revenue KPIs
  const revTotal = revenue?.totalActual ?? 0;
  const revTarget = revenue?.totalTarget ?? 0;
  const revAchievement = revTarget > 0 ? (revTotal / revTarget) * 100 : 0;
  const monthsWithData = revenue?.monthly.filter((m) => m.actual > 0) ?? [];
  let momGrowth = 0;
  if (monthsWithData.length >= 2) {
    const curr = monthsWithData[monthsWithData.length - 1].actual;
    const prev = monthsWithData[monthsWithData.length - 2].actual;
    momGrowth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  // Cash KPIs
  const latestCash = cash?.monthlyData.filter((m) => m.totalBalanceKrw > 0).at(-1);
  const totalCash = latestCash?.totalBalanceKrw ?? 0;
  const runway = cash?.runway ?? 0;
  const burnRate = cash?.burnRate ?? 0;

  // AR KPIs
  const unpaid = ar?.invoices.filter((i) => i.status !== "paid") ?? [];
  const totalOutstanding = unpaid.reduce((s, i) => s + i.amount, 0);
  const atRiskClients = new Set(
    unpaid.filter((i) => i.risk === "orange" || i.risk === "red").map((i) => i.client)
  ).size;
  const oldestDays = unpaid.length > 0 ? Math.max(...unpaid.map((i) => i.agingDays)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Overview</h1>
      </div>
      <DataFreshness fetchedAt={fetchedAt} />

      {/* Revenue */}
      <div className="mb-8">
        <SectionTitle title="매출 현황" href="/" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            title="YTD 매출"
            value={formatCompactKRW(revTotal)}
            subtitle={`${year}년 누적`}
            tooltip="올해 1월부터 현재까지 전 사업부 매출 합계"
          />
          <KpiCard
            title="목표 달성률"
            value={revTarget > 0 ? `${revAchievement.toFixed(1)}%` : "미설정"}
            subtitle="연간 목표 대비"
            tooltip="연간 매출 목표 대비 실적 비율"
          />
          <KpiCard
            title="MoM 성장률"
            value={`${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%`}
            subtitle="전월 대비"
            trend={monthsWithData.length >= 2 ? { value: Math.abs(momGrowth), isPositive: momGrowth >= 0 } : undefined}
          />
        </div>
      </div>

      {/* Cash */}
      <div className="mb-8">
        <SectionTitle title="Cash Position" href="/cash" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            title="Total Cash"
            value={formatCompactKRW(totalCash)}
            subtitle="전 법인 합산"
            tooltip="한국·미국·베트남 3개 법인 현금 잔고 합계"
          />
          <KpiCard
            title="Runway"
            value={runway > 0 ? `${runway.toFixed(1)}개월` : "-"}
            subtitle="현재 잔고 기준"
            tooltip="현재 잔고를 월평균 지출로 나눈 운영 가능 개월수"
          />
          <KpiCard
            title="월 Burn Rate"
            value={formatCompactKRW(burnRate)}
            subtitle="월평균 지출"
            tooltip="데이터가 있는 월의 총 지출 평균"
          />
        </div>
      </div>

      {/* A/R */}
      <div className="mb-8">
        <SectionTitle title="A/R 현황" href="/ar" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            title="미수금 합계"
            value={formatKRW(totalOutstanding)}
            subtitle="미정산 인보이스"
            tooltip="정산일이 비어있는 건의 공급가액 합계"
          />
          <KpiCard
            title="리스크 거래처"
            value={`${atRiskClients}개`}
            subtitle="31일+ 미수금"
            tooltip="미수금 경과 31일 이상인 거래처 수"
          />
          <KpiCard
            title="최장 미수금"
            value={`${oldestDays}일`}
            subtitle="발급일 기준 경과"
            tooltip="현재 미수금 중 가장 오래된 건의 경과일수"
          />
        </div>
      </div>
    </div>
  );
}
