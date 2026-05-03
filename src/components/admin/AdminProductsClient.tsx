"use client";

import { useState, useEffect } from "react";
import { ProductType } from "../../../type";
import ProductForm from "./ProductForm";
import { FiEdit2, FiTrash2, FiPlus, FiPower } from "react-icons/fi";
import { toast } from "react-hot-toast";
import PriceFormat from "../PriceFormat";

export default function AdminProductsClient() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data); // data is returned inside "data" property by GET
      } else {
        setError(data.error || "Failed to fetch products");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product? (It will be marked as inactive)")) return;
    
    const toastId = toast.loading("Deleting product...");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Product deleted successfully", { id: toastId });
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to delete product", { id: toastId });
      }
    } catch (err) {
      toast.error("Failed to delete product", { id: toastId });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const toastId = toast.loading("Updating status...");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status updated", { id: toastId });
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to update status", { id: toastId });
      }
    } catch (err) {
      toast.error("Failed to update status", { id: toastId });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchProducts();
  };

  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setIsFormOpen(false)}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          &larr; Back to Products List
        </button>
        <ProductForm 
          initialData={editingProduct} 
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products ({products.length})</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiPlus /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="admin-panel p-8 text-center text-gray-500">Loading products...</div>
      ) : error ? (
        <div className="admin-panel p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="admin-panel overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Reserved</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <img 
                      src={product.images?.[0] || "/placeholder.jpg"} 
                      alt={product.name} 
                      className="w-10 h-10 object-cover rounded bg-gray-100"
                    />
                    <div className="max-w-[200px] truncate" title={product.name}>
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <PriceFormat amount={product.price} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="font-semibold text-gray-900">{product.stock} total</span>
                      {(() => {
                        const available = (product.stock || 0) - (product.reserved || 0);
                        const threshold = product.lowStockThreshold || 5;
                        if (available <= 0) {
                          return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">🔴 Out of Stock</span>;
                        } else if (available <= threshold) {
                          return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">🟡 Low Stock</span>;
                        } else {
                          return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">🟢 Healthy</span>;
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-orange-600 font-medium">
                    {product.reserved || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {product.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => handleToggleActive(product.id, product.isActive !== false)}
                        title={product.isActive !== false ? "Deactivate" : "Activate"}
                        className={`hover:scale-110 transition-transform ${product.isActive !== false ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <FiPower size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(product)}
                        title="Edit"
                        className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-800 hover:scale-110 transition-transform"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No products found. Add your first product to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
