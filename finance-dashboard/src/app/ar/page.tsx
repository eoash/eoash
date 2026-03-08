import ArDashboard from "@/components/ar/ArDashboard";
import { fetchAR } from "@/lib/sheets";

export const revalidate = 300;

export default async function ArPage() {
  let data;
  try {
    data = await fetchAR();
  } catch (error) {
    console.error("[ArPage] fetchAR failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">A/R Status</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">Failed to load data</p>
          <p className="text-sm text-gray-600">Please check Google Sheets API connection</p>
        </div>
      </div>
    );
  }

  return <ArDashboard invoices={data.invoices} />;
}
