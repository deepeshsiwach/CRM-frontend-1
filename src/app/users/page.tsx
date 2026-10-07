"use client";

// ============================================================
// DERIVION CRM - USERS MANAGEMENT PAGE
// Ported from users.html + users.js (Admin Only)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function UsersPage() {
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const token = getToken();

  const loadUsers = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const users: User[] = await res.json();
      setAllUsers(users);
      setFilteredUsers(users);
    } catch {
      setMessage("Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Search filter
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    const s = searchText.toLowerCase().trim();
    const filtered = allUsers.filter(
      (u) =>
        String(u.id).toLowerCase().includes(s) ||
        (u.fullName || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.role || "").toLowerCase().includes(s) ||
        (u.status || "").toLowerCase().includes(s)
    );
    setFilteredUsers(filtered);
  }, [searchText, allUsers]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setMessage("User deleted successfully.");
      loadUsers();
    } catch {
      setMessage("Unable to delete user.");
    }
  };

  const roleBadge = (role: string) => {
    if (role === "ADMIN") return "bg-red-100 text-red-800";
    if (role === "MANAGER") return "bg-yellow-100 text-yellow-800";
    return "bg-indigo-100 text-indigo-700";
  };

  const thCls = "px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider";
  const tdCls = "px-3 py-3 text-sm text-gray-700 border-t border-gray-100";

  return (
    <DashboardLayout activeMenu="users" title="Users">
      <div className="flex items-center justify-between gap-3 mb-5">
        <input
          type="text"
          id="searchUser"
          placeholder="Search users..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/add-user")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add User
          </button>
          <button
            type="button"
            id="refreshUsers"
            onClick={loadUsers}
            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {message && (
        <p id="message" className={`mb-4 text-sm font-medium ${message.includes("success") ? "text-green-600" : "text-red-500"}`}>
          {message}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-900">
              <tr>
                <th className={thCls}>ID</th>
                <th className={thCls}>Name</th>
                <th className={thCls}>Email</th>
                <th className={thCls}>Role</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Created At</th>
                <th className={thCls}>Action</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className={tdCls}>{user.id}</td>
                    <td className={`${tdCls} font-semibold text-gray-800`}>{user.fullName}</td>
                    <td className={tdCls}>{user.email}</td>
                    <td className={tdCls}>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className={`${tdCls} text-xs text-gray-500`}>{user.createdAt || "-"}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={() => router.push(`/user-details?id=${user.id}`)}
                        className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/edit-user?id=${user.id}`)}
                        className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
