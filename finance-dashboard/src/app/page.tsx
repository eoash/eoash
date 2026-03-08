import RevenueDashboard from "@/components/revenue/RevenueDashboard";
import { fetchRevenue } from "@/lib/sheets";

export const revalidate = 300;

export default async function RevenuePage() {
  let data;
  try {
    data = await fetchRevenue();
  } catch (error) {
    console.error("[RevenuePage] fetchRevenue failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Revenue</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">Failed to load data</p>
          <p className="text-sm text-gray-600">
            Please check Google Sheets API connection
          </p>
        </div>
      </div>
    );
  }

  return <RevenueDashboard data={data} />;
}
