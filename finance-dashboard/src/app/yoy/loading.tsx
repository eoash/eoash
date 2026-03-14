import { ChartSkeleton } from "@/components/common/Skeleton";

export default function YoYLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#1a1a1a] mb-6" />
      <ChartSkeleton height="h-96 mb-4" />
      <ChartSkeleton height="h-64" />
    </div>
  );
}
