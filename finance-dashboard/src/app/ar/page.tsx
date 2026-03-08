import KpiCard from "@/components/cards/KpiCard";
import ArAgingChart from "@/components/charts/ArAgingChart";
import ArClientChart from "@/components/charts/ArClientChart";
import ArTable from "@/components/charts/ArTable";
import { fetchAR } from "@/lib/sheets";
import { formatKRW } from "@/lib/utils";

export const revalidate = 300;

export default async function ArPage() {
  let data;
  try {
    data = await fetchAR();
  } catch (error) {
    console.error("[ArPage] fetchAR failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">A/R 현황</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  const {
    invoices,
    agingBuckets,
    clientSummaries,
    totalOutstanding,
    outstandingCount,
    avgCollectionDays,
    maxAgingDays,
  } = data;

  // 리스크 요약
  const redCount = clientSummaries.filter((c) => c.risk === "red").length;
  const orangeCount = clientSummaries.filter((c) => c.risk === "orange").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">A/R 현황</h1>
        <span className="text-xs text-gray-500">거래처별 미수금 / 회수기간 관리</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="미수금 합계"
          value={formatKRW(totalOutstanding)}
          subtitle={`${outstandingCount}건 미정산`}
          tooltip="정산일이 비어있는 건의 공급가액 합계. 확인필요·입금예정 포함"
        />
        <KpiCard
          title="평균 회수일수"
          value={`${avgCollectionDays}일`}
          subtitle="정산완료 건 기준"
          tooltip="실제 정산된 건들의 발급일→정산일 평균 소요일수"
        />
        <KpiCard
          title="최장 미수금"
          value={`${maxAgingDays}일`}
          subtitle="발급일 기준 경과일"
          tooltip="현재 미수금 중 가장 오래된 건의 발급일 기준 경과일수"
          trend={
            maxAgingDays > 60
              ? { value: maxAgingDays, isPositive: false }
              : undefined
          }
        />
        <KpiCard
          title="리스크 거래처"
          value={`${redCount + orangeCount}곳`}
          subtitle={`🔴 ${redCount}곳 · 🟠 ${orangeCount}곳`}
          tooltip="미수금 경과 31일 이상인 거래처 수. 🔴 60일+, 🟠 31-60일"
          trend={
            redCount > 0
              ? { value: redCount, isPositive: false }
              : undefined
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ArAgingChart data={agingBuckets} />
        </div>
        <div>
          <ArClientChart data={clientSummaries} />
        </div>
      </div>

      {/* Detail Table */}
      <ArTable invoices={invoices} />
    </div>
  );
}
