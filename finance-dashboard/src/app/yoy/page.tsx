import { fetchYoY } from "@/lib/sheets";
import YoYDashboard from "@/components/yoy/YoYDashboard";

export const revalidate = 300;

export default async function YoYPage() {
  let data;
  try {
    const result = await fetchYoY();
    data = result.rows;
  } catch (error) {
    console.error("[YoYPage] fetchYoY failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">YoY Revenue Comparison</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400">Failed to load data</p>
        </div>
      </div>
    );
  }

  return <YoYDashboard data={data} />;
}
