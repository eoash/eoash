import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

// fawazahmed0/currency-api: 무료, API key 불필요, KRW+VND historical 지원
// Latest: https://latest.currency-api.pages.dev/v1/currencies/usd.json
// Historical: https://{YYYY-MM-DD}.currency-api.pages.dev/v1/currencies/usd.json
const CURRENCY_API_LATEST =
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json";

function historicalUrl(date: string) {
  return `https://${date}.currency-api.pages.dev/v1/currencies/usd.json`;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD or null

  try {
    const url = date ? historicalUrl(date) : CURRENCY_API_LATEST;
    const res = await fetch(url, {
      next: { revalidate: date ? 86400 : 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rates = data.usd || {};

    return NextResponse.json({
      latestKrw: rates.krw || 0,
      latestVnd: rates.vnd || 0,
      lastUpdated: data.date || date || "",
      isHistorical: !!date,
    });
  } catch (error) {
    console.error("[FX API] Error:", error);

    // Fallback: open.er-api.com (latest only)
    if (!date) {
      try {
        const fallback = await fetch(
          "https://open.er-api.com/v6/latest/USD",
          { next: { revalidate: 3600 } }
        );
        if (fallback.ok) {
          const fb = await fallback.json();
          return NextResponse.json({
            latestKrw: fb.rates?.KRW || 0,
            latestVnd: fb.rates?.VND || 0,
            lastUpdated: fb.time_last_update_utc || "",
            isHistorical: false,
          });
        }
      } catch {
        // both APIs failed
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch FX data" },
      { status: 500 }
    );
  }
}
