import { fetchCashPosition } from "@/lib/sheets";
import CashDashboard from "@/components/cash/CashDashboard";

export const revalidate = 300;

export default async function CashPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const year = parseInt(params.year || "2026") || 2026;

  let data;
  let error = false;
  try {
    data = await fetchCashPosition(year);
  } catch (err) {
    console.error(`[CashPage] fetchCashPosition(${year}) failed:`, err);
    error = true;
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Cash Position</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">{year}년 데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600 mb-4">해당 연도의 시트가 존재하지 않거나 API 연결에 실패했습니다</p>
          <a
            href="/cash?year=2026"
            className="inline-block px-4 py-2 text-sm rounded-lg bg-[#00E87A]/15 text-[#00E87A] hover:bg-[#00E87A]/25 transition-colors"
          >
            2026년으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return <CashDashboard data={data} year={year} />;
}
