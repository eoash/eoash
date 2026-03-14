import { KpiCardSkeleton, Skeleton } from "@/components/common/Skeleton";

export default function OverviewLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-28 mb-6" />
      {[0, 1, 2].map((s) => (
        <div key={s} className="mb-8">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
