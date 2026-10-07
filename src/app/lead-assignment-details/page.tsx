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
        <p style={{ padding: 20 }}>Loading assignment details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="lead-assignments">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Lead Assignment Details</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>View and reassign this lead</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/lead-assignments")}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          ← Back to Assignments
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* CURRENT DETAILS */}
        <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Current Assignment</h3>

          {assignment ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#4b5563" }}>Assignment ID:</strong>
                <span>{assignment.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#4b5563" }}>Lead ID:</strong>
                <span>{assignment.leadId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#4b5563" }}>Current Agent ID:</strong>
                <span>{assignment.agentId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#4b5563" }}>Current Team ID:</strong>
                <span>{assignment.teamId ?? "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#4b5563" }}>Assigned At:</strong>
                <span>{assignment.assignedAt ?? "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <strong style={{ color: "#4b5563" }}>Status:</strong>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: assignment.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                    color: assignment.status === "ACTIVE" ? "#166534" : "#4b5563",
                  }}
                >
                  {assignment.status ?? "-"}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>No assignment details found.</p>
          )}
        </div>

        {/* REASSIGN FORM */}
        <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Reassign / Transfer Lead</h3>

          <form id="reassignForm" onSubmit={handleReassign}>
            <div className="form-group" style={{ marginBottom: 15 }}>
              <label htmlFor="agentSelect" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Select Agent
              </label>
              <select
                id="agentSelect"
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #d1d5db" }}
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

            <div className="form-group" style={{ marginBottom: 15 }}>
              <label htmlFor="teamSelect" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Select Team
              </label>
              <select
                id="teamSelect"
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #d1d5db" }}
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

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                disabled={submitting || !assignment}
                className="primary-button"
                style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
              >
                {submitting ? "Reassigning..." : "Reassign Lead"}
              </button>
            </div>

            {message && (
              <p
                id="reassignMessage"
                style={{
                  marginTop: 15,
                  fontWeight: 600,
                  color: message.includes("success") ? "#15803d" : "#dc2626",
                }}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function LeadAssignmentDetailsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <LeadAssignmentDetailsContent />
    </Suspense>
  );
}
