import RevenueDashboard from "@/components/revenue/RevenueDashboard";
import DataFreshness from "@/components/common/DataFreshness";
import { fetchRevenue } from "@/lib/sheets";

export const revalidate = 300;

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const year = parseInt(params.year || "2026") || 2026;

  let data;
  let noData = false;
  try {
    data = await fetchRevenue(year);
  } catch (error) {
    console.error("[RevenuePage] fetchRevenue failed:", error);
    noData = true;
  }

  if (noData || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Revenue</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">
            {year}년 매출 데이터가 없습니다
          </p>
          <p className="text-sm text-gray-600">
            해당 연도의 시트가 존재하지 않거나 Google Sheets API 연결을 확인해주세요
          </p>
        </div>
      </div>
    );
  }

  return <><DataFreshness fetchedAt={new Date().toISOString()} source={data._meta._source} /><RevenueDashboard data={data} year={year} /></>;
}
