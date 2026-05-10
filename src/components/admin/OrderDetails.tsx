"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  FiArrowLeft, FiCopy, FiCheck, FiX, FiClock, 
  FiBox, FiCheckCircle, FiAlertCircle 
} from "react-icons/fi";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderLog {
  id: string;
  event: string;
  message: string;
  level: "info" | "warning" | "error";
  actor: string;
  createdAt: string;
  meta: any;
}

interface SystemFlags {
  paymentVerified: boolean;
  inventoryReserved: boolean;
  inventoryConfirmed: boolean;
}

interface OrderType {
  id: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentOverride?: { by: string; at: any; reason: string };
  createdAt: string;
  items: OrderItem[];
  shippingAddress: any;
  paymentReference: string | null;
  flags: SystemFlags;
  logs: OrderLog[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount / 100);
};

const getBadgeStyles = (status: string, isOverride?: boolean) => {
  if (isOverride && status.toLowerCase() === "paid") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

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

const getLogDotColor = (level: string) => {
  switch (level) {
    case "error": return "bg-red-500";
    case "warning": return "bg-yellow-500";
    default: return "bg-green-500";
  }
};

const getLogBorderColor = (level: string) => {
  switch (level) {
    case "error": return "border-red-300";
    case "warning": return "border-yellow-300";
    default: return "border-gray-200";
  }
};

export default function OrderDetails({ order }: { order: OrderType }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [showRawPayment, setShowRawPayment] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");

  const isUpdating = loadingAction !== null || fulfilling;

  const handleCopyRef = () => {
    if (order.paymentReference) {
      navigator.clipboard.writeText(order.paymentReference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => ({ ...prev, [logId]: !prev[logId] }));
  };

  const updateStatus = async (newStatus: string) => {
    if (newStatus === "cancelled") {
      const confirmed = window.confirm("Are you sure you want to cancel this order? This action is permanent.");
      if (!confirmed) return;
    }

    try {
      setLoadingAction(`status_${newStatus}`);
      setErrorMsg(null);
      
      const res = await fetch("/api/admin/orders/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: newStatus })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      toast.success("Status updated successfully");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Failed to update status");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFulfill = async (nextStatus: string, rider?: { name: string; phone: string }) => {
    setFulfilling(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus, rider }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Order marked as ${nextStatus.replace(/_/g, " ")}`);
        router.refresh();
      } else {
        throw new Error(data.error || "Transition failed");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to fulfill order");
      toast.error(err.message || "Failed to fulfill order");
    } finally {
      setFulfilling(false);
    }
  };

  const handleDispatchSubmit = () => {
    if (!riderName.trim() || !riderPhone.trim()) return;
    handleFulfill("out_for_delivery", { name: riderName.trim(), phone: riderPhone.trim() });
    setShowDispatchModal(false);
    setRiderName("");
    setRiderPhone("");
  };

  const verifyPayment = async () => {
    try {
      setLoadingAction("verify_payment");
      setErrorMsg(null);
      
      const res = await fetch(`/api/paystack/verify?orderId=${order.id}`, { method: "GET" });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to verify payment");
      }

      toast.success("Payment verified successfully");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Verification failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const manualMarkPaid = async () => {
    const confirmed = window.confirm("WARNING: This will manually mark this order as paid and deduct stock. Are you absolutely sure?");
    if (!confirmed) return;

    try {
      setLoadingAction("mark_paid");
      setErrorMsg(null);
      
      const res = await fetch("/api/admin/orders/mark-paid", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark as paid");
      }

      toast.success("Manual override applied");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Override failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const flags = order.flags || { paymentVerified: false, inventoryReserved: false, inventoryConfirmed: false };

  const getPaymentSource = () => {
    if (order.paymentOverride) return "Manual Override";
    const latestPaymentLog = order.logs.filter(l => l.event.includes("payment"))[0];
    if (latestPaymentLog?.meta?.source) {
      return latestPaymentLog.meta.source === "webhook" ? "Webhook" : 
             latestPaymentLog.meta.source === "fallback" ? "Fallback" : 
             latestPaymentLog.meta.source;
    }
    return "Unknown";
  };

  const totalItemAmount = order.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Navigation */}
      <div>
        <Link href="/admin/orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Order Header Card */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                Order <span className="font-mono text-indigo-600">#{order.id}</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${getBadgeStyles(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${getBadgeStyles(order.paymentStatus, !!order.paymentOverride)}`}>
                Payment: {order.paymentOverride ? "Overridden" : order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
              </span>
            </div>
          </div>

          {/* Customer Info & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium text-gray-900">{order.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Payment Reference:</span>
                  {order.paymentReference ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://dashboard.paystack.com/#/search?q=${order.paymentReference}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded select-all font-mono text-xs underline decoration-dotted"
                      >
                        {order.paymentReference}
                      </a>
                      <button onClick={handleCopyRef} className="text-gray-400 hover:text-gray-700 transition-colors">
                        {copiedRef ? <FiCheck className="h-4 w-4 text-green-500" /> : <FiCopy className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Payment Source:</span>
                  <span className="font-medium text-gray-900 capitalize">{getPaymentSource()}</span>
                </div>
              </div>
              
              {/* Payment Controls Layer */}
              <div className="mt-6 pt-4 border-t space-y-3">
                {order.paymentStatus !== "paid" && (
                  <button
                    onClick={verifyPayment}
                    disabled={isUpdating}
                    className="w-full flex justify-center items-center py-2 px-4 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingAction === "verify_payment" ? "Verifying..." : "Re-verify Payment"}
                  </button>
                )}
                
                {order.paymentStatus !== "paid" && order.status !== "delivered" && (
                  <button
                    onClick={manualMarkPaid}
                    disabled={isUpdating}
                    className="w-full flex justify-center items-center py-2 px-4 border border-orange-200 rounded-lg text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingAction === "mark_paid" ? "Processing..." : "Mark as Paid (Override)"}
                  </button>
                )}

                {/* Raw Payment Viewer */}
                <div>
                  <button 
                    onClick={() => setShowRawPayment(!showRawPayment)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showRawPayment ? "- Hide Payment Data" : "+ View Payment Data"}
                  </button>
                  {showRawPayment && (
                    <div className="mt-2 bg-gray-50 border rounded p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {order.logs.filter(l => l.event.includes("payment")).length > 0 ? (
                        (() => {
                          const latestPaymentLog = order.logs.filter(l => l.event.includes("payment"))[0];
                          return (
                            <div className="space-y-1">
                              <p><span className="font-semibold text-gray-500">Event:</span> {latestPaymentLog.event}</p>
                              <p><span className="font-semibold text-gray-500">Time:</span> {new Date(latestPaymentLog.createdAt).toLocaleString()}</p>
                              <pre className="mt-2 text-gray-700 font-mono text-[10px]">
                                {JSON.stringify(
                                  latestPaymentLog.meta?.raw ? {
                                    reference: latestPaymentLog.meta.raw.reference,
                                    amount: latestPaymentLog.meta.raw.amount,
                                    status: latestPaymentLog.meta.raw.status,
                                    paid_at: latestPaymentLog.meta.raw.paidAt || latestPaymentLog.meta.raw.paid_at,
                                    channel: latestPaymentLog.meta.raw.channel,
                                  } : latestPaymentLog.meta,
                                  null, 
                                  2
                                )}
                              </pre>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-gray-400 italic">No payment logs found.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium">{order.shippingAddress.name || order.shippingAddress.fullName || "Name unavailable"}</p>
                  <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No shipping address provided.</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Product</th>
                    <th className="px-6 py-3 font-medium text-center">Quantity</th>
                    <th className="px-6 py-3 font-medium text-right">Unit Price</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  {order.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                        No items recorded for this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 flex justify-end">
            <div className="w-full max-w-sm space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totalItemAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.amount - totalItemAmount > 0 ? order.amount - totalItemAmount : 0)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center text-base">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(order.amount)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Actions Card */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operational Controls</h2>
            <div className="space-y-3">
              {order.paymentStatus === "paid" && order.status === "pending" && (
                <button
                  onClick={() => handleFulfill("processing")}
                  disabled={isUpdating}
                  className="w-full flex justify-center items-center py-2 px-4 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fulfilling ? "Updating..." : "⚙️ Mark as Processing"}
                </button>
              )}
              {order.paymentStatus === "paid" && order.status === "processing" && (
                <button
                  onClick={() => handleFulfill("packed")}
                  disabled={isUpdating}
                  className="w-full flex justify-center items-center py-2 px-4 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fulfilling ? "Updating..." : "📦 Mark as Packed"}
                </button>
              )}
              {order.paymentStatus === "paid" && order.status === "packed" && (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  disabled={isUpdating}
                  className="w-full flex justify-center items-center py-2 px-4 border border-purple-600 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fulfilling ? "Updating..." : "🚚 Dispatch"}
                </button>
              )}
              {order.paymentStatus === "paid" && order.status === "out_for_delivery" && (
                <button
                  onClick={() => handleFulfill("delivered")}
                  disabled={isUpdating}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fulfilling ? "Updating..." : "✅ Mark as Delivered"}
                </button>
              )}
              

            </div>
            
            <div className="mt-6 pt-6 border-t border-red-100">
              <h3 className="text-xs uppercase tracking-wider text-red-600 font-bold mb-3 flex items-center">
                <FiAlertCircle className="mr-1" /> Danger Zone
              </h3>
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={isUpdating || order.status === "cancelled" || order.status === "delivered"}
                className="w-full flex justify-center items-center py-2 px-4 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingAction === "status_cancelled" ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>

          {/* System Flags */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Flags</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Verified</span>
                {flags.paymentVerified ? <FiCheckCircle className="text-green-500 h-5 w-5" /> : <FiX className="text-red-400 h-5 w-5" />}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Inventory Reserved</span>
                {flags.inventoryReserved ? <FiCheckCircle className="text-green-500 h-5 w-5" /> : <FiX className="text-red-400 h-5 w-5" />}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Inventory Confirmed</span>
                {flags.inventoryConfirmed ? <FiCheckCircle className="text-green-500 h-5 w-5" /> : <FiClock className="text-yellow-500 h-5 w-5" />}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="px-6 py-4 border-b bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">Activity Logs</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {order.logs.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center">No logs recorded.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {order.logs.map((log, idx) => (
                    <div key={log.id} className="relative flex items-start space-x-3">
                      <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 ${getLogBorderColor(log.level)} shadow-sm`}>
                        <div className={`h-2 w-2 rounded-full ${getLogDotColor(log.level)}`} />
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-sm font-medium text-gray-900">
                          {log.message}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span>{log.actor === 'admin' ? 'Admin Action' : 'System Event'}</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <div className="mt-2">
                            <button 
                              onClick={() => toggleLogExpansion(log.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 focus:outline-none"
                            >
                              {expandedLogs[log.id] ? "Hide Payload" : "View Payload"}
                            </button>
                            {expandedLogs[log.id] && (
                              <pre className="mt-2 text-[10px] p-2 bg-gray-800 text-gray-200 rounded overflow-x-auto">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDispatchModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full">
              <span className="text-2xl">🚚</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Dispatch Order</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Assign a rider to deliver order #{order.id.slice(0, 8)}
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
                onClick={() => { setShowDispatchModal(false); setRiderName(""); setRiderPhone(""); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchSubmit}
                disabled={!riderName.trim() || !riderPhone.trim() || fulfilling}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fulfilling ? "Dispatching..." : "🚚 Dispatch Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
