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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teams</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage CRM teams and their members.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              &larr; Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/add-team")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              + Add Team
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

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <input
            type="text"
            id="searchTeam"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            type="button"
            id="refreshTeams"
            onClick={loadTeams}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Team Name</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold text-center sticky right-0 bg-gray-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {loading ? "Loading..." : "No teams found."}
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{team.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{team.teamName ?? ""}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={team.description ?? ""}>
                        {team.description ?? ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium status-${(team.status || "active").toLowerCase()}`}>
                          {team.status ?? "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{team.createdAt ?? ""}</td>
                      <td className="px-4 py-3 sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-center whitespace-nowrap min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => startTransition(() => router.push(`/team-details?id=${team.id}`))}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors mr-1.5"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => startTransition(() => router.push(`/edit-team?id=${team.id}`))}
                          className="text-xs px-2.5 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 font-medium transition-colors mr-1.5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team.id)}
                          className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium transition-colors"
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
      </div>
    </DashboardLayout>
  );
}
