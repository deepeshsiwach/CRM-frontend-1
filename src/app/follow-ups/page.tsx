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

    if (dueFilter !== "ALL") {
      result = result.filter((fu) => getDueCategory(fu) === dueFilter);
    }

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

  const statusBadge = (status: string | undefined) => {
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800";
    if (status === "COMPLETED") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-700";
  };

  const inputCls = "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const thCls = "px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider";
  const tdCls = "px-3 py-3 text-sm text-gray-700 border-t border-gray-100";

  return (
    <DashboardLayout activeMenu="follow-ups" title="Follow-ups">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            id="searchFollowUp"
            placeholder="Search follow-ups..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`${inputCls} max-w-xs w-full`}
          />
          <select
            id="followUpDueFilter"
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            className={inputCls}
          >
            <option value="ALL">All Follow-ups</option>
            <option value="OVERDUE">Overdue</option>
            <option value="TODAY">Due Today</option>
            <option value="UPCOMING">Upcoming</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/add-follow-up")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add Follow-up
          </button>
          <button
            type="button"
            onClick={loadData}
            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {message && (
        <p id="followUpMessage" className="text-blue-600 text-sm font-medium mb-3">{message}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-900">
              <tr>
                <th className={thCls}>ID</th>
                <th className={thCls}>Lead</th>
                <th className={thCls}>Agent</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Time</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Remarks</th>
                <th className={thCls}>Action</th>
              </tr>
            </thead>
            <tbody id="followUpsTableBody">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Loading follow-ups...</td></tr>
              ) : filteredFollowUps.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No follow-ups found.</td></tr>
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
                    <tr key={fu.id} className="hover:bg-gray-50 transition-colors">
                      <td className={tdCls}>{fu.id}</td>
                      <td className={tdCls}>
                        <span className="font-semibold text-gray-800">{leadNameMap[String(fu.leadId)] || "Unknown Lead"}</span>
                        <br />
                        <span className="text-xs text-gray-400">ID: {fu.leadId}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="font-semibold text-gray-800">{userNameMap[String(fu.agentId)] || "Unknown Agent"}</span>
                        <br />
                        <span className="text-xs text-gray-400">ID: {fu.agentId}</span>
                      </td>
                      <td className={tdCls}>{fuDate}</td>
                      <td className={tdCls}>{fuTime}</td>
                      <td className={tdCls}>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(fu.status)}`}>
                          {fu.status}
                        </span>
                      </td>
                      <td className={`${tdCls} max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap`}>{fu.remarks || "-"}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <button type="button" onClick={() => router.push(`/follow-up-details?id=${fu.id}`)}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1">View</button>
                        <button type="button" onClick={() => router.push(`/edit-follow-up?id=${fu.id}`)}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1">Edit</button>
                        <button type="button" onClick={() => handleDelete(fu.id)}
                          className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
