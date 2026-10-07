"use client";

// ============================================================
// DERIVION CRM - FOLLOW-UPS PAGE
// Ported from follow-ups.html + follow-ups.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface FollowUp {
  id: number;
  leadId: number;
  agentId: number;
  followUpDate?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
  [key: string]: unknown;
}

interface Lead {
  id: number;
  fullName?: string;
  name?: string;
}

interface User {
  id: number;
  fullName?: string;
  name?: string;
  username?: string;
}

export default function FollowUpsPage() {
  const router = useRouter();

  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [filteredFollowUps, setFilteredFollowUps] = useState<FollowUp[]>([]);
  const [leadNameMap, setLeadNameMap] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});

  const [searchText, setSearchText] = useState("");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const token = getToken();

  const getDueCategory = (fu: FollowUp): string => {
    if (fu.status !== "PENDING" || !fu.followUpDate) return "OTHER";
    const fuDate = fu.followUpDate.split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (fuDate < today) return "OVERDUE";
    if (fuDate === today) return "TODAY";
    if (fuDate > today) return "UPCOMING";
    return "OTHER";
  };

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    const headers = { Authorization: "Bearer " + token };

    try {
      const [fuRes, leadsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/follow-ups`, { headers }),
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/users`, { headers }),
      ]);

      if (!fuRes.ok) throw new Error("Failed to load follow-ups.");
      const followUps: FollowUp[] = await fuRes.json();
      setAllFollowUps(followUps);
      setFilteredFollowUps(followUps);

      if (leadsRes.ok) {
        const leads: Lead[] = await leadsRes.json();
        const lMap: Record<string, string> = {};
        leads.forEach((l) => {
          lMap[String(l.id)] = l.fullName || l.name || "Unknown Lead";
        });
        setLeadNameMap(lMap);
      }

      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        const uMap: Record<string, string> = {};
        users.forEach((u) => {
          uMap[String(u.id)] = u.fullName || u.name || u.username || "Unknown Agent";
        });
        setUserNameMap(uMap);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters
  useEffect(() => {
    let result = [...allFollowUps];

    // Due Filter
    if (dueFilter !== "ALL") {
      result = result.filter((fu) => getDueCategory(fu) === dueFilter);
    }

    // Search Filter
    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();
      result = result.filter((fu) => {
        const leadName = (leadNameMap[String(fu.leadId)] || "").toLowerCase();
        const agentName = (userNameMap[String(fu.agentId)] || "").toLowerCase();
        return (
          String(fu.id ?? "").toLowerCase().includes(s) ||
          String(fu.leadId ?? "").toLowerCase().includes(s) ||
          String(fu.agentId ?? "").toLowerCase().includes(s) ||
          leadName.includes(s) ||
          agentName.includes(s) ||
          String(fu.followUpDate ?? "").toLowerCase().includes(s) ||
          String(fu.status ?? "").toLowerCase().includes(s) ||
          String(fu.remarks ?? "").toLowerCase().includes(s)
        );
      });
      setMessage(result.length === 0 ? "No matching follow-ups found." : `${result.length} follow-up(s) found.`);
    } else {
      setMessage("");
    }

    setFilteredFollowUps(result);
  }, [searchText, dueFilter, allFollowUps, leadNameMap, userNameMap]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Follow-up ID ${id}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/follow-ups/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to delete follow-up.");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Unable to delete follow-up.");
    }
  };

  return (
    <DashboardLayout activeMenu="follow-ups" title="Follow-ups">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 15, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
          <input
            type="text"
            id="searchFollowUp"
            placeholder="Search follow-ups..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 280, width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          />

          <select
            id="followUpDueFilter"
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="ALL">All Follow-ups</option>
            <option value="OVERDUE">Overdue</option>
            <option value="TODAY">Due Today</option>
            <option value="UPCOMING">Upcoming</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/add-follow-up")}
            style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
          >
            + Add Follow-up
          </button>
          <button
            type="button"
            onClick={loadData}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {message && <p id="followUpMessage" style={{ color: "#2563eb", fontSize: 13, margin: "6px 0 12px" }}>{message}</p>}

      <div className="table-container" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflowX: "auto" }}>
        <table className="leads-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111827", color: "#fff" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Lead</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Agent</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Date</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Time</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Remarks</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody id="followUpsTableBody">
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Loading follow-ups...</td>
              </tr>
            ) : filteredFollowUps.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No follow-ups found.
                </td>
              </tr>
            ) : (
              filteredFollowUps.map((fu) => {
                const dateTime = fu.followUpDate || "";
                let fuDate = "";
                let fuTime = "";
                if (dateTime.includes("T")) {
                  const parts = dateTime.split("T");
                  fuDate = parts[0];
                  fuTime = parts[1];
                } else {
                  fuDate = dateTime;
                }

                return (
                  <tr key={fu.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px" }}>{fu.id}</td>
                    <td style={{ padding: "10px" }}>
                      <strong>{leadNameMap[String(fu.leadId)] || "Unknown Lead"}</strong>
                      <br />
                      <small style={{ color: "#6b7280" }}>ID: {fu.leadId}</small>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <strong>{userNameMap[String(fu.agentId)] || "Unknown Agent"}</strong>
                      <br />
                      <small style={{ color: "#6b7280" }}>ID: {fu.agentId}</small>
                    </td>
                    <td style={{ padding: "10px" }}>{fuDate}</td>
                    <td style={{ padding: "10px" }}>{fuTime}</td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            fu.status === "PENDING"
                              ? "#fef3c7"
                              : fu.status === "COMPLETED"
                              ? "#dcfce7"
                              : "#f3f4f6",
                          color:
                            fu.status === "PENDING"
                              ? "#92400e"
                              : fu.status === "COMPLETED"
                              ? "#166534"
                              : "#374151",
                        }}
                      >
                        {fu.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fu.remarks || "-"}
                    </td>
                    <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => router.push(`/follow-up-details?id=${fu.id}`)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/edit-follow-up?id=${fu.id}`)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(fu.id)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
