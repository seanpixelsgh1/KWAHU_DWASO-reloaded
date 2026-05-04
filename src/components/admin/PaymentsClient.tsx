"use client";

import { useState, useEffect } from "react";
import PriceFormat from "../PriceFormat";
import { FiRefreshCw, FiSearch, FiFilter, FiCheckCircle, FiXCircle, FiClock, FiMinusCircle, FiDatabase } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "abandoned";
  paymentMethod: string;
  paystackReference: string;
  createdAt: string;
  paidAt?: string;
  metadata?: {
    email?: string;
  };
}

export default function PaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/payments?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleReconcile = async (reference: string, id: string) => {
    try {
      setReconcilingId(id);
      const toastId = toast.loading("Verifying with Paystack...");
      
      const res = await fetch("/api/admin/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Reconciliation complete", { id: toastId });
        fetchPayments(); // Refresh list
      } else {
        toast.error(data.error || "Failed to reconcile", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred during verification");
    } finally {
      setReconcilingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"><FiCheckCircle /> Success</span>;
      case "pending":
        return <span className="flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"><FiClock /> Pending</span>;
      case "failed":
        return <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"><FiXCircle /> Failed</span>;
      case "abandoned":
        return <span className="flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"><FiMinusCircle /> Abandoned</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return (
      p.orderId?.toLowerCase().includes(lowerQ) ||
      p.paystackReference?.toLowerCase().includes(lowerQ) ||
      p.metadata?.email?.toLowerCase().includes(lowerQ)
    );
  });

  const handleBackfill = async () => {
    const toastId = toast.loading("Syncing legacy orders to payments...");
    try {
      const res = await fetch("/api/admin/payments/backfill", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Backfill complete!", { id: toastId });
        fetchPayments();
      } else {
        toast.error(data.error || "Backfill failed", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred during backfill", { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Ref, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleBackfill}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors border border-amber-200 whitespace-nowrap"
          >
            <FiDatabase /> Sync Legacy Orders
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <FiFilter /> Filter:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <FiRefreshCw className="animate-spin" /> Loading payments...
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500 mb-3">No payments found matching your criteria.</div>
                    <button
                      onClick={handleBackfill}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FiDatabase /> Sync Legacy Orders
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Order: {payment.orderId}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5" title="Payment Reference">Ref: {payment.paystackReference}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(payment.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{payment.metadata?.email || "N/A"}</div>
                      <div className="text-xs text-gray-500 capitalize">{payment.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      <PriceFormat amount={payment.amount} />
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleReconcile(payment.paystackReference, payment.id)}
                        disabled={reconcilingId === payment.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        <FiRefreshCw className={reconcilingId === payment.id ? "animate-spin" : ""} />
                        Verify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
