import { KpiCardSkeleton, ChartSkeleton, Skeleton } from "@/components/common/Skeleton";

export default function CashLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[#1a1a1a] mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <ChartSkeleton height="h-72 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#111111] border border-[#222] p-5">
            <Skeleton className="h-4 w-16 mb-3" />
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
