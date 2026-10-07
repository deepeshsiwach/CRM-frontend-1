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

  // Reusable stat card component (inline)
  const StatCard = ({ icon, label, value, sublabel, id }: { icon: string; label: string; value: number; sublabel: string; id?: string }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200" id={id}>
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-blue-600 mb-1">{value}</div>
      <div className="text-xs text-gray-400">{sublabel}</div>
    </div>
  );

  const AnalyticsCard = ({ title, subtitle, children, large }: { title: string; subtitle: string; children: React.ReactNode; large?: boolean }) => (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${large ? "col-span-2" : ""}`}>
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );

  const tableHeadClass = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50";
  const tableCellClass = "px-4 py-3 text-sm text-gray-700 border-t border-gray-100";
  const tableCellCenterClass = "px-4 py-3 text-sm text-gray-700 border-t border-gray-100 text-center";

  return (
    <DashboardLayout activeMenu="dashboard">
      {/* =====================================================
          HEADER ROW
          ===================================================== */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          type="button"
          onClick={() => router.push("/add-lead")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
        >
          + Add Lead
        </button>
      </div>

      {/* =====================================================
          DASHBOARD CARDS
          ===================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <StatCard icon="👥" label="Total Leads"            value={totalLeads}          sublabel="Currently assigned"        id="totalLeads" />
        <StatCard icon="☎️" label="Attended Leads"          value={attendedLeads}        sublabel="Leads worked today"         id="attendedLeadsCard" />
        <StatCard icon="⏳" label="Remaining Leads"         value={remainingLeads}       sublabel="Yet to be worked"           id="remainingLeadsCard" />
        <StatCard icon="📅" label="Follow-ups"              value={totalFollowUps}       sublabel="Scheduled activities" />
        <StatCard icon="📞" label="Call Logs"               value={totalCalls}           sublabel="Recorded calls" />
        <StatCard icon="⏳" label="Pending Follow-ups"      value={pendingFollowUps}     sublabel="Waiting for action" />
        <StatCard icon="✅" label="Completed Follow-ups"    value={completedFollowUps}   sublabel="Successfully completed" />
        <StatCard icon="⚠️" label="Missed Follow-ups"       value={missedFollowUps}      sublabel="Require attention" />
        <StatCard icon="❌" label="Cancelled Follow-ups"    value={cancelledFollowUps}   sublabel="Cancelled activities" />
        <StatCard icon="📆" label="Today's Follow-ups"      value={todayFollowUps}       sublabel="Due today" />
        {isManagement && (
          <StatCard icon="📥" label="Unassigned Leads" value={unassignedLeads} sublabel="Awaiting assignment" id="unassignedLeadsCard" />
        )}
      </div>

      {/* =====================================================
          ANALYTICS AREA
          ===================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEAD OVERVIEW */}
        <AnalyticsCard title="Lead Overview" subtitle="Current lead distribution" large>
          <div className="h-64">
            <canvas id="leadOverviewChart" ref={leadOverviewCanvasRef}></canvas>
          </div>
        </AnalyticsCard>

        {/* CRM ACTIVITY */}
        <AnalyticsCard title="CRM Activity" subtitle="Current activity summary">
          <div className="h-64">
            <canvas id="crmActivityChart" ref={crmActivityCanvasRef}></canvas>
          </div>
        </AnalyticsCard>

        {/* AGENT LEAD DISTRIBUTION - MANAGEMENT ONLY */}
        {isManagement && (
          <AnalyticsCard title="Agent Lead Distribution" subtitle="Currently assigned leads by agent" large>
            <div className="h-64">
              <canvas id="agentLeadDistributionChart" ref={agentLeadDistCanvasRef}></canvas>
            </div>
          </AnalyticsCard>
        )}

        {/* AGENT PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <AnalyticsCard title="Agent Performance" subtitle="Current agent activity and conversion" large>
            <div className="overflow-x-auto">
              <table id="agentPerformanceTable" className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={tableHeadClass}>Agent</th>
                    <th className={`${tableHeadClass} text-center`}>Active Leads</th>
                    <th className={`${tableHeadClass} text-center`}>Total Calls</th>
                    <th className={`${tableHeadClass} text-center`}>Enrolled</th>
                  </tr>
                </thead>
                <tbody id="agentPerformanceTableBody">
                  {agentPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5 text-gray-400 text-sm border-t border-gray-100">Loading...</td>
                    </tr>
                  ) : (
                    agentPerformanceData.map((agent, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className={tableCellClass}>{agent.agentName}</td>
                        <td className={tableCellCenterClass}>{agent.activeLeads}</td>
                        <td className={tableCellCenterClass}>{agent.totalCalls}</td>
                        <td className={tableCellCenterClass}>{agent.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnalyticsCard>
        )}

        {/* CAMPAIGN PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <AnalyticsCard title="Campaign Performance" subtitle="Leads and enrollments by campaign" large>
            <div className="overflow-x-auto">
              <table id="campaignPerformanceTable" className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={tableHeadClass}>Campaign</th>
                    <th className={tableHeadClass}>Source</th>
                    <th className={`${tableHeadClass} text-center`}>Status</th>
                    <th className={`${tableHeadClass} text-center`}>Total Leads</th>
                    <th className={`${tableHeadClass} text-center`}>Enrolled</th>
                  </tr>
                </thead>
                <tbody id="campaignPerformanceTableBody">
                  {campaignPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-gray-400 text-sm border-t border-gray-100">Loading...</td>
                    </tr>
                  ) : (
                    campaignPerformanceData.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className={tableCellClass}>{c.campaignName}</td>
                        <td className={tableCellClass}>{c.source}</td>
                        <td className={tableCellCenterClass}>{c.status}</td>
                        <td className={tableCellCenterClass}>{c.totalLeads}</td>
                        <td className={tableCellCenterClass}>{c.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnalyticsCard>
        )}

        {/* LEAD SOURCE PERFORMANCE - MANAGEMENT ONLY */}
        {isManagement && (
          <AnalyticsCard title="Lead Source Performance" subtitle="Leads and enrollments by source" large>
            <div className="overflow-x-auto">
              <table id="leadSourcePerformanceTable" className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={tableHeadClass}>Source</th>
                    <th className={`${tableHeadClass} text-center`}>Total Leads</th>
                    <th className={`${tableHeadClass} text-center`}>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSourceData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-5 text-gray-400 text-sm border-t border-gray-100">Loading...</td>
                    </tr>
                  ) : (
                    leadSourceData.map((src, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className={tableCellClass}>{src.source}</td>
                        <td className={tableCellCenterClass}>{src.count}</td>
                        <td className={tableCellCenterClass}>{src.enrolled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnalyticsCard>
        )}

      </div>
    </DashboardLayout>
  );
}
