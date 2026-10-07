"use client";

// ============================================================
// DERIVION CRM - DASHBOARD PAGE
// Ported from dashboard.html + dashboard.js
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserRole } from "@/lib/auth";
import type { Chart as ChartType } from "chart.js";

// ============================================================
// TYPES
// ============================================================

interface Assignment {
  leadId: number | null | undefined;
  agentId?: number;
  agentName?: string;
  [key: string]: unknown;
}

interface CallLog {
  leadId: number | null | undefined;
  agentId?: number;
  callStartTime: string;
  [key: string]: unknown;
}

interface FollowUp {
  status: string;
  followUpDate?: string;
  scheduledDate?: string;
  date?: string;
  followUpTime?: string;
  [key: string]: unknown;
}

interface Lead {
  id: number;
  status: string;
  fullName?: string;
  courseInterested?: string;
  leadSource?: string;
  campaignId?: number | null;
  [key: string]: unknown;
}

interface AgentPerformance {
  agentName: string;
  activeLeads: number;
  totalCalls: number;
  enrolled: number;
}

interface Campaign {
  campaignName: string;
  source: string;
  status: string;
  totalLeads: number;
  enrolled: number;
}

interface LeadSource {
  source: string;
  count: number;
  enrolled: number;
}

// ============================================================
// HELPERS
// ============================================================

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCallFromToday(call: CallLog): boolean {
  if (!call || !call.callStartTime) return false;
  const date = new Date(call.callStartTime);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` === getTodayDateString();
}

function calculateAgentWorkSummary(assignments: Assignment[], calls: CallLog[]) {
  const assignedLeadIds = new Set<string>();
  assignments.forEach((a) => {
    if (a && a.leadId != null) assignedLeadIds.add(String(a.leadId));
  });

  const todayCalls = calls.filter(isCallFromToday);
  const attendedLeadIds = new Set<string>();
  todayCalls.forEach((call) => {
    if (call && call.leadId != null) {
      const leadId = String(call.leadId);
      if (assignedLeadIds.has(leadId)) attendedLeadIds.add(leadId);
    }
  });

  const totalLeads = assignedLeadIds.size;
  const attendedLeads = attendedLeadIds.size;
  const remainingLeads = Math.max(0, totalLeads - attendedLeads);
  return { totalLeads, attendedLeads, remainingLeads };
}

// ============================================================
// DASHBOARD PAGE
// ============================================================

export default function DashboardPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");

  // Dashboard card stats
  const [totalLeads, setTotalLeads] = useState(0);
  const [attendedLeads, setAttendedLeads] = useState(0);
  const [remainingLeads, setRemainingLeads] = useState(0);
  const [totalFollowUps, setTotalFollowUps] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [pendingFollowUps, setPendingFollowUps] = useState(0);
  const [completedFollowUps, setCompletedFollowUps] = useState(0);
  const [missedFollowUps, setMissedFollowUps] = useState(0);
  const [cancelledFollowUps, setCancelledFollowUps] = useState(0);
  const [todayFollowUps, setTodayFollowUps] = useState(0);
  const [unassignedLeads, setUnassignedLeads] = useState(0);

  // Analytics
  const [agentPerformanceData, setAgentPerformanceData] = useState<AgentPerformance[]>([]);
  const [campaignPerformanceData, setCampaignPerformanceData] = useState<Campaign[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<LeadSource[]>([]);

  // Chart refs
  const leadOverviewChartRef = useRef<ChartType | null>(null);
  const crmActivityChartRef = useRef<ChartType | null>(null);
  const agentLeadDistChartRef = useRef<ChartType | null>(null);

  const leadOverviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const crmActivityCanvasRef = useRef<HTMLCanvasElement>(null);
  const agentLeadDistCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }
    const role = getUserRole();
    setUserRole(role);
    loadDashboard(token, role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function renderSummaryCharts(summary: Record<string, unknown>, role: string) {
    const Chart = (await import("chart.js/auto")).default;

    // Lead Overview
    const statusCounts = (summary.leadStatusCounts as Record<string, number>) || {};
    if (leadOverviewCanvasRef.current) {
      if (leadOverviewChartRef.current) leadOverviewChartRef.current.destroy();
      leadOverviewChartRef.current = new Chart(leadOverviewCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1"],
          }],
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } },
      });
    }

    // CRM Activity
    if (crmActivityCanvasRef.current) {
      if (crmActivityChartRef.current) crmActivityChartRef.current.destroy();
      crmActivityChartRef.current = new Chart(crmActivityCanvasRef.current, {
        type: "bar",
        data: {
          labels: ["Total Leads", "Assignments", "Call Logs", "Follow-ups"],
          datasets: [{
            label: "Count",
            data: [
              (summary.totalLeads as number) || 0,
              (summary.assignedLeads as number) || 0,
              (summary.totalCalls as number) || 0,
              (summary.totalFollowUps as number) || 0,
            ],
            backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"],
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }

    if (role === "AGENT") return;

    // Agent Lead Distribution
    const agentDist = Array.isArray(summary.agentLeadDistribution) ? summary.agentLeadDistribution : [];
    if (agentLeadDistCanvasRef.current && agentDist.length > 0) {
      if (agentLeadDistChartRef.current) agentLeadDistChartRef.current.destroy();
      agentLeadDistChartRef.current = new Chart(agentLeadDistCanvasRef.current, {
        type: "bar",
        data: {
          labels: agentDist.map((a: Record<string, unknown>) => (a.agentName as string) || `Agent #${a.agentId}`),
          datasets: [{
            label: "Active Leads",
            data: agentDist.map((a: Record<string, unknown>) => (a.activeLeads as number) || 0),
            backgroundColor: "#2563eb",
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }
  }

  async function loadDashboard(token: string, role: string) {
    try {
      const headers = {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      };

      // FAST PATH: Single aggregated call for instant dashboard load
      try {
        const sumRes = await fetch(`${API_BASE_URL}/api/dashboard/summary`, { headers });
        if (sumRes.ok) {
          const summary = await sumRes.json();
          setTotalLeads(summary.totalLeads ?? 0);
          setAttendedLeads(summary.attendedLeads ?? 0);
          setRemainingLeads(summary.remainingLeads ?? 0);
          setTotalFollowUps(summary.totalFollowUps ?? 0);
          setTotalCalls(summary.totalCalls ?? 0);
          setPendingFollowUps(summary.pendingFollowUps ?? 0);
          setCompletedFollowUps(summary.completedFollowUps ?? 0);
          setMissedFollowUps(summary.missedFollowUps ?? 0);
          setCancelledFollowUps(summary.cancelledFollowUps ?? 0);
          setTodayFollowUps(summary.todayFollowUps ?? 0);
          setUnassignedLeads(summary.unassignedLeads ?? 0);

          if (role !== "AGENT") {
            if (Array.isArray(summary.agentPerformance)) {
              setAgentPerformanceData(summary.agentPerformance.map((a: Record<string, unknown>) => ({
                agentName: (a.agentName as string) || `Agent #${a.agentId}`,
                activeLeads: (a.activeLeads as number) ?? 0,
                totalCalls: (a.totalCalls as number) ?? 0,
                enrolled: (a.enrolledLeads as number) ?? 0,
              })));
            }
            if (Array.isArray(summary.campaignPerformance)) {
              setCampaignPerformanceData(summary.campaignPerformance.map((c: Record<string, unknown>) => ({
                campaignName: (c.campaignName as string) || "Campaign",
                source: (c.source as string) || "-",
                status: (c.status as string) || "ACTIVE",
                totalLeads: (c.totalLeads as number) ?? 0,
                enrolled: (c.enrolledLeads as number) ?? 0,
              })));
            }
            if (Array.isArray(summary.leadSourcePerformance)) {
              setLeadSourceData(summary.leadSourcePerformance.map((s: Record<string, unknown>) => ({
                source: (s.source as string) || "Unknown",
                count: (s.totalLeads as number) ?? 0,
                enrolled: (s.enrolledLeads as number) ?? 0,
              })));
            }
          }

          await renderSummaryCharts(summary, role);
          return;
        }
      } catch (sumErr) {
        console.warn("Summary endpoint failed, falling back to multi-query:", sumErr);
      }

      const [leadsRes, assignmentsRes, callsRes, followUpsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/lead-assignments`, { headers }),
        fetch(`${API_BASE_URL}/api/call-logs`, { headers }),
        fetch(`${API_BASE_URL}/api/follow-ups`, { headers }),
      ]);

      const leads: Lead[] = leadsRes.status === "fulfilled" && leadsRes.value.ok
        ? await leadsRes.value.json()
        : [];
      const assignments: Assignment[] = assignmentsRes.status === "fulfilled" && assignmentsRes.value.ok
        ? await assignmentsRes.value.json()
        : [];
      const calls: CallLog[] = callsRes.status === "fulfilled" && callsRes.value.ok
        ? await callsRes.value.json()
        : [];
      const followUps: FollowUp[] = followUpsRes.status === "fulfilled" && followUpsRes.value.ok
        ? await followUpsRes.value.json()
        : [];

      // ==================================================
      // AGENT WORK CARDS
      // ==================================================
      if (role === "AGENT") {
        const summary = calculateAgentWorkSummary(assignments, calls);
        setTotalLeads(summary.totalLeads);
        setAttendedLeads(summary.attendedLeads);
        setRemainingLeads(summary.remainingLeads);
      } else {
        // For admin/manager show total leads count
        setTotalLeads(leads.length);
      }

      // ==================================================
      // FOLLOW-UP CARDS
      // ==================================================
      setTotalFollowUps(followUps.length);
      const todayStr = getTodayDateString();
      let pending = 0, completed = 0, missed = 0, cancelled = 0, todayCount = 0;
      followUps.forEach((fu) => {
        const status = String(fu.status || "").toUpperCase();
        if (status === "PENDING") pending++;
        if (status === "COMPLETED") completed++;
        if (status === "MISSED") missed++;
        if (status === "CANCELLED") cancelled++;
        const dateVal = fu.followUpDate || fu.scheduledDate || fu.date || fu.followUpTime;
        if (dateVal) {
          const d = new Date(dateVal);
          if (!Number.isNaN(d.getTime())) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (ds === todayStr) todayCount++;
          }
        }
      });
      setPendingFollowUps(pending);
      setCompletedFollowUps(completed);
      setMissedFollowUps(missed);
      setCancelledFollowUps(cancelled);
      setTodayFollowUps(todayCount);

      // ==================================================
      // CALL COUNT
      // ==================================================
      setTotalCalls(calls.length);

      // ==================================================
      // UNASSIGNED LEADS (MANAGEMENT ONLY)
      // ==================================================
      if (role !== "AGENT") {
        const assignedIds = new Set(
          assignments.filter((a) => a.leadId != null).map((a) => String(a.leadId))
        );
        let unassigned = 0;
        leads.forEach((lead) => {
          const st = String(lead.status || "").toUpperCase();
          if (!["ENROLLED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER"].includes(st)) {
            if (!assignedIds.has(String(lead.id))) unassigned++;
          }
        });
        setUnassignedLeads(unassigned);
      }

      // ==================================================
      // CHARTS
      // ==================================================
      await buildCharts(leads, assignments, calls, role, token, headers);

    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }

  async function buildCharts(
    leads: Lead[],
    assignments: Assignment[],
    calls: CallLog[],
    role: string,
    token: string,
    headers: Record<string, string>
  ) {
    const Chart = (await import("chart.js/auto")).default;

    // ==================================================
    // LEAD OVERVIEW CHART
    // ==================================================
    const statusCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const st = lead.status || "UNKNOWN";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    if (leadOverviewCanvasRef.current) {
      if (leadOverviewChartRef.current) leadOverviewChartRef.current.destroy();
      leadOverviewChartRef.current = new Chart(leadOverviewCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1"],
          }],
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } },
      });
    }

    // ==================================================
    // CRM ACTIVITY CHART
    // ==================================================
    if (crmActivityCanvasRef.current) {
      if (crmActivityChartRef.current) crmActivityChartRef.current.destroy();
      crmActivityChartRef.current = new Chart(crmActivityCanvasRef.current, {
        type: "bar",
        data: {
          labels: ["Total Leads", "Assignments", "Call Logs", "Follow-ups"],
          datasets: [{
            label: "Count",
            data: [leads.length, assignments.length, calls.length, 0],
            backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"],
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }

    // ==================================================
    // MANAGEMENT-ONLY ANALYTICS
    // ==================================================
    if (role === "AGENT") return;

    // Agent Lead Distribution Chart
    const agentLeadMap: Record<string, Set<string>> = {};
    assignments.forEach((a) => {
      const name = (a as Record<string, unknown>).agentName as string || String((a as Record<string, unknown>).agentId || "Unknown");
      if (!agentLeadMap[name]) agentLeadMap[name] = new Set();
      if (a.leadId != null) agentLeadMap[name].add(String(a.leadId));
    });

    if (agentLeadDistCanvasRef.current) {
      if (agentLeadDistChartRef.current) agentLeadDistChartRef.current.destroy();
      const agentNames = Object.keys(agentLeadMap);
      const agentCounts = agentNames.map((n) => agentLeadMap[n].size);
      agentLeadDistChartRef.current = new Chart(agentLeadDistCanvasRef.current, {
        type: "bar",
        data: {
          labels: agentNames,
          datasets: [{
            label: "Active Leads",
            data: agentCounts,
            backgroundColor: "#2563eb",
          }],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
      });
    }

    // Agent Performance Table
    try {
      const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (usersRes.ok) {
        const users: Array<{id: number; fullName: string}> = await usersRes.json();
        const performance: AgentPerformance[] = users.map((u) => {
          const agentAssignments = assignments.filter((a) =>
            String((a as Record<string, unknown>).agentId) === String(u.id)
          );
          const agentCalls = calls.filter((c) =>
            String((c as Record<string, unknown>).agentId) === String(u.id)
          );
          const enrolled = leads.filter(
            (l) =>
              String(l.status).toUpperCase() === "ENROLLED" &&
              agentAssignments.some((a) => String(a.leadId) === String(l.id))
          ).length;
          return {
            agentName: u.fullName,
            activeLeads: agentAssignments.length,
            totalCalls: agentCalls.length,
            enrolled,
          };
        });
        setAgentPerformanceData(performance);
      }
    } catch { /* ignore */ }

    // Campaign Performance
    try {
      const campaignsRes = await fetch(`${API_BASE_URL}/api/campaigns`, { headers });
      if (campaignsRes.ok) {
        const campaigns: Array<{id: number; campaignName: string; source: string; status: string}> = await campaignsRes.json();
        const campaignData: Campaign[] = campaigns.map((c) => {
          const campaignLeads = leads.filter((l) => String((l as Record<string, unknown>).campaignId) === String(c.id));
          const enrolled = campaignLeads.filter((l) => String(l.status).toUpperCase() === "ENROLLED").length;
          return {
            campaignName: c.campaignName,
            source: c.source,
            status: c.status,
            totalLeads: campaignLeads.length,
            enrolled,
          };
        });
        setCampaignPerformanceData(campaignData);
      }
    } catch { /* ignore */ }

    // Lead Source Performance
    const sourceMap: Record<string, { count: number; enrolled: number }> = {};
    leads.forEach((l) => {
      const src = l.leadSource || "Unknown";
      if (!sourceMap[src]) sourceMap[src] = { count: 0, enrolled: 0 };
      sourceMap[src].count++;
      if (String(l.status).toUpperCase() === "ENROLLED") sourceMap[src].enrolled++;
    });
    setLeadSourceData(
      Object.entries(sourceMap).map(([source, d]) => ({ source, count: d.count, enrolled: d.enrolled }))
    );
  }

  const isManagement = userRole === "ADMIN" || userRole === "MANAGER";

  return (
    <DashboardLayout activeMenu="dashboard">
      {/* =====================================================
          ADD LEAD BUTTON
          ===================================================== */}
      <button
        type="button"
        className="add-lead-button"
        onClick={() => router.push("/add-lead")}
      >
        + Add Lead
      </button>

      {/* =====================================================
          DASHBOARD CARDS
          ===================================================== */}
      <div className="dashboard-cards">

        {/* TOTAL LEADS */}
        <div className="dashboard-card">
          <div className="card-icon">👥</div>
          <h3>Total Leads</h3>
          <p id="totalLeads">{totalLeads}</p>
          <span className="card-label">Currently assigned</span>
        </div>

        {/* ATTENDED LEADS */}
        <div className="dashboard-card" id="attendedLeadsCard">
          <div className="card-icon">☎️</div>
          <h3>Attended Leads</h3>
          <p id="attendedLeads">{attendedLeads}</p>
          <span className="card-label">Leads worked today</span>
        </div>

        {/* REMAINING LEADS */}
        <div className="dashboard-card" id="remainingLeadsCard">
          <div className="card-icon">⏳</div>
          <h3>Remaining Leads</h3>
          <p id="remainingLeads">{remainingLeads}</p>
          <span className="card-label">Yet to be worked</span>
        </div>

        {/* FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">📅</div>
          <h3>Follow-ups</h3>
          <p id="totalFollowUps">{totalFollowUps}</p>
          <span className="card-label">Scheduled activities</span>
        </div>

        {/* CALL LOGS */}
        <div className="dashboard-card">
          <div className="card-icon">📞</div>
          <h3>Call Logs</h3>
          <p id="totalCalls">{totalCalls}</p>
          <span className="card-label">Recorded calls</span>
        </div>

        {/* PENDING FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">⏳</div>
          <h3>Pending Follow-ups</h3>
          <p id="pendingFollowUps">{pendingFollowUps}</p>
          <span className="card-label">Waiting for action</span>
        </div>

        {/* COMPLETED FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">✅</div>
          <h3>Completed Follow-ups</h3>
          <p id="completedFollowUps">{completedFollowUps}</p>
          <span className="card-label">Successfully completed</span>
        </div>

        {/* MISSED FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">⚠️</div>
          <h3>Missed Follow-ups</h3>
          <p id="missedFollowUps">{missedFollowUps}</p>
          <span className="card-label">Require attention</span>
        </div>

        {/* CANCELLED FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">❌</div>
          <h3>Cancelled Follow-ups</h3>
          <p id="cancelledFollowUps">{cancelledFollowUps}</p>
          <span className="card-label">Cancelled activities</span>
        </div>

        {/* TODAY'S FOLLOW-UPS */}
        <div className="dashboard-card">
          <div className="card-icon">📆</div>
          <h3>Today&apos;s Follow-ups</h3>
          <p id="todayFollowUps">{todayFollowUps}</p>
          <span className="card-label">Due today</span>
        </div>

        {/* UNASSIGNED LEADS - MANAGEMENT ONLY */}
        {isManagement && (
          <div className="dashboard-card management-only" id="unassignedLeadsCard">
            <div className="card-icon">📥</div>
            <h3>Unassigned Leads</h3>
            <p id="unassignedLeads">{unassignedLeads}</p>
            <span className="card-label">Open leads awaiting assignment</span>
          </div>
        )}

      </div>

      {/* =====================================================
          ANALYTICS AREA
          ===================================================== */}
      <div className="dashboard-analytics">

        {/* LEAD OVERVIEW */}
        <div className="analytics-card analytics-large">
          <div className="analytics-header">
            <div>
              <h3>Lead Overview</h3>
              <p>Current lead distribution</p>
            </div>
          </div>
          <div className="chart-container">
            <canvas id="leadOverviewChart" ref={leadOverviewCanvasRef}></canvas>
          </div>
        </div>

        {/* CRM ACTIVITY */}
        <div className="analytics-card">
          <div className="analytics-header">
            <div>
              <h3>CRM Activity</h3>
              <p>Current activity summary</p>
            </div>
          </div>
          <div className="chart-container">
            <canvas id="crmActivityChart" ref={crmActivityCanvasRef}></canvas>
          </div>
        </div>

        {/* AGENT LEAD DISTRIBUTION - MANAGEMENT ONLY */}
        {isManagement && (
          <div className="analytics-card analytics-large management-only">
            <div className="analytics-header">
              <div>
                <h3>Agent Lead Distribution</h3>
                <p>Currently assigned leads by agent</p>
              </div>
            </div>
            <div className="chart-container">
              <canvas id="agentLeadDistributionChart" ref={agentLeadDistCanvasRef}></canvas>
            </div>
          </div>
        )}

        {/* AGENT PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <div className="analytics-card analytics-large management-only">
            <div className="analytics-header">
              <div>
                <h3>Agent Performance</h3>
                <p>Current agent activity and conversion</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                id="agentPerformanceTable"
                style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px" }}>Agent</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Active Leads</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Total Calls</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody id="agentPerformanceTableBody">
                  {agentPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    agentPerformanceData.map((agent, i) => (
                      <tr key={i}>
                        <td style={{ padding: "12px" }}>{agent.agentName}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{agent.activeLeads}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{agent.totalCalls}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{agent.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CAMPAIGN PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <div className="analytics-card analytics-large management-only">
            <div className="analytics-header">
              <div>
                <h3>Campaign Performance</h3>
                <p>Leads and enrollments by campaign</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                id="campaignPerformanceTable"
                style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px" }}>Campaign</th>
                    <th style={{ textAlign: "left", padding: "12px" }}>Source</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Status</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Total Leads</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody id="campaignPerformanceTableBody">
                  {campaignPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    campaignPerformanceData.map((c, i) => (
                      <tr key={i}>
                        <td style={{ padding: "12px" }}>{c.campaignName}</td>
                        <td style={{ padding: "12px" }}>{c.source}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{c.status}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{c.totalLeads}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{c.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEAD SOURCE PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <div className="analytics-card analytics-large management-only">
            <div className="analytics-header">
              <div>
                <h3>Lead Source Performance</h3>
                <p>Leads and enrollments by source</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                id="leadSourcePerformanceTable"
                style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px" }}>Source</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Total Leads</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSourceData.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "20px" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    leadSourceData.map((src, i) => (
                      <tr key={i}>
                        <td style={{ padding: "12px" }}>{src.source}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{src.count}</td>
                        <td style={{ textAlign: "center", padding: "12px" }}>{src.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
