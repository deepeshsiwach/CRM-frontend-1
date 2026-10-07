"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

function EditUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("users")) {
      router.push("/dashboard");
      return;
    }

    if (!userId) {
      setMessage({ text: "User ID is missing.", isError: true });
      return;
    }

    async function loadUser() {
      setMessage({ text: "Loading user...", isError: false });
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load user. Status: " + res.status);
        }

        const user = await res.json();
        setFullName(user.fullName ?? "");
        setEmail(user.email ?? "");
        setRole(user.role ?? "");
        setStatus(user.status ?? "ACTIVE");
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading user:", err);
        setMessage({ text: "Unable to load user.", isError: true });
      }
    }

    loadUser();
  }, [userId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      setMessage({ text: "Please enter full name.", isError: true });
      return;
    }
    if (!email.trim()) {
      setMessage({ text: "Please enter email.", isError: true });
      return;
    }
    if (!role) {
      setMessage({ text: "Please select a role.", isError: true });
      return;
    }
    if (!status) {
      setMessage({ text: "Please select a status.", isError: true });
      return;
    }

    const userData: {
      fullName: string;
      email: string;
      role: string;
      status: string;
      password?: string;
    } = {
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      status,
    };

    if (password.trim() !== "") {
      userData.password = password;
    }

    setLoading(true);
    setMessage({ text: "Saving changes...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to update user.");
      }

      setMessage({ text: "User updated successfully.", isError: false });

      setTimeout(() => {
        router.push("/users");
      }, 1000);
    } catch (err: unknown) {
      console.error("Error updating user:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to update user.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit User</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update user credentials, role, or account status.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr; Back to Users
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            message.isError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form id="editUserForm" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="userId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Enter full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Role *
              </label>
              <select
                id="role"
                name="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="AGENT">AGENT</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Status *
              </label>
              <select
                id="status"
                name="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/users")}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditUserPage() {
  return (
    <DashboardLayout activePage="users">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading edit form...</div>}>
        <EditUserContent />
      </Suspense>
    </DashboardLayout>
  );
}
