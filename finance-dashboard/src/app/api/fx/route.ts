import { NextResponse } from "next/server";

export const revalidate = 3600; // 1시간 캐시

// Frankfurter API: ECB 기반 무료 환율 API (API key 불필요)
// VND는 Frankfurter에 없어서 exchangerate-api fallback
const FRANKFURTER_BASE = "https://api.frankfurter.dev";

export async function GET() {
  try {
    // 최근 90일 환율 추이
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    // USD→KRW 추이 (Frankfurter)
    const krwRes = await fetch(
      `${FRANKFURTER_BASE}/${startDate}..${endDate}?from=USD&to=KRW`,
      { next: { revalidate: 3600 } }
    );

    let krwHistory: { date: string; rate: number }[] = [];
    if (krwRes.ok) {
      const krwData = await krwRes.json();
      krwHistory = Object.entries(krwData.rates || {}).map(([date, rates]: [string, any]) => ({
        date,
        rate: rates.KRW || 0,
      }));
    }

    // 최신 환율
    const latestRes = await fetch(`${FRANKFURTER_BASE}/latest?from=USD&to=KRW`, {
      next: { revalidate: 3600 },
    });
    let latestKrw = 0;
    if (latestRes.ok) {
      const latestData = await latestRes.json();
      latestKrw = latestData.rates?.KRW || 0;
    }

    // VND: exchangerate-api (무료 tier, no key needed)
    let latestVnd = 0;
    let vndHistory: { date: string; rate: number }[] = [];
    try {
      const vndRes = await fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 3600 },
      });
      if (vndRes.ok) {
        const vndData = await vndRes.json();
        latestVnd = vndData.rates?.VND || 0;
      }
    } catch {
      // VND API 실패 시 무시
    }

    // 변동: 최근 vs 30일 전
    const krwChange = krwHistory.length >= 2
      ? krwHistory[krwHistory.length - 1].rate - krwHistory[0].rate
      : 0;

    return NextResponse.json({
      latest: {
        usdKrw: latestKrw,
        usdVnd: latestVnd,
        date: endDate,
      },
      change: {
        usdKrw: Math.round(krwChange * 100) / 100,
        usdKrw30d: krwHistory.length >= 2 ? krwHistory[krwHistory.length - 1].rate - krwHistory[Math.max(0, krwHistory.length - 31)].rate : 0,
      },
      history: {
        krw: krwHistory,
        vnd: vndHistory,
      },
    });
  } catch (error) {
    console.error("[FX API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch FX data" }, { status: 500 });
  }
}
