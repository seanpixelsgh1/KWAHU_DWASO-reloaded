import { auth } from "@/auth";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import { FORCE_PREMIUM } from "@/lib/constants/admin";
import { UserRole } from "@/lib/rbac/roles";
import { MdDashboard } from "react-icons/md";
import { FiLock } from "react-icons/fi";

export default async function AdminDashboardPage() {
  const session = await auth();
  const userRole = session?.user?.role as UserRole;
  const isDev = process.env.NODE_ENV === "development";
  
  // Show dashboard if force premium is active in dev OR user is actual admin
  const showDashboard = (FORCE_PREMIUM && isDev) || userRole === "admin";

  if (showDashboard) {
    return <AdminDashboardClient />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <MdDashboard className="h-16 w-16 text-theme-color" />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
              <FiLock className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h2>
        <p className="text-lg text-theme-color font-semibold">
          Premium Feature
        </p>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-lg text-gray-700 mb-4">
            🚀 The Admin Dashboard is currently under maintenance or being updated.
          </p>
          <p className="text-gray-600 mb-6">
            Unlock powerful admin features including:
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-theme-color rounded-full mr-2"></div>
                <span className="font-medium text-gray-800">
                  User Management
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Complete user control & analytics
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-theme-color rounded-full mr-2"></div>
                <span className="font-medium text-gray-800">
                  Order Management
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Advanced order tracking system
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-theme-color rounded-full mr-2"></div>
                <span className="font-medium text-gray-800">
                  Analytics Dashboard
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Real-time insights & reports
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-theme-color rounded-full mr-2"></div>
                <span className="font-medium text-gray-800">
                  Admin Controls
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Full system administration
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mt-4">
            Thank you for using Kwahu Dwaso. Our admin suite is being refined for the best experience.
          </p>
        </div>
      </div>
    </div>
  );
}
