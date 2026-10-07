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
        <div className="p-8 text-center text-gray-400">Loading lead details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="leads">
      <div className="space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead #{lead?.id} Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and update complete information about this lead.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openTransferModal}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors"
            >
              &#8644; Transfer Lead
            </button>

            <button
              type="button"
              onClick={() => router.push("/leads")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              &larr; Back to Leads
            </button>
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: EDITABLE DETAILS + CALL HISTORY */}
          <div className="lg:col-span-7 space-y-6">
            {/* LEAD DETAILS CARD */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Lead Profile</h3>
              </div>

              <div className="divide-y divide-gray-100 text-sm">
                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Lead ID</span>
                  <span className="sm:col-span-2 font-bold text-gray-900">{lead?.id ?? "-"}</span>
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Full Name</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Email</span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Phone</span>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Age</span>
                  <input
                    type="number"
                    value={editAge}
                    min={1}
                    max={120}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Course</span>
                  <span className="sm:col-span-2 text-gray-800 flex items-center gap-2">
                    {lead?.courseInterested || "-"}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">Protected</span>
                  </span>
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Lead Source</span>
                  <span className="sm:col-span-2 text-gray-800 flex items-center gap-2">
                    {lead?.leadSource || "-"}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">Protected</span>
                  </span>
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Status</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Priority</span>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Priority</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">City</span>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Education</span>
                  <input
                    type="text"
                    value={editEducation}
                    onChange={(e) => setEditEducation(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Current Profession</span>
                  <input
                    type="text"
                    value={editCurrentProfession}
                    onChange={(e) => setEditCurrentProfession(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Primary Objective</span>
                  <input
                    type="text"
                    value={editPrimaryObjective}
                    onChange={(e) => setEditPrimaryObjective(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Trading Experience</span>
                  <input
                    type="text"
                    value={editTradingExperience}
                    onChange={(e) => setEditTradingExperience(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Customer Looking For</span>
                  <input
                    type="text"
                    value={editCustomerLookingFor}
                    onChange={(e) => setEditCustomerLookingFor(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                  <span className="font-semibold text-gray-600">Interested Area</span>
                  <input
                    type="text"
                    value={editInterestedArea}
                    onChange={(e) => setEditInterestedArea(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDetails}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {saving ? "Saving..." : "Save Lead Details"}
                </button>

                {saveMessage && (
                  <span className={`text-xs font-semibold ${saveMessage.isError ? "text-red-600" : "text-green-600"}`}>
                    {saveMessage.text}
                  </span>
                )}
              </div>
            </div>

            {/* CALL HISTORY */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Call History</h3>
                  <p className="text-xs text-gray-500 mt-0.5">All calls logged for this lead.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/add-call-log?leadId=${leadId}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                >
                  + Add Call
                </button>
              </div>

              <div className="space-y-3">
                {callLogsLoading ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Loading call history...</p>
                ) : callLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No call history available for this lead.</p>
                ) : (
                  callLogs.map((call) => (
                    <div key={call.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Call ID:</span>
                        <span className="font-bold text-gray-900">#{call.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Agent ID:</span>
                        <span className="text-gray-800">{call.agentId ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Status:</span>
                        <span className="font-medium text-blue-600">{call.callStatus ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Outcome:</span>
                        <span className="font-medium text-emerald-600">{call.outcome ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Duration:</span>
                        <span className="text-gray-800">{call.duration ?? "-"} sec</span>
                      </div>
                      {call.remarks && (
                        <div className="pt-1 border-t border-gray-200/60 mt-1">
                          <span className="font-semibold text-gray-600">Remarks:</span>
                          <p className="text-gray-800 mt-0.5">{call.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FOLLOW-UPS + NOTES */}
          <div className="lg:col-span-5 space-y-6">
            {/* FOLLOW-UP HISTORY */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Follow-up History</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Scheduled follow-up interactions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/add-follow-up?leadId=${leadId}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                >
                  + Add Follow-up
                </button>
              </div>

              <div className="space-y-3">
                {followUpsLoading ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Loading follow-ups...</p>
                ) : followUps.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No follow-ups scheduled for this lead.</p>
                ) : (
                  followUps.map((fu) => (
                    <div key={fu.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Follow-up ID:</span>
                        <span className="font-bold text-gray-900">#{fu.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Date:</span>
                        <span className="font-medium text-gray-800">{fu.followUpDate ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Purpose:</span>
                        <span className="text-gray-800">{fu.purpose ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Status:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full ${
                          fu.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {fu.status ?? "-"}
                        </span>
                      </div>
                      {fu.remarks && (
                        <div className="pt-1 border-t border-gray-200/60 mt-1">
                          <span className="font-semibold text-gray-600">Remarks:</span>
                          <p className="text-gray-800 mt-0.5">{fu.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NOTES */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Notes</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Team notes and remarks on this lead.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/add-note?leadId=${leadId}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                >
                  + Add Note
                </button>
              </div>

              <div className="space-y-3">
                {notesLoading ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No notes available for this lead.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Note ID: #{n.id}</span>
                        <span className="text-gray-400">User ID: {n.userId ?? "-"}</span>
                      </div>
                      <p className="text-gray-800 text-sm whitespace-pre-wrap mt-1">{n.note ?? "-"}</p>
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
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setTransferOpen(false);
            }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transfer Lead</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Transfer this lead to another product team and agent.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead ID:</span>
                  <span className="font-bold text-gray-900">#{leadId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead Name:</span>
                  <span className="font-bold text-gray-900">{lead?.fullName || "-"}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Transfer To Team *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Transfer To Agent *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>

              {transferMessage && (
                <div
                  className={`text-xs font-semibold ${
                    transferMessage.isError ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {transferMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={transferring}
                  onClick={confirmTransfer}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {transferring ? "Transferring..." : "Transfer Lead"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function LeadDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading lead details...</div>}>
      <LeadDetailsContent />
    </Suspense>
  );
}
