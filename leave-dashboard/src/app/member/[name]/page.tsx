import Link from "next/link";
import { fetchEmployees, fetchLeaveRecords } from "@/lib/airtable";
import { calculateEntitledLeave, sumUsedLeave } from "@/lib/leave-calc";

export const revalidate = 300;

interface Props {
  params: Promise<{ name: string }>;
}

export default async function MemberPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const [employees, leaveRecords] = await Promise.all([
    fetchEmployees(),
    fetchLeaveRecords(),
  ]);

  const employee = employees.find((e) => e.name === decodedName);
  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline text-sm">&larr; 전체 현황</Link>
        <p className="mt-8 text-gray-500">직원을 찾을 수 없습니다: {decodedName}</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const records = leaveRecords
    .filter(
      (r) =>
        r.employeeName === employee.name &&
        r.category === "연차" &&
        !r.deleteRequested &&
        new Date(r.startDate).getFullYear() === currentYear
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const entitled = employee.joinDate ? calculateEntitledLeave(employee.joinDate) : 15;
  const used = sumUsedLeave(leaveRecords.filter((r) => r.employeeName === employee.name), currentYear);
  const remaining = entitled - used;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/" className="text-blue-600 hover:underline text-sm">&larr; 전체 현황</Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {employee.company} &middot; {employee.email}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
          <p className="text-sm text-gray-500">발생</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{entitled}<span className="text-base font-normal text-gray-400">일</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
          <p className="text-sm text-gray-500">사용</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{used}<span className="text-base font-normal text-gray-400">일</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
          <p className="text-sm text-gray-500">잔여</p>
          <p className={`text-3xl font-bold mt-1 ${remaining <= 3 ? "text-red-600" : remaining <= 5 ? "text-amber-600" : "text-green-600"}`}>
            {remaining}<span className="text-base font-normal text-gray-400">일</span>
          </p>
        </div>
      </div>

      {/* Records */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{currentYear}년 사용 내역</h2>
      {records.length === 0 ? (
        <p className="text-gray-400 text-sm">올해 사용 내역이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {r.startDate} ~ {r.endDate}
                </p>
                {r.note && (
                  <p className="text-sm text-gray-400 mt-0.5">{r.note}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-blue-600">{r.days}일</span>
            </div>
          ))}
        </div>
      )}

      {employee.joinDate && (
        <p className="text-xs text-gray-300 mt-8">
          입사일: {employee.joinDate}
        </p>
      )}
    </div>
  );
}
