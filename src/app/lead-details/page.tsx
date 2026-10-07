"use client";

// ============================================================
// DERIVION CRM - LEAD DETAILS PAGE
// Ported from lead-details.html + lead-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Lead {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  age?: number | null;
  courseInterested?: string;
  leadSource?: string;
  status?: string;
  priority?: string;
  city?: string;
  education?: string;
  currentProfession?: string;
  primaryObjective?: string;
  tradingInvestmentExperience?: string;
  customerLookingFor?: string;
  interestedArea?: string;
  campaignId?: number | null;
}

interface CallLog {
  id: number;
  agentId?: number;
  callStatus?: string;
  outcome?: string;
  duration?: number;
  remarks?: string;
}

interface FollowUp {
  id: number;
  agentId?: number;
  followUpDate?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
}

interface Note {
  id: number;
  userId?: number;
  leadId?: number;
  note?: string;
}

interface Team {
  id: number;
  name?: string;
  teamName?: string;
  title?: string;
  status?: string;
}

interface User {
  id: number;
  fullName?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

function LeadDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editEducation, setEditEducation] = useState("");
  const [editCurrentProfession, setEditCurrentProfession] = useState("");
  const [editPrimaryObjective, setEditPrimaryObjective] = useState("");
  const [editTradingExperience, setEditTradingExperience] = useState("");
  const [editCustomerLookingFor, setEditCustomerLookingFor] = useState("");
  const [editInterestedArea, setEditInterestedArea] = useState("");
  const [editStatus, setEditStatus] = useState("NEW");
  const [editPriority, setEditPriority] = useState("");

  const [saveMessage, setSaveMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // Activities
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(true);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [transferMessage, setTransferMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [transferring, setTransferring] = useState(false);

  const token = getToken();

  const loadLead = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load lead");
      const data: Lead = await res.json();
      setLead(data);
      setEditName(data.fullName || "");
      setEditEmail(data.email || "");
      setEditPhone(data.phone || "");
      setEditAge(data.age != null ? String(data.age) : "");
      setEditCity(data.city || "");
      setEditEducation(data.education || "");
      setEditCurrentProfession(data.currentProfession || "");
      setEditPrimaryObjective(data.primaryObjective || "");
      setEditTradingExperience(data.tradingInvestmentExperience || "");
      setEditCustomerLookingFor(data.customerLookingFor || "");
      setEditInterestedArea(data.interestedArea || "");
      setEditStatus(data.status || "NEW");
      setEditPriority(data.priority || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  const loadCallLogs = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/call-logs/lead/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data: CallLog[] = await res.json();
        setCallLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCallLogsLoading(false);
    }
  }, [leadId, token]);

  const loadFollowUps = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/follow-ups/lead/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data: FollowUp[] = await res.json();
        setFollowUps(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [leadId, token]);

  const loadNotes = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const allNotes: Note[] = await res.json();
        const filtered = allNotes.filter((n) => String(n.leadId) === String(leadId));
        setNotes(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  }, [leadId, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    loadLead();
    loadCallLogs();
    loadFollowUps();
    loadNotes();
  }, [token, router, loadLead, loadCallLogs, loadFollowUps, loadNotes]);

  const handleSaveDetails = async () => {
    if (!leadId || !token) return;

    if (!editName.trim()) {
      setSaveMessage({ text: "Full name is required.", isError: true });
      return;
    }

    if (!editPhone.trim()) {
      setSaveMessage({ text: "Phone number is required.", isError: true });
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(editPhone.trim())) {
      setSaveMessage({ text: "Phone number must contain 10 to 15 digits.", isError: true });
      return;
    }

    const ageNum = editAge ? Number(editAge) : null;
    if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      setSaveMessage({ text: "Age must be between 1 and 120.", isError: true });
      return;
    }

    const body = {
      fullName: editName.trim(),
      email: editEmail.trim() || null,
      phone: editPhone.trim(),
      age: ageNum,
      city: editCity.trim() || null,
      education: editEducation.trim() || null,
      currentProfession: editCurrentProfession.trim() || null,
      primaryObjective: editPrimaryObjective.trim() || null,
      tradingInvestmentExperience: editTradingExperience.trim() || null,
      customerLookingFor: editCustomerLookingFor.trim() || null,
      interestedArea: editInterestedArea.trim() || null,
      priority: editPriority || null,
      status: editStatus || null,
    };

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/leads/${leadId}/details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });

      const responseText = await res.text();
      if (!res.ok) {
        throw new Error(responseText || "Failed to update lead details");
      }

      const updatedLead: Lead = responseText ? JSON.parse(responseText) : body;
      setLead((prev) => ({ ...prev, ...updatedLead }));
      setSaveMessage({ text: "Lead details updated successfully.", isError: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update lead details.";
      setSaveMessage({ text: message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  // Transfer lead handlers
  const openTransferModal = async () => {
    setTransferOpen(true);
    setTransferMessage(null);
    setSelectedTeamId("");
    setSelectedAgentId("");
    setAgents([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const teamsData: Team[] = await res.json();
        setTeams(teamsData.filter((t) => !t.status || String(t.status).toUpperCase() === "ACTIVE"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedAgentId("");
    if (!teamId) {
      setAgents([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const users: User[] = await res.json();
        const activeAgents = users.filter(
          (u) =>
            String(u.role).toUpperCase() === "AGENT" &&
            (!u.status || String(u.status).toUpperCase() === "ACTIVE")
        );
        setAgents(activeAgents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmTransfer = async () => {
    if (!selectedTeamId) {
      setTransferMessage({ text: "Please select the team.", isError: true });
      return;
    }
    if (!selectedAgentId) {
      setTransferMessage({ text: "Please select the agent.", isError: true });
      return;
    }

    if (!window.confirm("Are you sure you want to transfer this lead to the selected team and agent?")) {
      return;
    }

    setTransferring(true);
    setTransferMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/lead-assignments/${leadId}/reassign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          newAgentId: Number(selectedAgentId),
          newTeamId: Number(selectedTeamId),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to transfer lead");
      }

      setTransferMessage({ text: "Lead transferred successfully.", isError: false });
      setTimeout(() => {
        setTransferOpen(false);
        loadLead();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to transfer lead";
      setTransferMessage({ text: msg, isError: true });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="leads" title="Lead Details">
        <p style={{ padding: 20 }}>Loading lead details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="leads">
      {/* PAGE HEADER */}
      <div className="lead-details-header">
        <div>
          <h2>Lead Details</h2>
          <p>View and update complete information about this lead.</p>
        </div>

        <div className="lead-header-actions" style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="primary-button transfer-lead-button"
            onClick={openTransferModal}
            style={{ background: "#f59e0b", color: "#fff", fontWeight: 700 }}
          >
            ⇄ Transfer Lead
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push("/leads")}
          >
            ← Back to Leads
          </button>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="lead-page-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, marginTop: 20 }}>
        {/* LEFT COLUMN: EDITABLE DETAILS + CALL HISTORY */}
        <div className="lead-left-column" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* LEAD DETAILS CARD */}
          <div className="lead-details-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Lead ID</strong>
              <span>{lead?.id ?? "-"}</span>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Full Name</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Email</strong>
              <input
                type="email"
                className="lead-edit-input"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Phone</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Age</strong>
              <input
                type="number"
                className="lead-edit-input"
                value={editAge}
                min={1}
                max={120}
                onChange={(e) => setEditAge(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Course (Protected)</strong>
              <span>
                {lead?.courseInterested || "-"}{" "}
                <span className="lead-protected-badge" style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#6b7280" }}>Protected</span>
              </span>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Lead Source (Protected)</strong>
              <span>
                {lead?.leadSource || "-"}{" "}
                <span className="lead-protected-badge" style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#6b7280" }}>Protected</span>
              </span>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Status</strong>
              <select
                className="lead-edit-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="INTERESTED">INTERESTED</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
                <option value="COUNSELLING">COUNSELLING</option>
                <option value="ENROLLED">ENROLLED</option>
                <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                <option value="WRONG_NUMBER">WRONG_NUMBER</option>
                <option value="NO_RESPONSE">NO_RESPONSE</option>
                <option value="LOST">LOST</option>
              </select>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Priority</strong>
              <select
                className="lead-edit-select"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <option value="">Select Priority</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>City</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Education</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editEducation}
                onChange={(e) => setEditEducation(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Current Profession</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editCurrentProfession}
                onChange={(e) => setEditCurrentProfession(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Primary Objective</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editPrimaryObjective}
                onChange={(e) => setEditPrimaryObjective(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Trading Experience</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editTradingExperience}
                onChange={(e) => setEditTradingExperience(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Customer Looking For</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editCustomerLookingFor}
                onChange={(e) => setEditCustomerLookingFor(e.target.value)}
              />
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#4b5563" }}>Interested Area</strong>
              <input
                type="text"
                className="lead-edit-input"
                value={editInterestedArea}
                onChange={(e) => setEditInterestedArea(e.target.value)}
              />
            </div>

            {/* SAVE BUTTON */}
            <div className="lead-save-section" style={{ padding: 16, background: "#fafafa", display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="primary-button save-lead-details-button"
                disabled={saving}
                onClick={handleSaveDetails}
                style={{ background: "#2563eb", color: "#fff", padding: "9px 16px", borderRadius: 6, fontWeight: 600 }}
              >
                {saving ? "Saving..." : "Save Lead Details"}
              </button>

              {saveMessage && (
                <span style={{ fontSize: 13, color: saveMessage.isError ? "#dc2626" : "#15803d", fontWeight: "bold" }}>
                  {saveMessage.text}
                </span>
              )}
            </div>
          </div>

          {/* CALL HISTORY */}
          <div className="lead-activity-section" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div className="lead-activity-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>Call History</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>All calls related to this lead.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => router.push(`/add-call-log?leadId=${leadId}`)}
                style={{ fontSize: 12, padding: "7px 12px" }}
              >
                + Add Call
              </button>
            </div>

            <div id="leadCallLogs">
              {callLogsLoading ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>Loading call history...</div>
              ) : callLogs.length === 0 ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>No call history available for this lead.</div>
              ) : (
                callLogs.map((call) => (
                  <div key={call.id} className="lead-activity-card" style={{ border: "1px solid #f3f4f6", borderRadius: 6, padding: 10, marginBottom: 8, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Call ID:</strong> <span>{call.id}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Agent ID:</strong> <span>{call.agentId ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Status:</strong> <span>{call.callStatus ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Outcome:</strong> <span>{call.outcome ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Duration:</strong> <span>{call.duration ?? "-"} sec</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <strong>Remarks:</strong> <span>{call.remarks ?? "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FOLLOW-UPS + NOTES */}
        <div className="lead-right-column" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* FOLLOW-UP HISTORY */}
          <div className="lead-activity-section" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div className="lead-activity-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>Follow-up History</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>All follow-ups scheduled for this lead.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => router.push(`/add-follow-up?leadId=${leadId}`)}
                style={{ fontSize: 12, padding: "7px 12px" }}
              >
                + Add Follow-up
              </button>
            </div>

            <div id="leadFollowUps">
              {followUpsLoading ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>Loading follow-ups...</div>
              ) : followUps.length === 0 ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>No follow-ups available for this lead.</div>
              ) : (
                followUps.map((fu) => (
                  <div key={fu.id} className="lead-activity-card" style={{ border: "1px solid #f3f4f6", borderRadius: 6, padding: 10, marginBottom: 8, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Follow-up ID:</strong> <span>{fu.id}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Agent ID:</strong> <span>{fu.agentId ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Date:</strong> <span>{fu.followUpDate ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Purpose:</strong> <span>{fu.purpose ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Status:</strong> <span>{fu.status ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <strong>Remarks:</strong> <span>{fu.remarks ?? "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NOTES */}
          <div className="lead-activity-section" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div className="lead-activity-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>Notes</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>All notes related to this lead.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => router.push(`/add-note?leadId=${leadId}`)}
                style={{ fontSize: 12, padding: "7px 12px" }}
              >
                + Add Note
              </button>
            </div>

            <div id="leadNotes">
              {notesLoading ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="activity-empty" style={{ padding: 16, color: "#9ca3af" }}>No notes available for this lead.</div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="lead-activity-card" style={{ border: "1px solid #f3f4f6", borderRadius: 6, padding: 10, marginBottom: 8, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>Note ID:</strong> <span>{n.id}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <strong>User ID:</strong> <span>{n.userId ?? "-"}</span>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      <strong>Note:</strong> <p style={{ margin: "4px 0 0", color: "#374151" }}>{n.note ?? "-"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TRANSFER MODAL */}
      {transferOpen && (
        <div
          className="transfer-modal-overlay show"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTransferOpen(false);
          }}
        >
          <div
            className="transfer-modal"
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Transfer Lead</h3>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px" }}>
              Transfer this lead to another product team and agent.
            </p>

            <div style={{ background: "#f5f7fa", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <strong style={{ color: "#555" }}>Lead ID:</strong>
                <span style={{ fontWeight: 600 }}>{leadId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <strong style={{ color: "#555" }}>Lead Name:</strong>
                <span style={{ fontWeight: 600 }}>{lead?.fullName || "-"}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Transfer To Team
              </label>
              <select
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #d1d5db" }}
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
              >
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.teamName || t.title || `Team ${t.id}`} (ID: {t.id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Transfer To Agent
              </label>
              <select
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #d1d5db" }}
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">{selectedTeamId ? "Select agent" : "Select team first"}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName || a.name || a.username || `Agent ${a.id}`} (ID: {a.id})
                  </option>
                ))}
              </select>
            </div>

            {transferMessage && (
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 10,
                  color: transferMessage.isError ? "#dc2626" : "#15803d",
                  fontWeight: 600,
                }}
              >
                {transferMessage.text}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setTransferOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={transferring}
                onClick={confirmTransfer}
                style={{ background: "#2563eb", color: "#fff" }}
              >
                {transferring ? "Transferring..." : "Transfer Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function LeadDetailsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <LeadDetailsContent />
    </Suspense>
  );
}
