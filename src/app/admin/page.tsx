"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/admin/StatCard";
import {
  FiDollarSign,
  FiShoppingBag,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalUsers: Number(data.totalUsers) || 0,
          totalOrders: Number(data.totalOrders) || 0,
          totalRevenue: Number(data.totalRevenue) || 0,
          totalProducts: Number(data.totalProducts) || 0,
          pendingOrders: Number(data.pendingOrders) || 0,
          completedOrders: Number(data.completedOrders) || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

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
        <button
          onClick={fetchStats}
          disabled={loading}
          className="admin-btn-secondary"
        >
          <FiRefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="admin-stat-card animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-2.5 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Revenue"
            value={`GH₵ ${(stats?.totalRevenue || 0).toFixed(2)}`}
            subtitle="All time earnings"
            icon={<FiDollarSign className="w-5 h-5 text-emerald-600" />}
          />
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            subtitle="All time"
            icon={<FiShoppingBag className="w-5 h-5 text-blue-600" />}
          />
          <StatCard
            title="Pending Orders"
            value={stats?.pendingOrders || 0}
            subtitle="Awaiting processing"
            icon={<FiClock className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            title="Failed Payments"
            value={0}
            subtitle="Needs attention"
            icon={<FiAlertCircle className="w-5 h-5 text-red-500" />}
          />
          <StatCard
            title="Low Stock Items"
            value={0}
            subtitle="Below threshold"
            icon={<FiAlertTriangle className="w-5 h-5 text-orange-500" />}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 admin-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="admin-panel-title">Recent Orders</h3>
            <a
              href="/admin/orders"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              View all →
            </a>
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
