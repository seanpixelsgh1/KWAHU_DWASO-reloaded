"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { FiMenu, FiBell, FiSearch } from "react-icons/fi";
import { formatDisplayName } from "@/lib/utils/user";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
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
  );
}
