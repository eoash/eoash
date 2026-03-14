export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#1a1a1a] ${className}`} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] p-3 md:p-5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className={`rounded-xl bg-[#111111] border border-[#222] p-5 ${height} flex flex-col`}>
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-[#111111] border border-[#222] overflow-hidden">
      <div className="p-4 border-b border-[#222]">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-[#222]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
