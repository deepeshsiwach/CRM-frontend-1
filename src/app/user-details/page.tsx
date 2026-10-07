"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface UserData {
  id?: number | string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function UserDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<UserData | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

        const data = await res.json();
        setUser(data);
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading user:", err);
        setMessage({ text: "Unable to load user.", isError: true });
      }
    }

    loadUser();
  }, [userId, router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View user credentials, role, and activity status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/users")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Users
          </button>
          <button
            type="button"
            onClick={() => router.push(`/edit-user?id=${userId}`)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Edit User
          </button>
        </div>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{user?.id ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{user?.fullName ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{user?.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                user?.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                user?.role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {user?.role ?? "-"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-${(user?.status || "active").toLowerCase()}`}>
                {user?.status ?? "-"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{user?.createdAt ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function UserDetailsPage() {
  return (
    <DashboardLayout activePage="users">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading user details...</div>}>
        <UserDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
