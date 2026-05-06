import { Suspense } from "react";
import OrdersTable from "@/components/admin/OrdersTable";
import AutoRefresh from "@/components/admin/AutoRefresh";

import { adminDb as db } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/utils/withTimeout";

async function OrdersDataFetcher() {
  try {
    const query = db.collection("orders").orderBy("createdAt", "desc").limit(100);
    const ordersSnapshot = await withTimeout(query.get());

    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      
      let createdAtIso = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === "string" || typeof data.createdAt === "number") {
          const parsedDate = new Date(data.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            createdAtIso = parsedDate.toISOString();
          }
        }
      }

      let paymentStatus = "pending";
      const rawPayment = data.paymentStatus?.toLowerCase();
      if (["paid", "failed"].includes(rawPayment)) {
        paymentStatus = rawPayment;
      } else if (rawPayment === "success") {
        paymentStatus = "paid";
      }

      let status = "pending";
      const rawStatus = data.status?.toLowerCase();
      if (["processing", "packed", "out_for_delivery", "delivered"].includes(rawStatus)) {
        status = rawStatus;
      } else if (rawStatus === "completed") {
        status = "delivered";
      }

      const paymentMethod = data.paymentMethod?.toLowerCase() === "cod" ? "cod" : "paystack";

      return {
        id: doc.id,
        email: data.email || "N/A",
        amount: typeof data.amount === "number" ? data.amount : 0,
        currency: "GHS",
        paymentStatus,
        status,
        paymentMethod,
        createdAt: createdAtIso,
      };
    });

    return <OrdersTable orders={orders} />;
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
