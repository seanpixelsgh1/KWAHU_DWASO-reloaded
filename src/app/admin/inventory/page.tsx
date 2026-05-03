"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertProduct } from "@/lib/inventoryAlerts";

export default function AdminInventoryPage() {
  const [outOfStock, setOutOfStock] = useState<AlertProduct[]>([]);
  const [lowStock, setLowStock] = useState<AlertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/admin/inventory-alerts");
        if (!response.ok) {
          throw new Error("Failed to fetch inventory alerts");
        }
        const json = await response.json();
        if (json.success && json.data) {
          setOutOfStock(json.data.outOfStock || []);
          setLowStock(json.data.lowStock || []);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Inventory Alerts</h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor critical stock levels and restock items to prevent lost sales.
        </p>
      </div>

      {/* OUT OF STOCK SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-lg font-bold text-red-900">Out of Stock (Critical)</h3>
          </div>
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {outOfStock.length} items
          </span>
        </div>

        {outOfStock.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No items are out of stock. Great job!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-center">Available Stock</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {outOfStock.map((product) => (
                  <tr key={product.id} className="bg-white border-b last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-600 font-bold">{product.available}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/products?edit=${product.id}`}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Restock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LOW STOCK SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
        <div className="p-4 border-b border-yellow-100 bg-yellow-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            <h3 className="text-lg font-bold text-yellow-900">Low Stock (Warning)</h3>
          </div>
          <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {lowStock.length} items
          </span>
        </div>

        {lowStock.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No items are running low.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-center">Available Stock</th>
                  <th className="px-6 py-4 text-center">Threshold</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id} className="bg-white border-b last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-yellow-600 font-bold">{product.available}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {product.threshold}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/products?edit=${product.id}`}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        Restock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
