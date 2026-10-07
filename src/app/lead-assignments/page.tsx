"use client";

// ============================================================
// DERIVION CRM - LEAD ASSIGNMENTS PAGE
// Ported from lead-assignments.html + lead-assignments.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Assignments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Distribute and monitor lead allocations to agents and teams.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Dashboard
          </button>
        </div>

        {/* BULK ASSIGNMENT SECTION */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900">Bulk Lead Assignment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select an agent, optional team, and leads to assign in bulk.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Agent
              </label>
              <select
                id="bulkAgentSelect"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Team
              </label>
              <select
                id="bulkTeamSelect"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Quantity
              </label>
              <select
                id="bulkQuantitySelect"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Enter Quantity:
              </label>
              <input
                type="number"
                id="bulkCustomQuantity"
                min={1}
                className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customQuantity}
                onChange={(e) => handleCustomQuantity(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="selectAllBulkLeads"
                checked={unassignedLeads.length > 0 && selectedLeadIds.length === unassignedLeads.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              Select All Unassigned Leads ({unassignedLeads.length})
            </label>

            <span className="text-xs font-semibold text-blue-600">
              Selected Leads: {selectedLeadIds.length}
            </span>
          </div>

          {/* BULK LEADS CONTAINER */}
          <div
            id="bulkLeadSelection"
            className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50/50"
          >
            {unassignedLeads.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400">No unassigned leads available.</p>
            ) : (
              unassignedLeads.map((lead) => (
                <label
                  key={lead.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-white transition-colors cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => handleToggleLead(lead.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <span className="font-semibold text-gray-900">
                      {lead.fullName || "Unnamed Lead"}
                    </span>
                    <span className="text-xs text-gray-400">
                      ID: {lead.id}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium status-${(lead.status || "new").toLowerCase()}`}>
                      {lead.status || "NEW"}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              id="bulkAssignButton"
              disabled={bulkAssigning}
              onClick={handleBulkAssign}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {bulkAssigning
                ? "Assigning..."
                : selectedLeadIds.length > 0
                ? `Assign ${selectedLeadIds.length} Leads`
                : "Assign Selected Leads"}
            </button>

            {bulkMessage && (
              <span
                className={`text-xs font-semibold ${
                  bulkMessage.includes("success") ? "text-green-600" : "text-red-600"
                }`}
              >
                {bulkMessage}
              </span>
            )}
          </div>
        </div>

        {/* ASSIGNMENTS TABLE TOOLBAR */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <input
            type="text"
            id="searchAssignment"
            placeholder="Search assignments..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />

          <button
            type="button"
            id="refreshAssignments"
            onClick={loadData}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {assignmentMessage && (
          <div className="p-3 rounded-lg text-sm font-medium border bg-red-50 text-red-700 border-red-200">
            {assignmentMessage}
          </div>
        )}

        {/* ASSIGNMENTS TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Assignment ID</th>
                  <th className="px-4 py-3 font-semibold">Lead ID</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Team ID</th>
                  <th className="px-4 py-3 font-semibold">Assigned At</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center sticky right-0 bg-gray-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.id}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">{a.leadId}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{getAgentDisplayName(a.agentId)}</td>
                      <td className="px-4 py-3 text-gray-500">{a.teamId || "-"}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.assignedAt || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            a.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {a.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => router.push(`/lead-assignment-details?id=${a.id}`)}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors"
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
        </div>
      </div>
    </DashboardLayout>
  );
}
