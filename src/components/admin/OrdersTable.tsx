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
    case "packed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "out_for_delivery":
      return "bg-purple-50 text-purple-700 border-purple-200";
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

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ");
};

// Determine the next fulfillment action for a given order
const getNextAction = (order: Order): { label: string; nextStatus: string; color: string; icon: string } | null => {
  if (order.paymentStatus !== "paid") return null;

  switch (order.status) {
    case "processing":
      return { label: "Mark as Packed", nextStatus: "packed", color: "text-blue-700 hover:bg-blue-50", icon: "📦" };
    case "packed":
      return { label: "Dispatch", nextStatus: "out_for_delivery", color: "text-purple-700 hover:bg-purple-50", icon: "🚚" };
    case "out_for_delivery":
      return { label: "Mark Delivered", nextStatus: "delivered", color: "text-green-700 hover:bg-green-50", icon: "✅" };
    default:
      return null;
  }
};

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState<string | null>(null);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const handleFulfill = async (orderId: string, nextStatus: string, rider?: { name: string; phone: string }) => {
    setFulfilling(orderId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus, rider }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({ type: "success", message: `Order ${orderId.slice(0, 8)} → ${formatStatus(nextStatus)}` });
        // Trigger a page refresh to reflect the new state from the server
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setFeedback({ type: "error", message: data.error || "Transition failed" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setFulfilling(null);
      setOpenDropdownId(null);
    }
  };

  const handleDispatchSubmit = (orderId: string) => {
    if (!riderName.trim() || !riderPhone.trim()) return;
    handleFulfill(orderId, "out_for_delivery", { name: riderName.trim(), phone: riderPhone.trim() });
    setShowDispatchModal(null);
    setRiderName("");
    setRiderPhone("");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`px-4 py-3 text-sm font-medium ${feedback.type === "success" ? "bg-green-50 text-green-700 border-b border-green-200" : "bg-red-50 text-red-700 border-b border-red-200"}`}>
          {feedback.type === "success" ? "✅" : "❌"} {feedback.message}
        </div>
      )}

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
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
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
              filteredOrders.map((order) => {
                const nextAction = getNextAction(order);
                return (
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${getBadgeStyles(order.status)}`}>
                      {formatStatus(order.status)}
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
                          <div className="origin-top-right absolute right-0 mt-2 w-52 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                role="menuitem"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                View Details
                              </Link>

                              {/* Fulfillment Action */}
                              {nextAction && nextAction.nextStatus !== "out_for_delivery" && (
                                <button
                                  className={`w-full text-left block px-4 py-2 text-sm ${nextAction.color} transition-colors disabled:opacity-50`}
                                  role="menuitem"
                                  disabled={fulfilling === order.id}
                                  onClick={() => handleFulfill(order.id, nextAction.nextStatus)}
                                >
                                  {fulfilling === order.id ? "Updating..." : `${nextAction.icon} ${nextAction.label}`}
                                </button>
                              )}

                              {/* Dispatch (opens modal for rider info) */}
                              {nextAction && nextAction.nextStatus === "out_for_delivery" && (
                                <button
                                  className={`w-full text-left block px-4 py-2 text-sm ${nextAction.color} transition-colors`}
                                  role="menuitem"
                                  onClick={() => {
                                    setShowDispatchModal(order.id);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  {nextAction.icon} {nextAction.label}
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDispatchModal(null)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full">
              <span className="text-2xl">🚚</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Dispatch Order</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Assign a rider to deliver order #{showDispatchModal.slice(0, 8)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rider Name *</label>
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="e.g. Kofi Mensah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rider Phone *</label>
                <input
                  type="tel"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="e.g. 024XXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowDispatchModal(null); setRiderName(""); setRiderPhone(""); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDispatchSubmit(showDispatchModal)}
                disabled={!riderName.trim() || !riderPhone.trim() || fulfilling === showDispatchModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fulfilling === showDispatchModal ? "Dispatching..." : "🚚 Dispatch Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
