"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface Order {
  id: string;
  email: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: currency || "GHS",
  }).format(amount / 100);
};

const getBadgeStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
    case "completed":
    case "delivered":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending":
    case "processing":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter((order) => {
      const matchesSearch =
        order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        order.paymentStatus.toLowerCase() === statusFilter ||
        order.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search by ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Order ID</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Email</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50 text-right">Amount</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Payment Status</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Order Status</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Method</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50">Date</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap sticky top-0 bg-gray-50 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span className="text-gray-500 font-medium">No orders found</span>
                    <span className="text-gray-400 text-sm">Try adjusting your search or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/80 even:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors" 
                      title={order.id}
                    >
                      #{order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{order.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(order.amount, order.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getBadgeStyles(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getBadgeStyles(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {order.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {openDropdownId === order.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenDropdownId(null)}
                          ></div>
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <button
                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                role="menuitem"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                View Details
                              </button>
                              <button
                                className="w-full text-left block px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                role="menuitem"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                Mark as Delivered
                              </button>
                              <button
                                className="w-full text-left block px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                role="menuitem"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                Cancel Order
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
