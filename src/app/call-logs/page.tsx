"use client";

// ============================================================
// DERIVION CRM - CALL LOGS PAGE
// Ported from call-logs.html + call-logs.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface CallLog {
  id: number;
  leadId: number;
  agentId: number;
  callStartTime?: string;
  callEndTime?: string;
  durationSeconds?: number;
  callStatus?: string;
  callOutcome?: string;
  remarks?: string;
  [key: string]: unknown;
}

interface Lead {
  id: number;
  name?: string;
  fullName?: string;
}

interface User {
  id: number;
  name?: string;
  fullName?: string;
}

export default function CallLogsPage() {
  const router = useRouter();

  const [allCallLogs, setAllCallLogs] = useState<CallLog[]>([]);
  const [filteredCallLogs, setFilteredCallLogs] = useState<CallLog[]>([]);
  const [leadNameMap, setLeadNameMap] = useState<Record<number, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<number, string>>({});
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const token = getToken();

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    const headers = { Authorization: "Bearer " + token };

    try {
      const [callLogsRes, leadsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/call-logs`, { headers }),
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/users`, { headers }),
      ]);

      if (!callLogsRes.ok) throw new Error("Failed to load call logs");
      const callLogs: CallLog[] = await callLogsRes.json();
      setAllCallLogs(callLogs);
      setFilteredCallLogs(callLogs);

      if (leadsRes.ok) {
        const leads: Lead[] = await leadsRes.json();
        const lMap: Record<number, string> = {};
        leads.forEach((l) => {
          lMap[l.id] = l.name || l.fullName || "Unknown Lead";
        });
        setLeadNameMap(lMap);
      }

      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        const uMap: Record<number, string> = {};
        users.forEach((u) => {
          uMap[u.id] = u.fullName || u.name || "Unknown User";
        });
        setUserNameMap(uMap);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unable to load call logs.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search filter
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredCallLogs(allCallLogs);
      return;
    }
    const s = searchText.toLowerCase().trim();
    const filtered = allCallLogs.filter((log) => {
      const leadName = (leadNameMap[log.leadId] || "").toLowerCase();
      const agentName = (userNameMap[log.agentId] || "").toLowerCase();
      return (
        String(log.id).toLowerCase().includes(s) ||
        String(log.leadId).toLowerCase().includes(s) ||
        String(log.agentId).toLowerCase().includes(s) ||
        leadName.includes(s) ||
        agentName.includes(s) ||
        (log.callStartTime || "").toLowerCase().includes(s) ||
        (log.callEndTime || "").toLowerCase().includes(s) ||
        String(log.durationSeconds || "").toLowerCase().includes(s) ||
        (log.callStatus || "").toLowerCase().includes(s) ||
        (log.callOutcome || "").toLowerCase().includes(s) ||
        (log.remarks || "").toLowerCase().includes(s)
      );
    });
    setFilteredCallLogs(filtered);
  }, [searchText, allCallLogs, leadNameMap, userNameMap]);

  return (
    <DashboardLayout activeMenu="call-logs" title="Call Logs">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 15 }}>
        <input
          type="text"
          id="searchCallLog"
          placeholder="Search call logs..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 300, width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/add-call-log")}
            style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
          >
            + Add Call Log
          </button>
          <button
            type="button"
            id="refreshCallLogs"
            onClick={loadData}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {message && <p id="callLogMessage" style={{ color: "red" }}>{message}</p>}

      <div className="table-container" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflowX: "auto" }}>
        <table className="leads-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111827", color: "#fff" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Call ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Lead</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Agent</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Start Time</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>End Time</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Duration (s)</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Outcome</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Remarks</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody id="callLogsTableBody">
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24 }}>Loading call logs...</td>
              </tr>
            ) : filteredCallLogs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No call logs found.
                </td>
              </tr>
            ) : (
              filteredCallLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>{log.id}</td>
                  <td style={{ padding: "10px" }}>
                    <strong>{leadNameMap[log.leadId] || "Unknown Lead"}</strong>
                    <br />
                    <small style={{ color: "#6b7280" }}>ID: {log.leadId}</small>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <strong>{userNameMap[log.agentId] || "Unknown User"}</strong>
                    <br />
                    <small style={{ color: "#6b7280" }}>ID: {log.agentId}</small>
                  </td>
                  <td style={{ padding: "10px", fontSize: 13 }}>{log.callStartTime || "-"}</td>
                  <td style={{ padding: "10px", fontSize: 13 }}>{log.callEndTime || "-"}</td>
                  <td style={{ padding: "10px" }}>{log.durationSeconds ?? "-"}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                      }}
                    >
                      {log.callStatus || "-"}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>{log.callOutcome || "-"}</td>
                  <td style={{ padding: "10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.remarks || "-"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button
                      type="button"
                      className="view-lead-button"
                      onClick={() => router.push(`/call-log-details?id=${log.id}`)}
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
