import KpiCard from "@/components/cards/KpiCard";
import FxLiveChart from "@/components/charts/FxLiveChart";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

async function fetchFxData() {
  // exchangerate-api: 무료, KRW+VND 모두 지원
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
  });

  let latestKrw = 0;
  let latestVnd = 0;
  let lastUpdated = "";
  if (res.ok) {
    const data = await res.json();
    latestKrw = data.rates?.KRW || 0;
    latestVnd = data.rates?.VND || 0;
    lastUpdated = data.time_last_update_utc || "";
  }

  // Frankfurter: KRW 미지원 → ECB 데이터로 EUR 기준 추이만 사용 가능
  // 대안: exchangerate-api의 historical은 유료 → 시트 환율 데이터로 대체
  // 시트에서 월별 환율 이미 가져오므로, 여기서는 최신 환율만 표시

  return { latestKrw, latestVnd, lastUpdated };
}

export default async function FxPage() {
  let data;
  try {
    data = await fetchFxData();
  } catch (error) {
    console.error("[FxPage] fetchFx failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">환율 (FX)</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">환율 데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">외부 API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  const { latestKrw, latestVnd, lastUpdated } = data;
  const updateDate = lastUpdated ? new Date(lastUpdated).toLocaleDateString("ko-KR") : "";

  // Cash Position 시트 기준 환율 (₩1,460)과의 차이
  const sheetRate = 1460;
  const diff = latestKrw - sheetRate;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">환율 (FX)</h1>
        <span className="text-xs text-gray-500">
          실시간 · exchangerate-api 기준 · {updateDate}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="USD/KRW"
          value={latestKrw > 0 ? `${formatNumber(Math.round(latestKrw))}원` : "N/A"}
          subtitle="미국 달러 → 한국 원"
          tooltip="exchangerate-api 제공 실시간 USD/KRW 환율. 매일 갱신"
        />
        <KpiCard
          title="USD/VND"
          value={latestVnd > 0 ? formatNumber(Math.round(latestVnd)) : "N/A"}
          subtitle="미국 달러 → 베트남 동"
          tooltip="exchangerate-api 제공 실시간 USD/VND 환율"
        />
        <KpiCard
          title="시트 환율 차이"
          value={`${diff >= 0 ? "+" : ""}${Math.round(diff)}원`}
          subtitle={`시트 기준: ₩${formatNumber(sheetRate)}`}
          tooltip="Cash Position 시트의 기준 환율($1,460)과 현재 실시간 환율의 차이. 양수면 원화 약세"
          trend={diff !== 0 ? { value: Math.abs(Math.round(diff)), isPositive: diff < 0 } : undefined}
        />
        <KpiCard
          title="KRW/VND"
          value={latestKrw > 0 && latestVnd > 0 ? formatNumber(Math.round(latestVnd / latestKrw)) : "N/A"}
          subtitle="원 → 베트남 동 (크로스)"
          tooltip="USD/VND ÷ USD/KRW 로 계산한 크로스 환율. 1원당 베트남 동"
        />
      </div>

      {/* FX 알림 기준 */}
      <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">FX 모니터링</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <p className="text-xs text-gray-500 mb-2">USD/KRW 현재</p>
            <p className="text-2xl font-bold text-[#E8FF47]">
              {latestKrw > 0 ? `₩${formatNumber(Math.round(latestKrw))}` : "N/A"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {latestKrw > 1450 ? "🟡 고환율 구간 (원화 약세)" : latestKrw > 1350 ? "🟢 보통" : "🟢 저환율 구간 (원화 강세)"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <p className="text-xs text-gray-500 mb-2">USD/VND 현재</p>
            <p className="text-2xl font-bold text-[#E8FF47]">
              {latestVnd > 0 ? `₫${formatNumber(Math.round(latestVnd))}` : "N/A"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {latestVnd > 25500 ? "🟡 고환율 구간" : "🟢 보통"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <h4 className="text-xs text-gray-500 mb-2">FX 알림 기준</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <p>USD/KRW 일일 변동: ±30원</p>
              <p>USD/KRW 주간 변동: ±100원</p>
              <p>USD/VND 일일 변동: ±200</p>
              <p>USD/VND 주간 변동: ±500</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
