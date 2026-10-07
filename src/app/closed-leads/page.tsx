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

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase().replace(/_/g, "-");
    return `status-badge status-${s}`;
  };

  return (
    <DashboardLayout activeMenu="closed-leads">
      <div className="closed-page">
        {/* HEADER */}
        <div className="closed-header">
          <div>
            <h2 style={{ margin: 0 }}>Closed / Disposed Leads</h2>
            <p>Leads that have reached a final outcome state</p>
          </div>
          <div className="closed-actions">
            <button type="button" onClick={loadData}>Refresh</button>
            <button type="button" onClick={() => router.push("/leads")}>Active Leads</button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="closed-cards">
          <div className="closed-card">
            <h3>TOTAL CLOSED</h3>
            <div className="value">{totalClosed}</div>
            <div className="sub">Disposed leads</div>
          </div>

          <div className="closed-card success">
            <h3>ENROLLED</h3>
            <div className="value">{enrolledCount}</div>
            <div className="sub">Successfully converted</div>
          </div>

          <div className="closed-card">
            <h3>NOT INTERESTED</h3>
            <div className="value">{notInterestedCount}</div>
            <div className="sub">Declined offers</div>
          </div>

          <div className="closed-card danger">
            <h3>LOST / UNREACHABLE</h3>
            <div className="value">{lostCount}</div>
            <div className="sub">Lost or wrong numbers</div>
          </div>

          <div className="closed-card success">
            <h3>CONVERSION RATE</h3>
            <div className="value">{conversionRate}</div>
            <div className="sub">Enrolled / Total Closed</div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="closed-chart-grid">
          <div className="closed-chart-card">
            <h3>Outcome Breakdown</h3>
            <div className="closed-chart-wrap">
              <canvas ref={outcomeCanvasRef} />
            </div>
          </div>

          <div className="closed-chart-card">
            <h3>Conversion Ratio</h3>
            <div className="closed-chart-wrap">
              <canvas ref={successCanvasRef} />
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="closed-toolbar">
          <input
            type="text"
            placeholder="Search closed leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Closed Statuses</option>
            <option value="ENROLLED">ENROLLED</option>
            <option value="NOT_INTERESTED">NOT_INTERESTED</option>
            <option value="LOST">LOST</option>
            <option value="WRONG_NUMBER">WRONG_NUMBER</option>
          </select>

          {userRole !== "AGENT" && (
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
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

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          <button type="button" onClick={clearFilters}>Clear</button>
        </div>

        {/* TABLE */}
        <div className="closed-table-container">
          <table className="closed-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Lead ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Course</th>
                <th>Agent</th>
                <th>Final Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Loading closed leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No closed leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => (
                  <tr key={lead.id}>
                    <td>{idx + 1}</td>
                    <td>{lead.id}</td>
                    <td><strong>{lead.fullName || "-"}</strong></td>
                    <td>{lead.phone || "-"}</td>
                    <td>{lead.courseInterested || "-"}</td>
                    <td>{getAgentName(lead.id)}</td>
                    <td>
                      <span className={getStatusBadgeClass(lead.status || "")}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
                        onClick={() => router.push(`/lead-details?id=${lead.id}`)}
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
