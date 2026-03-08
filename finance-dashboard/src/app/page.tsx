import KpiCard from "@/components/cards/KpiCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import RevenueSegmentChart from "@/components/charts/RevenueSegmentChart";
import RevenueDetailTable from "@/components/charts/RevenueDetailTable";
import { fetchRevenue } from "@/lib/sheets";
import { formatKRW, formatPercent } from "@/lib/utils";

export const revalidate = 300;

export default async function RevenuePage() {
  let data;
  try {
    data = await fetchRevenue();
  } catch (error) {
    console.error("[RevenuePage] fetchRevenue failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">매출 현황</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">
            Google Sheets API 연결을 확인해주세요
          </p>
        </div>
      </div>
    );
  }

  const { monthly, months, segments, segmentDetails, totalActual, totalTarget } = data;
  const achievementRate = totalTarget > 0 ? totalActual / totalTarget : 0;

  // MoM growth (last 2 months with data)
  const monthsWithData = monthly.filter((m) => m.actual > 0);
  let momGrowth = 0;
  if (monthsWithData.length >= 2) {
    const current = monthsWithData[monthsWithData.length - 1].actual;
    const previous = monthsWithData[monthsWithData.length - 2].actual;
    momGrowth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  // Top segment
  const topSegment = segments[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">매출 현황</h1>
        <span className="text-xs text-gray-500">2026년 기준</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="총 매출"
          value={formatKRW(totalActual)}
          subtitle="2026 YTD"
          tooltip="올해 1월부터 현재까지 전 사업부 매출 합계"
        />
        <KpiCard
          title="데이터 월수"
          value={`${monthsWithData.length}개월`}
          subtitle={`총 ${monthly.length}개월 중`}
          tooltip="실적 데이터가 입력된 월 수. 0원인 미래 월은 제외"
        />
        <KpiCard
          title="달성률"
          value={totalTarget > 0 ? formatPercent(achievementRate) : "목표 미설정"}
          subtitle="목표 대비 실적"
          tooltip="연간 목표 대비 실적 비율. 목표 시트 미연동 시 '목표 미설정' 표시"
          trend={
            achievementRate > 0
              ? { value: Math.round(achievementRate * 100), isPositive: achievementRate >= 1 }
              : undefined
          }
        />
        <KpiCard
          title="MoM 성장률"
          value={`${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%`}
          subtitle="전월 대비 (데이터 있는 월)"
          tooltip="실적이 있는 직전 2개월을 비교한 전월 대비 증감률"
          trend={
            momGrowth !== 0
              ? { value: Math.abs(Math.round(momGrowth)), isPositive: momGrowth > 0 }
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueTrendChart details={segmentDetails} months={months} />
        </div>
        <div>
          <RevenueSegmentChart data={segments} />
        </div>
      </div>

      {/* Revenue Detail Table */}
      {segmentDetails.length > 0 && (
        <RevenueDetailTable details={segmentDetails} months={months} />
      )}
    </div>
  );
}
