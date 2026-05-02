import { Suspense } from "react";
import AdminProductsClient from "@/components/admin/AdminProductsClient";

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="admin-panel p-8 text-center text-gray-500">Loading products module...</div>}>
      <AdminProductsClient />
    </Suspense>
  );
}
