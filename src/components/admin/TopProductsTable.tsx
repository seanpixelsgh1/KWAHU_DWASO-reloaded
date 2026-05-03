import React from "react";
import PriceFormat from "@/components/PriceFormat";

interface TopProduct {
  productId: string;
  name: string;
  totalSold: number;
  revenue: number;
}

interface TopProductsTableProps {
  products: TopProduct[];
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Top Products</h3>
      </div>
      
      {products.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No product sales data available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Units Sold</th>
                <th className="px-6 py-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={product.productId} className="bg-white border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <span className="w-6 text-center text-gray-400 font-bold">{index + 1}.</span>
                    <div className="max-w-[180px] truncate" title={product.name}>
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-medium">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                      {product.totalSold}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    <PriceFormat amount={product.revenue} />
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
