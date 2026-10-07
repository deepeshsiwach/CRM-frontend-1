"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

export default function AddUserPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("users")) {
      router.push("/dashboard");
    }
  }, [router]);

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
    if (!password) {
      setMessage({ text: "Please enter password.", isError: true });
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

    const userData = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
      status,
    };

    setLoading(true);
    setMessage({ text: "Creating user...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to create user.");
      }

      setMessage({ text: "User created successfully.", isError: false });
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("");
      setStatus("ACTIVE");

      setTimeout(() => {
        router.push("/users");
      }, 1000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unable to create user.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activePage="users">
      <div className="add-user-page">
        <div className="add-user-page-header">
          <div>
            <h2>Add User</h2>
            <p>Create a new CRM user account.</p>
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

        <div className="form-container">
          <form id="addUserForm" onSubmit={handleSubmit}>
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
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className="form-actions">
              <button type="button" onClick={() => router.push("/users")} disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
