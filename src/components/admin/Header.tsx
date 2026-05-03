"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { FiMenu, FiBell, FiSearch, FiAlertTriangle } from "react-icons/fi";
import { formatDisplayName } from "@/lib/utils/user";
import { useEffect, useState } from "react";
import Link from "next/link";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  useEffect(() => {
    // Only poll if user is admin
    if (session?.user?.role !== "admin") return;

    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/admin/inventory-alerts");
        const json = await res.json();
        if (json.success && json.data) {
          setOutOfStockCount(json.data.outOfStock?.length || 0);
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // 60s
    return () => clearInterval(interval);
  }, [session]);

  // Derive page title from pathname
  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last === "admin") return "Dashboard";
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : "Dashboard";
  };

  const displayName = formatDisplayName(
    session?.user?.name || "",
    "Admin"
  );

  return (
    <div className="flex flex-col w-full">
      {/* Global Alert Banner */}
      {outOfStockCount > 0 && (
        <div className="bg-red-600 px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium z-50">
          <FiAlertTriangle className="w-4 h-4" />
          <span>⚠️ {outOfStockCount} product{outOfStockCount !== 1 ? 's are' : ' is'} out of stock.</span>
          <Link href="/admin/inventory" className="underline ml-2 hover:text-red-100">
            View Details
          </Link>
        </div>
      )}

      <header className="admin-header">
        {/* Left: Mobile menu + Page title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: Search + Notifications + Avatar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden lg:flex items-center bg-gray-100 rounded-lg px-3 py-2 gap-2">
            <FiSearch className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-700 outline-none w-40 placeholder:text-gray-400"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <FiBell className="w-5 h-5" />
            {(outOfStockCount > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-200" />

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 leading-tight">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
