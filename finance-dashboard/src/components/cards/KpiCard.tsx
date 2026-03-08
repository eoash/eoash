import InfoTip from "@/components/common/InfoTip";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tooltip?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function KpiCard({ title, value, subtitle, tooltip, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        {title}
        {tooltip && <InfoTip text={tooltip} />}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${
              trend.isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {trend.isPositive ? "\u2191" : "\u2193"}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}
