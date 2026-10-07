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
    <div className="user-details-page">
      <div className="user-details-page-header">
        <div>
          <h2>User Details</h2>
          <p>View CRM user information.</p>
        </div>
        <button type="button" onClick={() => router.push("/users")}>
          ← Back to Users
        </button>
      </div>

      {message && (
        <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}

      <div className="user-details-card">
        <div className="detail-row">
          <span className="detail-label">User ID</span>
          <span id="userId" className="detail-value">{user?.id ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Full Name</span>
          <span id="fullName" className="detail-value">{user?.fullName ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Email</span>
          <span id="email" className="detail-value">{user?.email ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Role</span>
          <span id="role" className="detail-value">{user?.role ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span id="status" className="detail-value">{user?.status ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Created At</span>
          <span id="createdAt" className="detail-value">{user?.createdAt ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailsPage() {
  return (
    <DashboardLayout activePage="users">
      <Suspense fallback={<div>Loading user details...</div>}>
        <UserDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
