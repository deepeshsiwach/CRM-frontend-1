"use client";

// ============================================================
// DERIVION CRM - CLOSED / DISPOSED LEADS PAGE
// Ported from closed-leads.html + closed-leads.js
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserRole, getUserId } from "@/lib/auth";
import type { Chart as ChartType } from "chart.js";

interface Lead {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  courseInterested?: string;
  leadSource?: string;
  status?: string;
  priority?: string;
  city?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface Assignment {
  id: number;
  leadId: number;
  agentId: number;
  status?: string;
  [key: string]: unknown;
}

interface User {
  id: number;
  fullName: string;
  role: string;
}

const FINAL_STATUSES = ["ENROLLED", "NOT_INTERESTED", "LOST", "WRONG_NUMBER"];

export default function ClosedLeadsPage() {
  const router = useRouter();

  const [allClosedLeads, setAllClosedLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Summary Metrics
  const [totalClosed, setTotalClosed] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [notInterestedCount, setNotInterestedCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [conversionRate, setConversionRate] = useState("0%");

  // Canvas refs for Chart.js
  const outcomeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const successCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outcomeChartRef = useRef<ChartType | null>(null);
  const successChartRef = useRef<ChartType | null>(null);

  const token = getToken();

  const getAgentName = useCallback(
    (leadId: number): string => {
      const leadAssignments = assignments.filter((a) => Number(a.leadId) === Number(leadId));
      if (!leadAssignments.length) return "Unassigned";

      const active = leadAssignments.find((a) => String(a.status || "").toUpperCase() === "ACTIVE");
      const latest = active || leadAssignments[leadAssignments.length - 1];
      const user = users.find((u) => Number(u.id) === Number(latest.agentId));
      return user ? user.fullName : `Agent ${latest.agentId}`;
    },
    [assignments, users]
  );

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    const role = getUserRole();
    const currentUserId = Number(getUserId());
    setUserRole(role);

    try {
      const headers = { Authorization: "Bearer " + token };

      // 1. Leads
      const leadsRes = await fetch(`${API_BASE_URL}/api/leads`, { headers });
      if (!leadsRes.ok) throw new Error("Failed to load leads");
      const leads: Lead[] = await leadsRes.json();

      // 2. Assignments
      let assignmentsData: Assignment[] = [];
      if (role === "AGENT") {
        const aRes = await fetch(`${API_BASE_URL}/api/lead-assignments/agent/${currentUserId}`, { headers });
        if (aRes.ok) assignmentsData = await aRes.json();
      } else {
        const aRes = await fetch(`${API_BASE_URL}/api/lead-assignments`, { headers });
        if (aRes.ok) assignmentsData = await aRes.json();
      }
      setAssignments(assignmentsData);

      // 3. Users
      const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
      let usersData: User[] = [];
      if (usersRes.ok) {
        usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Filter closed leads
      let closed = leads.filter((l) =>
        FINAL_STATUSES.includes(String(l.status || "").toUpperCase())
      );

      if (role === "AGENT") {
        closed = closed.filter((lead) =>
          assignmentsData.some(
            (a) => Number(a.leadId) === Number(lead.id) && Number(a.agentId) === currentUserId
          )
        );
      }

      setAllClosedLeads(closed);
      setFilteredLeads(closed);
    } catch (err) {
      console.error("Failed to load closed leads data:", err);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters
  useEffect(() => {
    let result = [...allClosedLeads];

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter((l) => {
        const agent = getAgentName(l.id).toLowerCase();
        return (
          String(l.id).toLowerCase().includes(s) ||
          (l.fullName || "").toLowerCase().includes(s) ||
          (l.phone || "").toLowerCase().includes(s) ||
          (l.email || "").toLowerCase().includes(s) ||
          (l.courseInterested || "").toLowerCase().includes(s) ||
          agent.includes(s)
        );
      });
    }

    if (statusFilter) {
      result = result.filter((l) => String(l.status || "").toUpperCase() === statusFilter);
    }

    if (agentFilter) {
      result = result.filter((l) => getAgentName(l.id) === agentFilter);
    }

    if (dateFilter) {
      const now = new Date();
      result = result.filter((l) => {
        const dateStr = (l.updatedAt || l.createdAt || "") as string;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;

        if (dateFilter === "today") {
          return d.toDateString() === now.toDateString();
        }
        if (dateFilter === "7days") {
          const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          return diff <= 7;
        }
        if (dateFilter === "30days") {
          const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          return diff <= 30;
        }
        return true;
      });
    }

    setFilteredLeads(result);

    // Update Summary Metrics
    const total = result.length;
    const enrolled = result.filter((l) => String(l.status || "").toUpperCase() === "ENROLLED").length;
    const notInterested = result.filter((l) => String(l.status || "").toUpperCase() === "NOT_INTERESTED").length;
    const lostOrWrong = result.filter((l) => {
      const st = String(l.status || "").toUpperCase();
      return st === "LOST" || st === "WRONG_NUMBER";
    }).length;
    const convRate = total > 0 ? ((enrolled / total) * 100).toFixed(1) + "%" : "0%";

    setTotalClosed(total);
    setEnrolledCount(enrolled);
    setNotInterestedCount(notInterested);
    setLostCount(lostOrWrong);
    setConversionRate(convRate);
  }, [allClosedLeads, searchTerm, statusFilter, agentFilter, dateFilter, getAgentName]);

  // Update Charts when filtered data changes
  useEffect(() => {
    let active = true;

    async function buildCharts() {
      const Chart = (await import("chart.js/auto")).default;
      if (!active) return;

      const enrolled = filteredLeads.filter((l) => String(l.status).toUpperCase() === "ENROLLED").length;
      const notInterested = filteredLeads.filter((l) => String(l.status).toUpperCase() === "NOT_INTERESTED").length;
      const lost = filteredLeads.filter((l) => String(l.status).toUpperCase() === "LOST").length;
      const wrong = filteredLeads.filter((l) => String(l.status).toUpperCase() === "WRONG_NUMBER").length;

      // 1. Outcome chart
      if (outcomeCanvasRef.current) {
        if (outcomeChartRef.current) outcomeChartRef.current.destroy();
        outcomeChartRef.current = new Chart(outcomeCanvasRef.current, {
          type: "doughnut",
          data: {
            labels: ["Enrolled", "Not Interested", "Lost", "Wrong Number"],
            datasets: [
              {
                data: [enrolled, notInterested, lost, wrong],
                backgroundColor: ["#15803d", "#f59e0b", "#dc2626", "#6b7280"],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });
      }

      // 2. Conversion chart
      if (successCanvasRef.current) {
        if (successChartRef.current) successChartRef.current.destroy();
        const other = filteredLeads.length - enrolled;
        successChartRef.current = new Chart(successCanvasRef.current, {
          type: "doughnut",
          data: {
            labels: ["Enrolled", "Other Disposed"],
            datasets: [
              {
                data: [enrolled, other],
                backgroundColor: ["#15803d", "#e2e8f0"],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });
      }
    }

    buildCharts();

    return () => {
      active = false;
      if (outcomeChartRef.current) outcomeChartRef.current.destroy();
      if (successChartRef.current) successChartRef.current.destroy();
    };
  }, [filteredLeads]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setAgentFilter("");
    setDateFilter("");
  };

  return (
    <DashboardLayout activeMenu="closed-leads">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Closed / Disposed Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Leads that have reached a final outcome state.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push("/leads")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Active Leads &rarr;
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Closed</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalClosed}</div>
            <span className="text-xs text-gray-400 mt-0.5 block">Disposed leads</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm bg-green-50/20">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider block">Enrolled</span>
            <div className="text-2xl font-bold text-green-700 mt-1">{enrolledCount}</div>
            <span className="text-xs text-green-600 mt-0.5 block">Converted</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Not Interested</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{notInterestedCount}</div>
            <span className="text-xs text-amber-600 mt-0.5 block">Declined offers</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/20">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider block">Lost / Wrong No.</span>
            <div className="text-2xl font-bold text-red-700 mt-1">{lostCount}</div>
            <span className="text-xs text-red-600 mt-0.5 block">Unreachable</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20 col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Conversion Rate</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{conversionRate}</div>
            <span className="text-xs text-emerald-600 mt-0.5 block">Enrolled / Total</span>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Outcome Breakdown</h3>
            <div className="relative h-64 w-full">
              <canvas ref={outcomeCanvasRef} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Conversion Ratio</h3>
            <div className="relative h-64 w-full">
              <canvas ref={successCanvasRef} />
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <input
            type="text"
            placeholder="Search closed leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Closed Statuses</option>
            <option value="ENROLLED">ENROLLED</option>
            <option value="NOT_INTERESTED">NOT_INTERESTED</option>
            <option value="LOST">LOST</option>
            <option value="WRONG_NUMBER">WRONG_NUMBER</option>
          </select>

          {userRole !== "AGENT" && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              {users
                .filter((u) => String(u.role).toUpperCase() === "AGENT")
                .map((u) => (
                  <option key={u.id} value={u.fullName}>
                    {u.fullName}
                  </option>
                ))}
            </select>
          )}

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">S.No.</th>
                  <th className="px-4 py-3 font-semibold">Lead ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Final Status</th>
                  <th className="px-4 py-3 font-semibold text-center sticky right-0 bg-gray-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      Loading closed leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No closed leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">{lead.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.fullName || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.phone || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.courseInterested || "-"}</td>
                      <td className="px-4 py-3 text-gray-800">{getAgentName(lead.id)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-${(lead.status || "").toLowerCase().replace(/_/g, "-")}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => router.push(`/lead-details?id=${lead.id}`)}
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
