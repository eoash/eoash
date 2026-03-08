import { fetchCashPosition } from "@/lib/sheets";
import CashDashboard from "@/components/cash/CashDashboard";

export const revalidate = 300;

export default async function CashPage() {
  let data;
  try {
    data = await fetchCashPosition();
  } catch (error) {
    console.error("[CashPage] fetchCashPosition failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Cash Position</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600">Google Sheets API 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  return <CashDashboard data={data} />;
}
