import { fetchClientRevenue } from "@/lib/sheets";
import KpiCard from "@/components/cards/KpiCard";
import { formatKRW } from "@/lib/utils";

export const revalidate = 300;

export default async function ClientsPage() {
  let clients;
  try {
    clients = await fetchClientRevenue();
  } catch (error) {
    console.error("[ClientsPage] failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">클라이언트별 매출</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400">데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  const totalRevenue = clients.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = clients.reduce((s, c) => s + c.paidAmount, 0);
  const totalUnpaid = clients.reduce((s, c) => s + c.unpaidAmount, 0);
  const avgDays = clients.filter((c) => c.avgCollectionDays > 0);
  const overallAvgDays = avgDays.length > 0 ? Math.round(avgDays.reduce((s, c) => s + c.avgCollectionDays, 0) / avgDays.length) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">클라이언트별 매출</h1>
        <span className="text-xs text-gray-500">홈택스 기준 (거래처별 미수금 시트)</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard title="총 매출" value={formatKRW(totalRevenue)} subtitle={`${clients.length}개 거래처`} tooltip="홈택스 세금계산서 기준 전 거래처 매출 합계" />
        <KpiCard title="정산 완료" value={formatKRW(totalPaid)} subtitle={`${Math.round((totalPaid / totalRevenue) * 100)}%`} tooltip="결제 완료된 인보이스 금액 합계" />
        <KpiCard title="미수금" value={formatKRW(totalUnpaid)} subtitle={`${clients.filter((c) => c.unpaidCount > 0).length}개 거래처`} tooltip="미결제 인보이스 금액 합계" trend={totalUnpaid > 0 ? { value: Math.round((totalUnpaid / totalRevenue) * 100), isPositive: false } : undefined} />
        <KpiCard title="평균 회수일수" value={`${overallAvgDays}일`} subtitle="정산완료 건 기준" tooltip="전 거래처 평균 결제 소요일수" />
      </div>

      {/* Client Table */}
      <div className="rounded-xl bg-[#111111] border border-[#222] p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">거래처별 상세 ({clients.length}곳)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left py-2 px-3 text-gray-500">#</th>
              <th className="text-left py-2 px-3 text-gray-500">거래처</th>
              <th className="text-right py-2 px-3 text-gray-500">매출 합계</th>
              <th className="text-right py-2 px-3 text-gray-500">건수</th>
              <th className="text-center py-2 px-3 text-gray-500">결제 상태</th>
              <th className="text-right py-2 px-3 text-gray-500">미수금</th>
              <th className="text-right py-2 px-3 text-gray-500">회수일수</th>
              <th className="text-right py-2 px-3 text-gray-500">비중</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => {
              const pct = totalRevenue > 0 ? (c.totalAmount / totalRevenue) * 100 : 0;
              return (
                <tr key={c.client} className="border-b border-[#111] hover:bg-white/5">
                  <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                  <td className="py-2 px-3 text-white max-w-[200px] truncate">{c.client}</td>
                  <td className="py-2 px-3 text-right text-white font-mono">{formatKRW(c.totalAmount)}</td>
                  <td className="py-2 px-3 text-right text-gray-400">{c.invoiceCount}건</td>
                  <td className="py-2 px-3 text-center">
                    {c.unpaidCount === 0 ? (
                      <span className="text-green-400 text-xs">✅ 전액 정산</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">⏳ {c.paidCount}/{c.invoiceCount}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {c.unpaidAmount > 0 ? (
                      <span className="text-red-400 font-mono">{formatKRW(c.unpaidAmount)}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-400">{c.avgCollectionDays > 0 ? `${c.avgCollectionDays}일` : "—"}</td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#E8FF47] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
