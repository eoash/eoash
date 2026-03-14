import { KpiCardSkeleton, ChartSkeleton } from "@/components/common/Skeleton";

export default function RevenueLoading() {
  return (
    <div>
      <div className="h-8 w-32 animate-pulse rounded-lg bg-[#1a1a1a] mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
      </div>
      <ChartSkeleton height="h-64" />
    </div>
  );
}
