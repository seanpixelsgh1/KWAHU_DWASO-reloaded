import { Suspense } from "react";
import OrdersTable from "@/components/admin/OrdersTable";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage and track all customer orders
        </p>
      </div>

      <Suspense fallback={<div className="admin-panel p-8 text-center text-gray-500">Loading orders...</div>}>
        <OrdersDataFetcher />
      </Suspense>
    </div>
  );
}
