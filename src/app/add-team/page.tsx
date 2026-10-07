"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

export default function AddTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("teams")) {
      router.push("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!teamName.trim()) {
      setMessage({ text: "Please enter team name.", isError: true });
      return;
    }
    if (!status) {
      setMessage({ text: "Please select status.", isError: true });
      return;
    }

    const teamData = {
      teamName: teamName.trim(),
      description: description.trim(),
      status,
    };

    setLoading(true);
    setMessage({ text: "Creating team...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to create team.");
      }

      setMessage({ text: "Team created successfully.", isError: false });
      setTeamName("");
      setDescription("");
      setStatus("ACTIVE");

      setTimeout(() => {
        router.push("/teams");
      }, 1000);
    } catch (err: unknown) {
      console.error("Error creating team:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to create team.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activePage="teams">
      <div className="add-team-page">
        <div className="add-team-page-header">
          <div>
            <h2>Add Team</h2>
            <p>Create a new CRM team.</p>
          </div>
          <button type="button" onClick={() => router.push("/teams")}>
            ← Back to Teams
          </button>
        </div>

        {message && (
          <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
            {message.text}
          </div>
        )}

        <div className="add-team-form-container">
          <form id="addTeamForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="teamName">Team Name</label>
              <input
                type="text"
                id="teamName"
                name="teamName"
                placeholder="Enter team name"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="Enter team description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
              <button type="button" onClick={() => router.push("/teams")} disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Team"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
