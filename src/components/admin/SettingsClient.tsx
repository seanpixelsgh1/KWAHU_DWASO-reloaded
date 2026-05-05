"use client";

import { useState, useEffect } from "react";
import { Settings } from "@/lib/settings";

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error || "Failed to load settings");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section: keyof Settings, field: string, value: any) => {
    if (!settings) return;
    
    if (section === "currency") {
      setSettings({ ...settings, currency: value });
    } else {
      setSettings({
        ...settings,
        [section]: {
          ...(settings[section] as any),
          [field]: value,
        },
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Settings updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to update settings");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-panel p-8 text-center">Loading configuration...</div>;
  if (error && !settings) return <div className="admin-panel p-8 text-center text-red-500">{error}</div>;
  if (!settings) return null;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-md">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="admin-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Store Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.store.name}
                onChange={(e) => handleChange("store", "name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.store.email}
                onChange={(e) => handleChange("store", "email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.store.phone || ""}
                onChange={(e) => handleChange("store", "phone", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Global Config */}
        <div className="admin-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Global Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency Code</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.currency}
                onChange={(e) => handleChange("currency", "", e.target.value)}
              >
                <option value="GHS">GHS - Ghanaian Cedi</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
              <input
                type="number"
                min="0"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.inventory.lowStockThreshold}
                onChange={(e) => handleChange("inventory", "lowStockThreshold", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="admin-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Paystack Public Key</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.paystack.publicKey}
                onChange={(e) => handleChange("paystack", "publicKey", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Safe for frontend usage.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paystack Secret Key</label>
              <input
                type="password"
                disabled
                value="••••••••••••••••••••••••"
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm p-2 border text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-red-500 mt-1 font-medium">Configured via Environment Variables ONLY.</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="admin-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Feature Toggles</h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-4 w-4"
                checked={settings.features.enableReviews}
                onChange={(e) => handleChange("features", "enableReviews", e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Enable Product Reviews</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-4 w-4"
                checked={settings.features.enableWishlist}
                onChange={(e) => handleChange("features", "enableWishlist", e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Enable Wishlist</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-4 w-4"
                checked={settings.features.enableCoupons}
                onChange={(e) => handleChange("features", "enableCoupons", e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Enable Coupons</span>
            </label>
          </div>
        </div>

        {/* Email */}
        <div className="admin-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Email Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.email.provider}
                onChange={(e) => handleChange("email", "provider", e.target.value)}
              >
                <option value="console">Console (Development)</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">SMTP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">From Email Address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={settings.email.fromEmail}
                onChange={(e) => handleChange("email", "fromEmail", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
