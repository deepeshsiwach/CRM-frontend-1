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
    <div className="edit-user-page">
      <div className="edit-user-page-header">
        <div>
          <h2>Edit User</h2>
          <p>Update CRM user information.</p>
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

      <div className="edit-user-form-container">
        <form id="editUserForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input type="text" id="userId" value={userId ?? ""} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Enter full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="AGENT">AGENT</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.push("/users")} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
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
      <Suspense fallback={<div>Loading edit form...</div>}>
        <EditUserContent />
      </Suspense>
    </DashboardLayout>
  );
}
