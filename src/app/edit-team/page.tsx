"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

function EditTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("id");

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
      return;
    }

    if (!teamId) {
      setMessage({ text: "Team ID is missing.", isError: true });
      return;
    }

    async function loadTeam() {
      setMessage({ text: "Loading team...", isError: false });
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load team. Status: " + res.status);
        }

        const team = await res.json();
        setTeamName(team.teamName ?? "");
        setDescription(team.description ?? "");
        setStatus(team.status ?? "ACTIVE");
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading team:", err);
        setMessage({ text: "Unable to load team.", isError: true });
      }
    }

    loadTeam();
  }, [teamId, router]);

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
    setMessage({ text: "Saving changes...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to update team.");
      }

      setMessage({ text: "Team updated successfully.", isError: false });

      setTimeout(() => {
        router.push("/teams");
      }, 1000);
    } catch (err: unknown) {
      console.error("Error updating team:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to update team.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="edit-team-page">
      <div className="edit-team-page-header">
        <div>
          <h2>Edit Team</h2>
          <p>Update CRM team information.</p>
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

      <div className="edit-team-form-container">
        <form id="editTeamForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="teamId">Team ID</label>
            <input type="text" id="teamId" value={teamId ?? ""} readOnly />
          </div>

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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditTeamPage() {
  return (
    <DashboardLayout activePage="teams">
      <Suspense fallback={<div>Loading edit team form...</div>}>
        <EditTeamContent />
      </Suspense>
    </DashboardLayout>
  );
}
