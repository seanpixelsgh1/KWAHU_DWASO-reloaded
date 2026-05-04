import { FiLock } from "react-icons/fi";
import Link from "next/link";

export default function AccountDisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div>
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
            <FiLock className="h-10 w-10 text-red-600" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Disabled
          </h2>
          <p className="mt-4 text-sm text-gray-500">
            Your account has been deactivated by an administrator. You can no longer access the platform or perform any actions.
          </p>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            If you believe this is a mistake, please contact support.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
