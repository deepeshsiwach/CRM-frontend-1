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

  return (
    <DashboardLayout activeMenu="users" title="Users">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 15 }}>
        <input
          type="text"
          id="searchUser"
          placeholder="Search users..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 300, width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/add-user")}
            style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
          >
            + Add User
          </button>
          <button
            type="button"
            id="refreshUsers"
            onClick={loadUsers}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {message && <p id="message" style={{ color: message.includes("success") ? "green" : "red" }}>{message}</p>}

      <div className="table-container" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflowX: "auto" }}>
        <table className="leads-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111827", color: "#fff" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Name</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Email</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Role</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Created At</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24 }}>Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>{user.id}</td>
                  <td style={{ padding: "10px" }}><strong>{user.fullName}</strong></td>
                  <td style={{ padding: "10px" }}>{user.email}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: user.role === "ADMIN" ? "#fee2e2" : user.role === "MANAGER" ? "#fef3c7" : "#e0e7ff",
                        color: user.role === "ADMIN" ? "#991b1b" : user.role === "MANAGER" ? "#92400e" : "#3730a3",
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: user.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                        color: user.status === "ACTIVE" ? "#166534" : "#4b5563",
                      }}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px", fontSize: 13 }}>{user.createdAt || "-"}</td>
                  <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/user-details?id=${user.id}`)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/edit-user?id=${user.id}`)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer" }}
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
    </DashboardLayout>
  );
}
