import React from "react";
import PriceFormat from "@/components/PriceFormat";
import Link from "next/link";

interface RecentOrder {
  id: string;
  userEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "processing":
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "paid":
      case "confirmed":
        return "bg-indigo-100 text-indigo-800";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800"; // pending
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
        <Link href="/admin/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          View all &rarr;
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No recent orders found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="bg-white border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 truncate max-w-[150px]" title={order.userEmail}>
                    {order.userEmail}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <PriceFormat amount={order.totalAmount} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
