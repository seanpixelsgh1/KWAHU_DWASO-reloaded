"use client";

import { useState, useEffect } from "react";
import { FiSearch, FiFilter, FiShield, FiUser, FiUsers, FiPower, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-hot-toast";
import PriceFormat from "../PriceFormat";

interface UserRecord {
  id: string;
  name?: string;
  email: string;
  role: string;
  isActive: boolean;
  orders: number;
  totalSpent: number;
  createdAt?: string;
  lastLoginAt?: string;
  image?: string;
  provider?: string;
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const toastId = toast.loading("Updating role...");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Role updated to ${newRole}`, { id: toastId });
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to update role", { id: toastId });
      }
    } catch {
      toast.error("Failed to update role", { id: toastId });
    }
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "Deactivate" : "Activate";
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this user?`)) return;

    const toastId = toast.loading(`${action.slice(0, -1)}ing user...`);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !currentlyActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User ${action.toLowerCase()}d`, { id: toastId });
        fetchUsers();
      } else {
        toast.error(data.error || `Failed to ${action.toLowerCase()}`, { id: toastId });
      }
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} user`, { id: toastId });
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      user: "bg-gray-100 text-gray-800",
      deliveryman: "bg-blue-100 text-blue-800",
      packer: "bg-green-100 text-green-800",
      accountant: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      user: "Customer",
      deliveryman: "Delivery",
      packer: "Packer",
      accountant: "Accountant",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[role] || styles.user}`}>
        {labels[role] || role}
      </span>
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "disabled" && !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => u.isActive).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">Manage accounts, roles, and access control.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50"><FiUsers className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">Total Users</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-50"><FiShield className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{stats.admins}</p><p className="text-xs text-gray-500">Admins</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-50"><FiUser className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{stats.active}</p><p className="text-xs text-gray-500">Active Users</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <FiFilter className="text-gray-500" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">Customer</option>
            <option value="deliveryman">Delivery</option>
            <option value="packer">Packer</option>
            <option value="accountant">Accountant</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Spent</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <FiRefreshCw className="animate-spin" /> Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`border-b last:border-0 hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            (user.name || user.email)?.[0]?.toUpperCase() || "?"
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name || "Unnamed"}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="user">Customer</option>
                        <option value="admin">Admin</option>
                        <option value="deliveryman">Delivery</option>
                        <option value="packer">Packer</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-bold">Active</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-bold">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.orders}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      <PriceFormat amount={user.totalSpent} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          user.isActive
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        <FiPower />
                        {user.isActive ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
