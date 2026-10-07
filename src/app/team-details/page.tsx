"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface TeamData {
  id?: number | string;
  teamName?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function TeamDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("id");

  const [team, setTeam] = useState<TeamData | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

        const data = await res.json();
        setTeam(data);
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading team:", err);
        setMessage({ text: "Unable to load team.", isError: true });
      }
    }

    loadTeam();
  }, [teamId, router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View CRM team information and members.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/teams")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Teams
          </button>
          <button
            type="button"
            onClick={() => router.push(`/edit-team?id=${teamId}`)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Edit Team
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
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team ID</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{team?.id ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Name</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{team?.teamName ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{team?.description ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-${(team?.status || "active").toLowerCase()}`}>
                {team?.status ?? "-"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{team?.createdAt ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function TeamDetailsPage() {
  return (
    <DashboardLayout activePage="teams">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading team details...</div>}>
        <TeamDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
