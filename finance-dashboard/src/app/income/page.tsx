export const revalidate = 300; // 5분마다 재검증 (Sheets 업데이트 반영)

import IncomeDashboard from "@/components/income/IncomeDashboard";
import { fetchWithtaxData } from "@/lib/sheets";
import {
  WITHTAX_YEARLY,
  WITHTAX_2025,
  WITHTAX_EXPENSES_2025,
  WITHTAX_LAST_UPDATED,
} from "@/lib/withtax-data";

// 위드택스 월별 상세 데이터가 있는 최신 연도
const DETAIL_YEAR = "2025";

export default async function IncomePage() {
  // _SYNC_Withtax 탭 우선, 없으면 정적 데이터 fallback
  const sheetsData = await fetchWithtaxData(Number(DETAIL_YEAR));

  const yearly = sheetsData?.yearly ?? WITHTAX_YEARLY;
  const monthly = sheetsData?.monthly ?? WITHTAX_2025;
  const expenses = sheetsData?.expenses ?? WITHTAX_EXPENSES_2025;
  const lastUpdated = sheetsData?.lastUpdated || WITHTAX_LAST_UPDATED;

  return (
    <IncomeDashboard
      yearly={yearly}
      monthly={monthly}
      expenses={expenses}
      lastUpdated={lastUpdated}
      detailYear={DETAIL_YEAR}
    />
  );
}
