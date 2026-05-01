import { Suspense } from "react";
import OrdersTable from "@/components/admin/OrdersTable";
import AutoRefresh from "@/components/admin/AutoRefresh";

async function OrdersDataFetcher() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  try {
    const res = await fetch(`${baseUrl}/api/admin/orders`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch orders: ${res.status}`);
    }

    const data = await res.json();
    return <OrdersTable orders={data.orders || []} />;
  } catch (error: any) {
    console.error("Error fetching admin orders:", error);
    return (
      <div className="admin-panel p-8 text-center text-red-500">
        Failed to load orders. Please try again later.
      </div>
    );
  }
}

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6 relative">
      <AutoRefresh intervalMs={15000} />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Orders
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" title="Live Polling Active"></span>
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all customer orders
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="admin-panel p-8 text-center text-gray-500">Loading orders...</div>}>
        <OrdersDataFetcher />
      </Suspense>
    </div>
  );
}
