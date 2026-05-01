import { Suspense } from "react";
import OrderDetails from "@/components/admin/OrderDetails";

async function OrderDataFetcher({ orderId }: { orderId: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  try {
    const res = await fetch(`${baseUrl}/api/admin/orders/${orderId}`, {
      cache: "no-store",
    });

    if (res.status === 404) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Not Found</h2>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            The order you are looking for does not exist or may have been deleted.
          </p>
        </div>
      );
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch order: ${res.status}`);
    }

    const data = await res.json();
    
    if (!data.success || !data.order) {
      throw new Error(data.error || "Failed to load order data");
    }

    return <OrderDetails order={data.order} />;
  } catch (error: any) {
    console.error("Error fetching admin order:", error);
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center shadow-sm">
        <svg className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="font-semibold text-lg">Error Loading Order</h3>
          <p className="text-sm mt-1">{error.message || "Please try again later."}</p>
        </div>
      </div>
    );
  }
}

export default async function AdminOrderPage({ params }: { params: { orderId: string } }) {
  // Await the params object (best practice for Next.js 14+ when handling dynamic params)
  const { orderId } = await params;

  return (
    <div className="admin-container">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading order details...</p>
        </div>
      }>
        <OrderDataFetcher orderId={orderId} />
      </Suspense>
    </div>
  );
}
