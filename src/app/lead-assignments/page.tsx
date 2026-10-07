"use client";

// ============================================================
// DERIVION CRM - LEAD ASSIGNMENTS PAGE
// Ported from lead-assignments.html + lead-assignments.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Lead {
  id: number;
  fullName?: string;
  status?: string;
  [key: string]: unknown;
}

interface Assignment {
  id: number;
  leadId: number;
  agentId: number;
  teamId?: number;
  assignedAt?: string;
  status?: string;
  [key: string]: unknown;
}

interface User {
  id: number;
  fullName: string;
  role: string;
  status?: string;
}

interface Team {
  id: number;
  teamName: string;
  status?: string;
}

export default function LeadAssignmentsPage() {
  const router = useRouter();

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  // Bulk assignment state
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [quantitySelect, setQuantitySelect] = useState("");
  const [customQuantity, setCustomQuantity] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Search & filter
  const [searchText, setSearchText] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const token = getToken();

  const getUnassignedLeads = useCallback(() => {
    const activeAssignedLeadIds = new Set(
      allAssignments
        .filter((a) => a.status === "ACTIVE")
        .map((a) => Number(a.leadId))
    );
    return allLeads.filter((lead) => !activeAssignedLeadIds.has(Number(lead.id)));
  }, [allAssignments, allLeads]);

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    const headers = { Authorization: "Bearer " + token };

    try {
      // 1. Users
      const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData);
      }

      // 2. Teams
      const teamsRes = await fetch(`${API_BASE_URL}/api/teams`, { headers });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setAllTeams(teamsData);
      }

      // 3. Assignments
      const assignRes = await fetch(`${API_BASE_URL}/api/lead-assignments`, { headers });
      if (!assignRes.ok) throw new Error("Failed to load assignments");
      const assignData: Assignment[] = await assignRes.json();
      setAllAssignments(assignData);
      setFilteredAssignments(assignData);

      // 4. Leads
      const leadsRes = await fetch(`${API_BASE_URL}/api/leads`, { headers });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setAllLeads(leadsData);
      }
    } catch (err) {
      console.error(err);
      setAssignmentMessage("Unable to load assignments.");
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search filter
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredAssignments(allAssignments);
      return;
    }
    const s = searchText.toLowerCase().trim();
    const filtered = allAssignments.filter((a) => {
      const agent = allUsers.find((u) => Number(u.id) === Number(a.agentId));
      const agentName = agent ? agent.fullName.toLowerCase() : "";
      return (
        String(a.id).toLowerCase().includes(s) ||
        String(a.leadId).toLowerCase().includes(s) ||
        String(a.agentId).toLowerCase().includes(s) ||
        agentName.includes(s) ||
        String(a.teamId || "").toLowerCase().includes(s) ||
        String(a.status || "").toLowerCase().includes(s)
      );
    });
    setFilteredAssignments(filtered);
  }, [searchText, allAssignments, allUsers]);

  const unassignedLeads = getUnassignedLeads();

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    setQuantitySelect("");
    setCustomQuantity("");
    if (checked) {
      setSelectedLeadIds(unassignedLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleLead = (id: number) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleQuantityChange = (val: string) => {
    setQuantitySelect(val);
    if (val === "custom") {
      setSelectedLeadIds([]);
      return;
    }
    if (!val) {
      setSelectedLeadIds([]);
      return;
    }
    const count = Number(val);
    setSelectedLeadIds(unassignedLeads.slice(0, count).map((l) => l.id));
  };

  const handleCustomQuantity = (val: string) => {
    setCustomQuantity(val);
    const count = Number(val);
    if (!count || count < 1) {
      setSelectedLeadIds([]);
      return;
    }
    setSelectedLeadIds(unassignedLeads.slice(0, count).map((l) => l.id));
  };

  const handleBulkAssign = async () => {
    if (!selectedAgentId) {
      setBulkMessage("Please select an agent.");
      return;
    }
    if (selectedLeadIds.length === 0) {
      setBulkMessage("Please select at least one lead.");
      return;
    }

    setBulkAssigning(true);
    setBulkMessage("Assigning leads...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/lead-assignments/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          agentId: Number(selectedAgentId),
          teamId: selectedTeamId ? Number(selectedTeamId) : null,
        }),
      });

      if (!res.ok) {
        let errMessage = "Bulk assignment failed.";
        try {
          const errData = await res.json();
          if (errData.message) errMessage = errData.message;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const assigned = await res.json();
      setBulkMessage(`${assigned.length} leads assigned successfully.`);
      setSelectedLeadIds([]);
      setQuantitySelect("");
      setCustomQuantity("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk assignment failed.";
      setBulkMessage(msg);
    } finally {
      setBulkAssigning(false);
    }
  };

  const getAgentDisplayName = (agentId: number) => {
    const user = allUsers.find((u) => Number(u.id) === Number(agentId));
    return user ? `${user.fullName} (ID: ${user.id})` : `Agent ID: ${agentId}`;
  };

  const activeAgents = allUsers.filter(
    (u) => String(u.role).toUpperCase() === "AGENT" && (!u.status || String(u.status).toUpperCase() === "ACTIVE")
  );

  const activeTeams = allTeams.filter(
    (t) => !t.status || String(t.status).toUpperCase() === "ACTIVE"
  );

  return (
    <DashboardLayout activeMenu="lead-assignments" title="Lead Assignments">
      {/* BULK ASSIGNMENT SECTION */}
      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 25 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 18 }}>Bulk Lead Assignment</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 15 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Select Agent
            </label>
            <select
              id="bulkAgentSelect"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <option value="">Select Agent</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} (ID: {a.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Select Team
            </label>
            <select
              id="bulkTeamSelect"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">No Team</option>
              {activeTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName} (ID: {t.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Select Quantity
            </label>
            <select
              id="bulkQuantitySelect"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              value={quantitySelect}
              onChange={(e) => handleQuantityChange(e.target.value)}
            >
              <option value="">Manual Selection</option>
              <option value="5">First 5 Leads</option>
              <option value="10">First 10 Leads</option>
              <option value="25">First 25 Leads</option>
              <option value="50">First 50 Leads</option>
              <option value="100">First 100 Leads</option>
              <option value="custom">Custom Quantity</option>
            </select>
          </div>
        </div>

        {quantitySelect === "custom" && (
          <div id="customQuantityContainer" style={{ marginBottom: 15, display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Enter Quantity:</label>
            <input
              type="number"
              id="bulkCustomQuantity"
              min={1}
              style={{ width: 120, padding: "7px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              value={customQuantity}
              onChange={(e) => handleCustomQuantity(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="selectAllBulkLeads"
              checked={unassignedLeads.length > 0 && selectedLeadIds.length === unassignedLeads.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            Select All Unassigned Leads ({unassignedLeads.length})
          </label>

          <span id="bulkSelectedCount" style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
            Selected Leads: {selectedLeadIds.length}
          </span>
        </div>

        {/* BULK LEADS CONTAINER */}
        <div
          id="bulkLeadSelection"
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: 10,
            marginBottom: 15,
            background: "#fafafa",
          }}
        >
          {unassignedLeads.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>No unassigned leads available.</p>
          ) : (
            unassignedLeads.map((lead) => (
              <label
                key={lead.id}
                className="bulk-lead-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 8px",
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  className="bulk-lead-checkbox"
                  checked={selectedLeadIds.includes(lead.id)}
                  onChange={() => handleToggleLead(lead.id)}
                />
                <div className="bulk-lead-info" style={{ display: "flex", gap: 15, fontSize: 13 }}>
                  <span className="bulk-lead-name" style={{ fontWeight: 600 }}>
                    {lead.fullName || "Unnamed Lead"}
                  </span>
                  <span className="bulk-lead-id" style={{ color: "#6b7280" }}>
                    Lead ID: {lead.id}
                  </span>
                  <span className="bulk-lead-status" style={{ color: "#2563eb" }}>
                    {lead.status || "NEW"}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <button
            type="button"
            id="bulkAssignButton"
            className="primary-button"
            disabled={bulkAssigning}
            onClick={handleBulkAssign}
            style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
          >
            {bulkAssigning
              ? "Assigning..."
              : selectedLeadIds.length > 0
              ? `Assign ${selectedLeadIds.length} Leads`
              : "Assign Selected Leads"}
          </button>

          <span
            id="bulkAssignmentMessage"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: bulkMessage.includes("success") ? "#15803d" : "#dc2626",
            }}
          >
            {bulkMessage}
          </span>
        </div>
      </div>

      {/* ASSIGNMENTS TABLE TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 15 }}>
        <input
          type="text"
          id="searchAssignment"
          placeholder="Search assignments..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 300, width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />

        <button
          type="button"
          id="refreshAssignments"
          onClick={loadData}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {assignmentMessage && <p style={{ color: "red" }}>{assignmentMessage}</p>}

      {/* ASSIGNMENTS TABLE */}
      <div className="table-container" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflowX: "auto" }}>
        <table className="leads-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111827", color: "#fff" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Assignment ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Lead ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Agent</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Team ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Assigned At</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody id="assignmentsTableBody">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No assignments found.
                </td>
              </tr>
            ) : (
              filteredAssignments.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>{a.id}</td>
                  <td style={{ padding: "10px" }}>{a.leadId}</td>
                  <td style={{ padding: "10px" }}>{getAgentDisplayName(a.agentId)}</td>
                  <td style={{ padding: "10px" }}>{a.teamId || "-"}</td>
                  <td style={{ padding: "10px" }}>{a.assignedAt || "-"}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: a.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
                        color: a.status === "ACTIVE" ? "#166534" : "#4b5563",
                      }}
                    >
                      {a.status || "-"}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button
                      type="button"
                      className="view-lead-button"
                      onClick={() => router.push(`/lead-assignment-details?id=${a.id}`)}
                      style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
