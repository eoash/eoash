import FxDashboard from "@/components/fx/FxDashboard";

export const revalidate = 3600;

async function fetchFxData() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
  });

  let latestKrw = 0;
  let latestVnd = 0;
  let lastUpdated = "";
  if (res.ok) {
    const data = await res.json();
    latestKrw = data.rates?.KRW || 0;
    latestVnd = data.rates?.VND || 0;
    lastUpdated = data.time_last_update_utc || "";
  }

  return { latestKrw, latestVnd, lastUpdated };
}

export default async function FxPage() {
  let data;
  try {
    data = await fetchFxData();
  } catch (error) {
    console.error("[FxPage] fetchFx failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">FX Rates</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400 mb-2">Failed to load data</p>
          <p className="text-sm text-gray-600">Please check external API connection</p>
        </div>
      </div>
    );
  }

  return <FxDashboard data={data} />;
}
