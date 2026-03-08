import KpiCard from "@/components/cards/KpiCard";
import CashRegionCard from "@/components/cards/CashRegionCard";
import { fetchCashPosition } from "@/lib/sheets";
import { formatKRW } from "@/lib/utils";

export const revalidate = 300;

export default async function CashPage() {
  let data;
  try {
    data = await fetchCashPosition();
  } catch (error) {
    console.error("[CashPage] fetchCashPosition failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Cash Position</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  const { regions, totalUsd: totalKrw } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cash Position</h1>
        <span className="text-xs text-gray-500">KRW 환산 기준</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Cash (KRW)"
          value={formatKRW(totalKrw)}
          subtitle="전 지역 합산"
          tooltip="한국·미국·베트남 3개 법인 현금 잔고의 KRW 환산 합계"
        />
        {regions.map((r) => (
          <KpiCard
            key={r.region}
            title={`${r.regionLabel}`}
            value={formatKRW(r.totalUsd)}
            subtitle="KRW 환산"
            tooltip={`${r.regionLabel} 법인의 최신 월말 잔고 (KRW 환산)`}
          />
        ))}
      </div>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {regions.map((r) => (
          <CashRegionCard key={r.region} data={r} />
        ))}
      </div>
    </div>
  );
}
