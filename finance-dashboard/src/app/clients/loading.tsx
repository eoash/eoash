import { ChartSkeleton, TableSkeleton } from "@/components/common/Skeleton";

export default function ClientsLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[#1a1a1a] mb-6" />
      <ChartSkeleton height="h-96 mb-6" />
      <TableSkeleton rows={10} />
    </div>
  );
}
