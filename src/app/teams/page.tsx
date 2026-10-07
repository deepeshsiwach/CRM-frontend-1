"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface Team {
  id: number | string;
  teamName?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function TeamsPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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

    loadTeams();
  }, [router]);

  async function loadTeams() {
    setLoading(true);
    setMessage({ text: "Loading teams...", isError: false });
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load teams. Status: " + res.status);
      }

      const data = await res.json();
      setTeams(data || []);
      setMessage(null);
    } catch (err: unknown) {
      console.error("Error loading teams:", err);
      setMessage({ text: "Unable to load teams.", isError: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number | string) {
    const confirmed = confirm("Are you sure you want to delete this team?");
    if (!confirmed) return;

    try {
      setMessage({ text: "Deleting team...", isError: false });
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to delete team.");
      }

      setMessage({ text: "Team deleted successfully.", isError: false });
      loadTeams();
    } catch (err: unknown) {
      console.error("Error deleting team:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to delete team.";
      setMessage({ text: errorMsg, isError: true });
    }
  }

  const filteredTeams = teams.filter((t) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(t.id ?? "").toLowerCase().includes(s) ||
      String(t.teamName ?? "").toLowerCase().includes(s) ||
      String(t.description ?? "").toLowerCase().includes(s) ||
      String(t.status ?? "").toLowerCase().includes(s) ||
      String(t.createdAt ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout activePage="teams">
      <div className="teams-page">
        <div className="teams-page-header">
          <div>
            <h2>Teams</h2>
            <p>Manage CRM teams and their members.</p>
          </div>
          <div className="teams-header-actions">
            <button type="button" onClick={() => router.push("/dashboard")}>
              ← Dashboard
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/add-team")}
            >
              + Add Team
            </button>
          </div>
        </div>

        {message && (
          <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
            {message.text}
          </div>
        )}

        <div className="teams-toolbar">
          <input
            type="text"
            id="searchTeam"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" id="refreshTeams" onClick={loadTeams} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="teams-table-container">
          <table className="teams-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Team Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="teamsTableBody">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    {loading ? "Loading..." : "No teams found."}
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.id}</td>
                    <td>{team.teamName ?? ""}</td>
                    <td>{team.description ?? ""}</td>
                    <td>{team.status ?? ""}</td>
                    <td>{team.createdAt ?? ""}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/team-details?id=${team.id}`))}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/edit-team?id=${team.id}`))}
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(team.id)}>
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
