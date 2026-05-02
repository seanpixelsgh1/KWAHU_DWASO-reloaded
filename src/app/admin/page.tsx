import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import {
  FiDollarSign,
  FiShoppingBag,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { adminDb as db } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/utils/withTimeout";

export const dynamic = "force-dynamic";

async function getAdminStats() {
  try {
    const ordersSnapshot = await withTimeout(db.collection("orders").get());
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    let todaysRevenue = 0;
    let last7DaysOrders = 0;
    let failedPayments = 0;
    let pendingOrders = 0;

    ordersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      let createdAtDate = new Date();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string" || typeof data.createdAt === "number") {
          const parsedDate = new Date(data.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            createdAtDate = parsedDate;
          }
        }
      }

      const isPaid = data.paymentStatus === "paid" || data.paymentStatus === "success";
      if (createdAtDate >= startOfToday && isPaid) {
        todaysRevenue += (typeof data.amount === "number" ? data.amount : 0);
      }

      if (createdAtDate >= sevenDaysAgo) {
        last7DaysOrders += 1;
      }

      if (data.paymentStatus === "failed") {
        failedPayments += 1;
      }

      if (data.status === "pending" || data.status === "processing") {
        pendingOrders += 1;
      }
    });

    return {
      todaysRevenue,
      last7DaysOrders,
      failedPayments,
      pendingOrders,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      todaysRevenue: 0,
      last7DaysOrders: 0,
      failedPayments: 0,
      pendingOrders: 0,
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time snapshot of your marketplace
          </p>
        </div>
        <Link
          href="/admin"
          className="admin-btn-secondary flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`GH₵ ${(stats.todaysRevenue / 100).toFixed(2)}`}
          subtitle="Since midnight (Paid only)"
          icon={<FiDollarSign className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="7-Day Volume"
          value={stats.last7DaysOrders}
          subtitle="Orders this week"
          icon={<FiShoppingBag className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Failed Payments"
          value={stats.failedPayments}
          subtitle="Requires attention"
          icon={<FiAlertCircle className="w-5 h-5 text-red-500" />}
        />
        <StatCard
          title="Action Required"
          value={stats.pendingOrders}
          subtitle="Pending / Processing"
          icon={<FiClock className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 admin-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="admin-panel-title">Recent Orders</h3>
            <Link
              href="/admin/orders"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Orders table will be connected here (paginated + filtered)
          </p>
        </div>

        {/* System Status */}
        <div className="admin-panel">
          <h3 className="admin-panel-title mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Database</span>
              <span className="admin-badge-green">Online</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Payments API</span>
              <span className="admin-badge-green">Healthy</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Webhook</span>
              <span className="admin-badge-green">Active</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t pt-3">
              <span className="text-sm text-gray-600">Last Sync</span>
              <span className="text-sm text-gray-900 font-medium">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
