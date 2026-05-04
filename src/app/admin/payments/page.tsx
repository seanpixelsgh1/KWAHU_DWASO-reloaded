import { Metadata } from "next";
import PaymentsClient from "@/components/admin/PaymentsClient";

export const metadata: Metadata = {
  title: "Payments Management | Admin | KwahuDwaso",
};

export default function AdminPaymentsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor and reconcile transactions across the marketplace.
        </p>
      </div>
      
      <PaymentsClient />
    </div>
  );
}
