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
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Team</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new CRM team and define its operational scope.</p>
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
          <form id="addTeamForm" onSubmit={handleSubmit} className="space-y-5">
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
                {loading ? "Creating..." : "Create Team"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/teams")}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
