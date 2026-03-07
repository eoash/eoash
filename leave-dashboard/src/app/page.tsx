import LeaveKpiCards from "@/components/LeaveKpiCards";
import LeaveTable from "@/components/LeaveTable";
import { fetchEmployees, fetchLeaveRecords } from "@/lib/airtable";
import { calculateEntitledLeave, sumUsedLeave } from "@/lib/leave-calc";
import { LeaveBalance } from "@/lib/types";

export const revalidate = 300;

async function getLeaveData(): Promise<LeaveBalance[]> {
  const [employees, leaveRecords] = await Promise.all([
    fetchEmployees(),
    fetchLeaveRecords(),
  ]);

  const currentYear = new Date().getFullYear();

  return employees
    .map((emp) => {
      const records = leaveRecords.filter((r) => r.employeeName === emp.name);
      const entitled = emp.joinDate ? calculateEntitledLeave(emp.joinDate) : 15;
      const used = sumUsedLeave(records, currentYear);

      return {
        employee: emp,
        entitled,
        used,
        remaining: entitled - used,
        usageRate: entitled > 0 ? used / entitled : 0,
        records: records
          .filter(
            (r) =>
              new Date(r.startDate).getFullYear() === currentYear &&
              r.category === "연차" &&
              !r.deleteRequested
          )
          .sort((a, b) => b.startDate.localeCompare(a.startDate)),
      };
    })
    .sort((a, b) => a.remaining - b.remaining);
}

export default async function HomePage() {
  let balances: LeaveBalance[];
  try {
    balances = await getLeaveData();
  } catch (error) {
    console.error("Failed to load leave data:", error);
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">EO 연차 현황</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600 font-medium">데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-red-400 mt-1">Airtable 연결을 확인해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">EO 연차 현황</h1>
        <span className="text-sm text-gray-400">{new Date().getFullYear()}년</span>
      </div>

      <LeaveKpiCards balances={balances} />
      <LeaveTable balances={balances} />
    </div>
  );
}
