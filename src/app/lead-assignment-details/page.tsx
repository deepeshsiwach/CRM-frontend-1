"use client";

// ============================================================
// DERIVION CRM - LEAD ASSIGNMENT DETAILS & REASSIGN PAGE
// Ported from lead-assignment-details.html + lead-assignment-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Assignment {
  id: number;
  leadId: number;
  agentId: number;
  teamId?: number | null;
  assignedAt?: string;
  status?: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status?: string;
}

interface Team {
  id: number;
  teamName: string;
  status?: string;
}

function LeadAssignmentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("id");
  const leadIdFromUrl = searchParams.get("leadId");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = getToken();

  const loadDropdowns = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: "Bearer " + token };

    try {
      const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        setAgents(
          users.filter(
            (u) =>
              String(u.role).toUpperCase() === "AGENT" &&
              (!u.status || String(u.status).toUpperCase() === "ACTIVE")
          )
        );
      }

      const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, { headers });
      if (teamsRes.ok) {
        const teamsData: Team[] = await teamsRes.json();
        setTeams(
          teamsData.filter(
            (t) => !t.status || String(t.status).toUpperCase() === "ACTIVE"
          )
        );
      }
    } catch (err) {
      console.error("Error loading dropdowns:", err);
    }
  }, [token]);

  const loadAssignment = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const headers = { Authorization: "Bearer " + token };
      let assignData: Assignment | null = null;

      if (assignmentId) {
        const res = await fetch(`${API_BASE_URL}/api/lead-assignments/${assignmentId}`, { headers });
        if (!res.ok) throw new Error("Failed to load assignment");
        assignData = await res.json();
      } else if (leadIdFromUrl) {
        const res = await fetch(`${API_BASE_URL}/api/lead-assignments/lead/${leadIdFromUrl}/active`, { headers });
        if (!res.ok) {
          if (res.status === 404) {
            setMessage("This lead does not have an active assignment yet.");
            setLoading(false);
            return;
          }
          throw new Error("Failed to load active assignment");
        }
        assignData = await res.json();
      } else {
        setMessage("Assignment ID or Lead ID not found.");
        setLoading(false);
        return;
      }

      setAssignment(assignData);
      await loadDropdowns();
    } catch (err) {
      console.error(err);
      setMessage("Unable to load assignment.");
    } finally {
      setLoading(false);
    }
  }, [token, router, assignmentId, leadIdFromUrl, loadDropdowns]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment?.leadId) {
      setMessage("Lead ID not available.");
      return;
    }
    if (!selectedAgentId) {
      setMessage("Please select an agent.");
      return;
    }
    if (!selectedTeamId) {
      setMessage("Please select a team.");
      return;
    }

    setSubmitting(true);
    setMessage("Reassigning lead...");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/lead-assignments/${assignment.leadId}/reassign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            newAgentId: Number(selectedAgentId),
            newTeamId: Number(selectedTeamId),
          }),
        }
      );

      const responseText = await res.text();
      let data: { message?: string; error?: string } | null = null;
      try {
        if (responseText) data = JSON.parse(responseText);
      } catch {
        // ignore
      }

      if (!res.ok) {
        setMessage(
          data?.message ||
          data?.error ||
          responseText ||
          `Failed to reassign lead. HTTP ${res.status}`
        );
        setSubmitting(false);
        return;
      }

      setMessage("Lead transferred successfully!");
      setTimeout(() => {
        router.push("/lead-assignments");
      }, 1000);
    } catch (err) {
      console.error(err);
      setMessage("Unable to connect to CRM server.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="lead-assignments" title="Assignment Details">
        <div className="p-8 text-center text-gray-400">Loading assignment details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="lead-assignments">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Assignment Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and reassign this lead to a different agent or team.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/lead-assignments")}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Assignments
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CURRENT DETAILS */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Current Assignment
            </h3>

            {assignment ? (
              <dl className="divide-y divide-gray-100 text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500 font-medium">Assignment ID</dt>
                  <dd className="font-semibold text-gray-900">{assignment.id}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500 font-medium">Lead ID</dt>
                  <dd className="font-semibold text-blue-600">{assignment.leadId}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500 font-medium">Current Agent ID</dt>
                  <dd className="font-semibold text-gray-900">{assignment.agentId}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500 font-medium">Current Team ID</dt>
                  <dd className="font-semibold text-gray-900">{assignment.teamId ?? "-"}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500 font-medium">Assigned At</dt>
                  <dd className="text-gray-700 whitespace-nowrap">{assignment.assignedAt ?? "-"}</dd>
                </div>
                <div className="flex justify-between py-2.5 items-center">
                  <dt className="text-gray-500 font-medium">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        assignment.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {assignment.status ?? "-"}
                    </span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-400 py-4">No assignment details found.</p>
            )}
          </div>

          {/* REASSIGN FORM */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Reassign / Transfer Lead
            </h3>

            <form id="reassignForm" onSubmit={handleReassign} className="space-y-4">
              <div>
                <label htmlFor="agentSelect" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Agent *
                </label>
                <select
                  id="agentSelect"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">Select Agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="teamSelect" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Team *
                </label>
                <select
                  id="teamSelect"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !assignment}
                  className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {submitting ? "Reassigning..." : "Reassign Lead"}
                </button>
              </div>

              {message && (
                <p
                  id="reassignMessage"
                  className={`text-xs font-semibold pt-1 ${
                    message.includes("success") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function LeadAssignmentDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <LeadAssignmentDetailsContent />
    </Suspense>
  );
}
