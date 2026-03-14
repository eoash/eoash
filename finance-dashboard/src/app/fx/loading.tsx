import { KpiCardSkeleton, ChartSkeleton } from "@/components/common/Skeleton";

export default function FxLoading() {
  return (
    <div>
      <div className="h-8 w-28 animate-pulse rounded-lg bg-[#1a1a1a] mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <ChartSkeleton height="h-80" />
    </div>
  );
}
