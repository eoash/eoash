import KpiCard from "@/components/cards/KpiCard";
import { fetchFx } from "@/lib/sheets";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

export default async function FxPage() {
  let rates;
  try {
    rates = await fetchFx();
  } catch (error) {
    console.error("[FxPage] fetchFx failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">환율 (FX)</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  const krwRate = rates.find((r) => r.pair === "USD/KRW");
  const vndRate = rates.find((r) => r.pair === "USD/VND");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">환율 (FX)</h1>
        <span className="text-xs text-gray-500">
          {rates[0]?.date || "데이터 없음"}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="USD/KRW"
          value={krwRate?.rate ? `${formatNumber(krwRate.rate)}원` : "N/A"}
          subtitle="미국 달러 → 한국 원"
          trend={
            krwRate?.change
              ? { value: Math.abs(krwRate.change), isPositive: krwRate.change < 0 }
              : undefined
          }
        />
        <KpiCard
          title="USD/VND"
          value={vndRate?.rate ? `${formatNumber(vndRate.rate)}` : "N/A"}
          subtitle="미국 달러 → 베트남 동"
          trend={
            vndRate?.change
              ? { value: Math.abs(vndRate.change), isPositive: vndRate.change < 0 }
              : undefined
          }
        />
      </div>

      {/* Info */}
      <div className="rounded-xl bg-[#111111] border border-[#222] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">환율 정보</h3>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            환율 데이터는 Google Sheets의 Cash Position Summary에서 가져옵니다.
          </p>
          <p className="text-sm text-gray-400">
            실시간 환율 추이 차트는 외부 환율 API 연동 후 추가 예정입니다.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <h4 className="text-sm font-medium text-gray-300 mb-2">FX 알림 기준</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>USD/KRW 일일 변동: ±30원</div>
              <div>USD/KRW 주간 변동: ±100원</div>
              <div>USD/VND 일일 변동: ±200</div>
              <div>USD/VND 주간 변동: ±500</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
