import { fetchAR } from "@/lib/sheets";

export const revalidate = 300;

export async function GET() {
  try {
    const { invoices } = await fetchAR();
    const outstanding = invoices.filter((inv) => inv.status !== "paid");

    // 고유 클라이언트 기준으로 집계
    const clientMaxDays = new Map<string, number>();
    for (const inv of outstanding) {
      const cur = clientMaxDays.get(inv.client) ?? 0;
      if (inv.agingDays > cur) clientMaxDays.set(inv.client, inv.agingDays);
    }

    let red = 0;
    let orange = 0;
    for (const days of clientMaxDays.values()) {
      if (days > 60) red++;
      else if (days > 30) orange++;
    }

    return Response.json({ ar: { red, orange, total: red + orange } });
  } catch {
    return Response.json({ ar: { red: 0, orange: 0, total: 0 } });
  }
}
