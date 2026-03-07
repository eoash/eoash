import { Employee, LeaveRecord } from "./types";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = "apphaMgCZMSN3ysHk"; // 이오테이블
const CONTACTS_TABLE = "tbl8mPvzdtyy1HIkK"; // 연락처
const LEAVE_TABLE = "tblN1dgUFEK1x65Jy"; // 근태관리

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchAllRecords(tableId: string, params: Record<string, string> = {}): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const query = new URLSearchParams({ ...params, pageSize: "100" });
    if (offset) query.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${query}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
        next: { revalidate: 300 }, // 5분 캐시
      }
    );

    if (!res.ok) {
      throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export async function fetchEmployees(): Promise<Employee[]> {
  const records = await fetchAllRecords(CONTACTS_TABLE, { view: "EO Team" });

  return records.map((r) => ({
    id: r.id,
    name: (r.fields["이름"] as string) || "",
    company: (r.fields["소속"] as string) || "",
    slackId: (r.fields["Slack ID"] as string) || "",
    email: (r.fields["메일 주소"] as string) || "",
    joinDate: (r.fields["입사일"] as string) || null,
  }));
}

export async function fetchLeaveRecords(): Promise<LeaveRecord[]> {
  const records = await fetchAllRecords(LEAVE_TABLE);

  return records.map((r) => ({
    id: r.id,
    title: (r.fields["Title (작성자+분류)"] as string) || "",
    employeeName: (r.fields["작성자"] as string) || "",
    category: (r.fields["분류"] as string) || "",
    startDate: (r.fields["시작 날짜"] as string) || "",
    endDate: (r.fields["종료 날짜"] as string) || "",
    days: (r.fields["등록 일수"] as number) || 0,
    note: (r.fields["특이사항"] as string) || "",
    deleteRequested: (r.fields["삭제 요청"] as boolean) || false,
  }));
}
