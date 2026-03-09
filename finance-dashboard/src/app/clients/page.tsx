import { fetchClientRevenue } from "@/lib/sheets";
import ClientsDashboard from "@/components/clients/ClientsDashboard";

export const revalidate = 300;

export default async function ClientsPage() {
  try {
    const { invoices } = await fetchClientRevenue();
    return <ClientsDashboard invoices={invoices} />;
  } catch (error) {
    console.error("[ClientsPage] failed:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Client Revenue</h1>
        <div className="rounded-xl bg-[#111111] border border-[#222] p-8 text-center">
          <p className="text-gray-400">Failed to load data</p>
        </div>
      </div>
    );
  }
}
