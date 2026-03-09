import type { CashRegionSummary } from "@/lib/types";
import { formatKRW } from "@/lib/utils";

interface CashRegionCardProps {
  data: CashRegionSummary;
}

const regionColors: Record<string, string> = {
  KR: "#00E87A",
  US: "#47B8FF",
  VN: "#34D399",
};

export default function CashRegionCard({ data }: CashRegionCardProps) {
  const color = regionColors[data.region] || "#999";

  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-sm font-medium text-gray-400">
          {data.regionLabel} ({data.region})
        </p>
      </div>

      <p className="text-2xl font-bold text-white mb-3">
        {formatKRW(data.totalUsd)}
      </p>

      <div className="space-y-2">
        {data.banks.map((bank) => (
          <div key={bank.bank} className="flex justify-between text-xs">
            <span className="text-gray-500">{bank.bank}</span>
            <span className="text-gray-300">
              {bank.balance.toLocaleString()} {bank.currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
