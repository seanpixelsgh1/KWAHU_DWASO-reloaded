import { Suspense } from "react";
import SettingsClient from "@/components/admin/SettingsClient";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage global configuration, features, and external integrations
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="admin-panel p-8 text-center text-gray-500">Loading settings...</div>}>
        <SettingsClient />
      </Suspense>
    </div>
  );
}
