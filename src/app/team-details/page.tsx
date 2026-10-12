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
}

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  activeLeadCount: number;
}

function TeamDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("id");

  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

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
      setMessage({
        text: "Team ID is missing.",
        isError: true,
      });
      return;
    }

    let cancelled = false;

    async function loadTeam() {
      setMessage({
        text: "Loading team...",
        isError: false,
      });

      setLoadingMembers(true);
      setMembersError("");

      try {
        const token = getToken();

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Load team details
        const teamResponse = await fetch(
          `${API_BASE_URL}/api/teams/${teamId}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!teamResponse.ok) {
          throw new Error(
            `Failed to load team. Status: ${teamResponse.status}`
          );
        }

        const teamData: TeamData = await teamResponse.json();

        if (cancelled) return;

        setTeam(teamData);
        setMessage(null);

        // Load team members
        const membersResponse = await fetch(
          `${API_BASE_URL}/api/teams/${teamId}/members`,
          {
            method: "GET",
            headers,
          }
        );

        if (!membersResponse.ok) {
          throw new Error(
            `Members request failed with status ${membersResponse.status}`
          );
        }

        const membersData: TeamMember[] =
          await membersResponse.json();

        if (cancelled) return;

        setMembers(
          Array.isArray(membersData) ? membersData : []
        );
      } catch (error: unknown) {
        if (cancelled) return;

        console.error("Error loading team details:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (!team) {
          setMessage({
            text: "Unable to load team details. " + errorMessage,
            isError: true,
          });
        } else {
          setMembersError(
            "Unable to load team members. " + errorMessage
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    }

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId, router]);

  const totalActiveLeads = members.reduce(
    (total, member) => total + (member.activeLeadCount || 0),
    0
  );

  const activeMembers = members.filter(
    (member) => member.status?.toUpperCase() === "ACTIVE"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Team Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage team information and view member assignments.
          </p>
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

      {/* Team loading/error message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${message.isError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Team information */}
      {team && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Team Information
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Team ID
              </dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">
                {team.id ?? "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Team Name
              </dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">
                {team.teamName ?? "-"}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">
                {team.description || "No description provided."}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </dt>
              <dd className="mt-2">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${team.status?.toUpperCase() === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                    }`}
                >
                  {team.status ?? "-"}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Created At
              </dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">
                {team.createdAt
                  ? new Date(team.createdAt).toLocaleString()
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Team statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Team Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500">Members Found</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loadingMembers ? "—" : members.length}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500">Active Members</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {loadingMembers ? "—" : activeMembers}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500">
              Active Lead Assignments
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {loadingMembers ? "—" : totalActiveLeads}
            </p>
          </div>
        </div>
      </div>

      {/* Team members */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Members identified through assignments to this team.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            disabled={loadingMembers}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMembers ? "Loading..." : "Refresh"}
          </button>
        </div>

        {membersError && (
          <div className="m-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {membersError}
            <p className="mt-1 text-xs">
              Confirm that the updated backend has been deployed on Render.
            </p>
          </div>
        )}

        {loadingMembers ? (
          <div className="p-10 text-center text-gray-500">
            Loading team members...
          </div>
        ) : members.length === 0 && !membersError ? (
          <div className="p-10 text-center">
            <p className="text-gray-700 font-medium">
              No team members found
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This team may not have any matching lead assignments yet.
            </p>
          </div>
        ) : (
          members.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Member</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-right">
                      Active Leads
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {member.fullName}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {member.email}
                      </td>

                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {member.phone || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                          {member.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${member.status?.toUpperCase() === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {member.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-gray-900">
                        {member.activeLeadCount ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function TeamDetailsPage() {
  return (
    <DashboardLayout activePage="teams">
      <Suspense
        fallback={
          <div className="p-8 text-center text-gray-400">
            Loading team details...
          </div>
        }
      >
        <TeamDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}