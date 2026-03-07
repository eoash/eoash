export interface Employee {
  id: string;
  name: string;
  company: string;
  slackId: string;
  email: string;
  joinDate: string | null; // ISO date
}

export interface LeaveRecord {
  id: string;
  title: string;
  employeeName: string;
  category: string; // "연차" | "리모트 워크" etc
  startDate: string;
  endDate: string;
  days: number;
  note: string;
  deleteRequested: boolean;
}

export interface LeaveBalance {
  employee: Employee;
  entitled: number; // 발생일수
  used: number; // 사용일수
  remaining: number; // 잔여일수
  usageRate: number; // 사용률 (0-1)
  records: LeaveRecord[];
}
