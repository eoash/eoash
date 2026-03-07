import { NextResponse } from "next/server";
import { fetchEmployees, fetchLeaveRecords } from "@/lib/airtable";
import { calculateEntitledLeave, sumUsedLeave } from "@/lib/leave-calc";
import { LeaveBalance } from "@/lib/types";

export const revalidate = 300; // 5분

export async function GET() {
  try {
    const [employees, leaveRecords] = await Promise.all([
      fetchEmployees(),
      fetchLeaveRecords(),
    ]);

    const currentYear = new Date().getFullYear();

    const balances: LeaveBalance[] = employees.map((emp) => {
      const records = leaveRecords.filter((r) => r.employeeName === emp.name);
      const entitled = emp.joinDate
        ? calculateEntitledLeave(emp.joinDate)
        : 15; // 입사일 없으면 기본 15일
      const used = sumUsedLeave(records, currentYear);
      const remaining = entitled - used;

      return {
        employee: emp,
        entitled,
        used,
        remaining,
        usageRate: entitled > 0 ? used / entitled : 0,
        records: records
          .filter((r) => new Date(r.startDate).getFullYear() === currentYear)
          .sort((a, b) => b.startDate.localeCompare(a.startDate)),
      };
    });

    // 잔여일 기준 오름차순 (적게 남은 사람 먼저)
    balances.sort((a, b) => a.remaining - b.remaining);

    return NextResponse.json({ balances, year: currentYear });
  } catch (error) {
    console.error("Leave API error:", error);
    return NextResponse.json(
      { error: "데이터를 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}
