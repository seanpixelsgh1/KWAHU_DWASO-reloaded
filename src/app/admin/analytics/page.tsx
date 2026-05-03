import React from "react";
import AnalyticsCards from "@/components/admin/AnalyticsCards";
import SalesChart from "@/components/admin/SalesChart";
import TopProductsTable from "@/components/admin/TopProductsTable";
import RecentOrdersTable from "@/components/admin/RecentOrdersTable";
import { getDashboardMetrics, getSalesOverTime, getTopProducts, getRecentOrders } from "@/lib/analytics";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAnalyticsPage(props: { searchParams: Promise<{ range?: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const rangeParam = searchParams?.range || "30d";
  const validRange = ["7d", "30d", "12m"].includes(rangeParam) 
    ? (rangeParam as "7d" | "30d" | "12m") 
    : "30d";

  const [metrics, sales, topProducts, recentOrders] = await Promise.all([
    getDashboardMetrics(),
    getSalesOverTime(validRange),
    getTopProducts(5),
    getRecentOrders(10)
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time store performance overview</p>
        </div>
        
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <Link 
            href="?range=7d" 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${validRange === "7d" ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            7 Days
          </Link>
          <Link 
            href="?range=30d" 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${validRange === "30d" ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            30 Days
          </Link>
          <Link 
            href="?range=12m" 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${validRange === "12m" ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"}`}
          >
            12 Months
          </Link>
        </div>
      </div>

      <AnalyticsCards metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={sales} />
        </div>
        <div className="lg:col-span-1">
          <TopProductsTable products={topProducts} />
        </div>
      </div>

      <div>
        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
}
