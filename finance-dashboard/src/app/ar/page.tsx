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
        <h1 className="text-2xl font-bold mb-6">A/R 현황</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  return <ArDashboard invoices={data.invoices} />;
}
