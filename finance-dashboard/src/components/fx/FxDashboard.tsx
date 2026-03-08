"use client";

import KpiCard from "@/components/cards/KpiCard";
import { formatNumber } from "@/lib/utils";
import { useT } from "@/lib/contexts/LanguageContext";

interface FxData {
  latestKrw: number;
  latestVnd: number;
  lastUpdated: string;
}

export default function FxDashboard({ data }: { data: FxData }) {
  const { t } = useT();

  const { latestKrw, latestVnd, lastUpdated } = data;
  const updateDate = lastUpdated ? new Date(lastUpdated).toLocaleDateString("ko-KR") : "";

  // Cash Position 시트 기준 환율 (₩1,460)과의 차이
  const sheetRate = 1460;
  const diff = latestKrw - sheetRate;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("fx.title")}</h1>
        <span className="text-xs text-gray-500">
          {t("fx.subtitle.prefix")}{updateDate}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard
          title={t("fx.usdkrw")}
          value={latestKrw > 0 ? `${formatNumber(Math.round(latestKrw))}${t("common.won")}` : "N/A"}
          subtitle={t("fx.usdkrw.sub")}
          tooltip={t("fx.usdkrw.tip")}
        />
        <KpiCard
          title={t("fx.usdvnd")}
          value={latestVnd > 0 ? formatNumber(Math.round(latestVnd)) : "N/A"}
          subtitle={t("fx.usdvnd.sub")}
          tooltip={t("fx.usdvnd.tip")}
        />
        <KpiCard
          title={t("fx.sheetDiff")}
          value={`${diff >= 0 ? "+" : ""}${Math.round(diff)}${t("common.won")}`}
          subtitle={`${t("common.basis")}: ₩${formatNumber(sheetRate)}`}
          tooltip={t("fx.sheetDiff.tip")}
          trend={diff !== 0 ? { value: Math.abs(Math.round(diff)), isPositive: diff < 0 } : undefined}
        />
        <KpiCard
          title={t("fx.krwvnd")}
          value={latestKrw > 0 && latestVnd > 0 ? formatNumber(Math.round(latestVnd / latestKrw)) : "N/A"}
          subtitle={t("fx.krwvnd.sub")}
          tooltip={t("fx.krwvnd.tip")}
        />
      </div>

      {/* FX Monitoring */}
      <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">{t("fx.monitoring")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <p className="text-xs text-gray-500 mb-2">USD/KRW {t("fx.current")}</p>
            <p className="text-2xl font-bold text-[#E8FF47]">
              {latestKrw > 0 ? `₩${formatNumber(Math.round(latestKrw))}` : "N/A"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {latestKrw > 1450 ? t("fx.highRange") : latestKrw > 1350 ? t("fx.normalRange") : t("fx.lowRange")}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <p className="text-xs text-gray-500 mb-2">USD/VND {t("fx.current")}</p>
            <p className="text-2xl font-bold text-[#E8FF47]">
              {latestVnd > 0 ? `₫${formatNumber(Math.round(latestVnd))}` : "N/A"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {latestVnd > 25500 ? t("fx.highRangeVnd") : t("fx.normalRange")}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#222]">
            <h4 className="text-xs text-gray-500 mb-2">{t("fx.alertBasis")}</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <p>{t("fx.alert.krwDaily")}</p>
              <p>{t("fx.alert.krwWeekly")}</p>
              <p>{t("fx.alert.vndDaily")}</p>
              <p>{t("fx.alert.vndWeekly")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
