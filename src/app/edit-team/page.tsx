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
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update CRM team details and status.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/teams")}
          className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr; Back to Teams
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
        <form id="editTeamForm" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="teamId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Team ID
            </label>
            <input
              type="text"
              id="teamId"
              value={teamId ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="teamName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Team Name *
            </label>
            <input
              type="text"
              id="teamName"
              name="teamName"
              placeholder="Enter team name"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Enter team description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              onClick={() => router.push("/teams")}
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

export default function EditTeamPage() {
  return (
    <DashboardLayout activePage="teams">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading edit team form...</div>}>
        <EditTeamContent />
      </Suspense>
    </DashboardLayout>
  );
}
