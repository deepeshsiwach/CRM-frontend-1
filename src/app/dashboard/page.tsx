"use client";

// ============================================================
// DERIVION CRM - DASHBOARD PAGE
// ============================================================
// Performance-focused Next.js dashboard
// ============================================================

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

  if (!call || !call.callStartTime) {
    return false;
  }

  const date = new Date(call.callStartTime);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` === getTodayDateString();
}


function calculateAgentWorkSummary(
  assignments: Assignment[],
  calls: CallLog[]
) {

  const assignedLeadIds = new Set<string>();

  assignments.forEach((a) => {

    if (a && a.leadId != null) {
      assignedLeadIds.add(String(a.leadId));
    }

  });


  const todayCalls = calls.filter(isCallFromToday);

  const attendedLeadIds = new Set<string>();


  todayCalls.forEach((call) => {

    if (call && call.leadId != null) {

      const leadId = String(call.leadId);

      if (assignedLeadIds.has(leadId)) {
        attendedLeadIds.add(leadId);
      }

    }

  });


  const totalLeads = assignedLeadIds.size;

  const attendedLeads = attendedLeadIds.size;

  const remainingLeads = Math.max(
    0,
    totalLeads - attendedLeads
  );


  return {
    totalLeads,
    attendedLeads,
    remainingLeads,
  };

}


// ============================================================
// DASHBOARD PAGE
// ============================================================

export default function DashboardPage() {

  const router = useRouter();


  // ==========================================================
  // USER ROLE
  // ==========================================================

  const [userRole, setUserRole] = useState("");


  // ==========================================================
  // DASHBOARD CARD STATS
  // ==========================================================

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


  // ==========================================================
  // ANALYTICS
  // ==========================================================

  const [agentPerformanceData, setAgentPerformanceData] =
    useState<AgentPerformance[]>([]);

  const [campaignPerformanceData, setCampaignPerformanceData] =
    useState<Campaign[]>([]);

  const [leadSourceData, setLeadSourceData] =
    useState<LeadSource[]>([]);


  // ==========================================================
  // CHART REFERENCES
  // ==========================================================

  const leadOverviewChartRef =
    useRef<ChartType | null>(null);

  const crmActivityChartRef =
    useRef<ChartType | null>(null);

  const agentLeadDistChartRef =
    useRef<ChartType | null>(null);


  // ==========================================================
  // CANVAS REFERENCES
  // ==========================================================

  const leadOverviewCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const crmActivityCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const agentLeadDistCanvasRef =
    useRef<HTMLCanvasElement>(null);


  // ==========================================================
  // PAGE LOAD
  // ==========================================================

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


  // ==========================================================
  // CHART CLEANUP
  // ==========================================================

  useEffect(() => {

    return () => {

      if (leadOverviewChartRef.current) {

        leadOverviewChartRef.current.destroy();

        leadOverviewChartRef.current = null;

      }


      if (crmActivityChartRef.current) {

        crmActivityChartRef.current.destroy();

        crmActivityChartRef.current = null;

      }


      if (agentLeadDistChartRef.current) {

        agentLeadDistChartRef.current.destroy();

        agentLeadDistChartRef.current = null;

      }

    };

  }, []);


  // ==========================================================
  // WAIT FOR BROWSER LAYOUT
  // ==========================================================

  async function waitForChartLayout(): Promise<void> {

    await new Promise<void>((resolve) => {

      requestAnimationFrame(() => {

        requestAnimationFrame(() => {

          resolve();

        });

      });

    });

  }


  // ==========================================================
  // PREPARE CANVAS
  // ==========================================================

  function prepareCanvas(
    canvas: HTMLCanvasElement
  ) {

    canvas.style.display = "block";

    canvas.style.width = "100%";

    canvas.style.height = "100%";

  }


  // ==========================================================
  // RENDER SUMMARY CHARTS
  // ==========================================================

  async function renderSummaryCharts(
    summary: Record<string, unknown>,
    role: string
  ) {

    // IMPORTANT:
    // Wait until React/browser has calculated
    // the actual chart container dimensions.

    await waitForChartLayout();


    const Chart =
      (await import("chart.js/auto")).default;


    // ========================================================
    // LEAD OVERVIEW
    // ========================================================

    const statusCounts =
      (summary.leadStatusCounts as Record<string, number>) || {};


    const leadCanvas =
      leadOverviewCanvasRef.current;


    if (leadCanvas) {

      if (leadOverviewChartRef.current) {

        leadOverviewChartRef.current.destroy();

        leadOverviewChartRef.current = null;

      }


      prepareCanvas(leadCanvas);


      leadOverviewChartRef.current =
        new Chart(leadCanvas, {

          type: "doughnut",

          data: {

            labels:
              Object.keys(statusCounts),

            datasets: [

              {

                data:
                  Object.values(statusCounts),

                backgroundColor: [

                  "#2563eb",

                  "#16a34a",

                  "#f59e0b",

                  "#ef4444",

                  "#8b5cf6",

                  "#06b6d4",

                  "#f97316",

                  "#ec4899",

                  "#14b8a6",

                  "#6366f1",

                ],

                borderWidth: 0,

                hoverOffset: 8,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {

              legend: {

                position: "bottom",

                labels: {

                  usePointStyle: true,

                  padding: 15,

                },

              },

            },

          },

        });

    }


    // ========================================================
    // CRM ACTIVITY
    // ========================================================

    const activityCanvas =
      crmActivityCanvasRef.current;


    if (activityCanvas) {

      if (crmActivityChartRef.current) {

        crmActivityChartRef.current.destroy();

        crmActivityChartRef.current = null;

      }


      prepareCanvas(activityCanvas);


      crmActivityChartRef.current =
        new Chart(activityCanvas, {

          type: "bar",

          data: {

            labels: [

              "Leads",

              "Assigned",

              "Calls",

              "Follow-ups",

            ],

            datasets: [

              {

                label: "CRM Activity",

                data: [

                  Number(summary.totalLeads) || 0,

                  Number(summary.assignedLeads) || 0,

                  Number(summary.totalCalls) || 0,

                  Number(summary.totalFollowUps) || 0,

                ],

                backgroundColor: [

                  "#2563eb",

                  "#16a34a",

                  "#f59e0b",

                  "#ef4444",

                ],

                borderRadius: 8,

                maxBarThickness: 60,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

              legend: {

                display: false,

              },

            },

            scales: {

              y: {

                beginAtZero: true,

                ticks: {

                  precision: 0,

                },

              },

              x: {

                grid: {

                  display: false,

                },

              },

            },

          },

        });

    }


    // ========================================================
    // AGENT ROLE DOES NOT NEED MANAGEMENT CHART
    // ========================================================

    if (role === "AGENT") {

      return;

    }


    // ========================================================
    // AGENT LEAD DISTRIBUTION
    // ========================================================

    const agentDist =
      Array.isArray(
        summary.agentLeadDistribution
      )
        ? summary.agentLeadDistribution
        : [];


    const agentCanvas =
      agentLeadDistCanvasRef.current;


    if (agentCanvas) {

      if (agentLeadDistChartRef.current) {

        agentLeadDistChartRef.current.destroy();

        agentLeadDistChartRef.current = null;

      }


      prepareCanvas(agentCanvas);


      const agentNames =
        agentDist.map(
          (a: Record<string, unknown>) =>
            (a.agentName as string) ||
            `Agent #${a.agentId}`
        );


      const agentCounts =
        agentDist.map(
          (a: Record<string, unknown>) =>
            Number(a.activeLeads) || 0
        );


      agentLeadDistChartRef.current =
        new Chart(agentCanvas, {

          type: "bar",

          data: {

            labels: agentNames,

            datasets: [

              {

                label: "Active Leads",

                data: agentCounts,

                backgroundColor: "#2563eb",

                borderRadius: 8,

                maxBarThickness: 60,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

              legend: {

                display: false,

              },

            },

            scales: {

              y: {

                beginAtZero: true,

                ticks: {

                  precision: 0,

                },

              },

              x: {

                grid: {

                  display: false,

                },

              },

            },

          },

        });

    }

  }


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  async function loadDashboard(
    token: string,
    role: string
  ) {

    try {

      const headers = {

        Authorization:
          "Bearer " + token,

        "Content-Type":
          "application/json",

      };


      // ======================================================
      // FAST PATH
      // ======================================================

      try {

        const sumRes =
          await fetch(
            `${API_BASE_URL}/api/dashboard/summary`,
            {
              headers,
            }
          );


        if (sumRes.ok) {

          const summary =
            await sumRes.json();


          // ==================================================
          // CARD DATA
          // ==================================================

          setTotalLeads(
            summary.totalLeads ?? 0
          );

          setAttendedLeads(
            summary.attendedLeads ?? 0
          );

          setRemainingLeads(
            summary.remainingLeads ?? 0
          );

          setTotalFollowUps(
            summary.totalFollowUps ?? 0
          );

          setTotalCalls(
            summary.totalCalls ?? 0
          );

          setPendingFollowUps(
            summary.pendingFollowUps ?? 0
          );

          setCompletedFollowUps(
            summary.completedFollowUps ?? 0
          );

          setMissedFollowUps(
            summary.missedFollowUps ?? 0
          );

          setCancelledFollowUps(
            summary.cancelledFollowUps ?? 0
          );

          setTodayFollowUps(
            summary.todayFollowUps ?? 0
          );

          setUnassignedLeads(
            summary.unassignedLeads ?? 0
          );


          // ==================================================
          // MANAGEMENT ANALYTICS
          // ==================================================

          if (role !== "AGENT") {

            if (
              Array.isArray(
                summary.agentPerformance
              )
            ) {

              setAgentPerformanceData(

                summary.agentPerformance.map(
                  (
                    a: Record<string, unknown>
                  ) => ({

                    agentName:
                      (a.agentName as string) ||
                      `Agent #${a.agentId}`,

                    activeLeads:
                      Number(a.activeLeads) || 0,

                    totalCalls:
                      Number(a.totalCalls) || 0,

                    enrolled:
                      Number(a.enrolledLeads) || 0,

                  })
                )

              );

            }


            if (
              Array.isArray(
                summary.campaignPerformance
              )
            ) {

              setCampaignPerformanceData(

                summary.campaignPerformance.map(
                  (
                    c: Record<string, unknown>
                  ) => ({

                    campaignName:
                      (c.campaignName as string) ||
                      "Campaign",

                    source:
                      (c.source as string) ||
                      "-",

                    status:
                      (c.status as string) ||
                      "ACTIVE",

                    totalLeads:
                      Number(c.totalLeads) || 0,

                    enrolled:
                      Number(c.enrolledLeads) || 0,

                  })
                )

              );

            }


            if (
              Array.isArray(
                summary.leadSourcePerformance
              )
            ) {

              setLeadSourceData(

                summary.leadSourcePerformance.map(
                  (
                    s: Record<string, unknown>
                  ) => ({

                    source:
                      (s.source as string) ||
                      "Unknown",

                    count:
                      Number(s.totalLeads) || 0,

                    enrolled:
                      Number(s.enrolledLeads) || 0,

                  })
                )

              );

            }

          }


          // ==================================================
          // CREATE CHARTS
          // ==================================================

          await renderSummaryCharts(
            summary,
            role
          );


          return;

        }

      } catch (sumErr) {

        console.warn(
          "Summary endpoint failed, falling back to multi-query:",
          sumErr
        );

      }


      // ======================================================
      // FALLBACK API CALLS
      // ======================================================

      const [
        leadsRes,
        assignmentsRes,
        callsRes,
        followUpsRes,
      ] = await Promise.allSettled([

        fetch(
          `${API_BASE_URL}/api/leads`,
          {
            headers,
          }
        ),

        fetch(
          `${API_BASE_URL}/api/lead-assignments`,
          {
            headers,
          }
        ),

        fetch(
          `${API_BASE_URL}/api/call-logs`,
          {
            headers,
          }
        ),

        fetch(
          `${API_BASE_URL}/api/follow-ups`,
          {
            headers,
          }
        ),

      ]);


      const leads: Lead[] =
        leadsRes.status === "fulfilled" &&
          leadsRes.value.ok
          ? await leadsRes.value.json()
          : [];


      const assignments: Assignment[] =
        assignmentsRes.status === "fulfilled" &&
          assignmentsRes.value.ok
          ? await assignmentsRes.value.json()
          : [];


      const calls: CallLog[] =
        callsRes.status === "fulfilled" &&
          callsRes.value.ok
          ? await callsRes.value.json()
          : [];


      const followUps: FollowUp[] =
        followUpsRes.status === "fulfilled" &&
          followUpsRes.value.ok
          ? await followUpsRes.value.json()
          : [];


      // ======================================================
      // AGENT WORK CARDS
      // ======================================================

      if (role === "AGENT") {

        const summary =
          calculateAgentWorkSummary(
            assignments,
            calls
          );


        setTotalLeads(
          summary.totalLeads
        );

        setAttendedLeads(
          summary.attendedLeads
        );

        setRemainingLeads(
          summary.remainingLeads
        );

      } else {

        setTotalLeads(
          leads.length
        );

      }


      // ======================================================
      // FOLLOW-UP CARDS
      // ======================================================

      setTotalFollowUps(
        followUps.length
      );


      const todayStr =
        getTodayDateString();


      let pending = 0;

      let completed = 0;

      let missed = 0;

      let cancelled = 0;

      let todayCount = 0;


      followUps.forEach((fu) => {

        const status =
          String(
            fu.status || ""
          ).toUpperCase();


        if (status === "PENDING") {
          pending++;
        }


        if (status === "COMPLETED") {
          completed++;
        }


        if (status === "MISSED") {
          missed++;
        }


        if (status === "CANCELLED") {
          cancelled++;
        }


        const dateVal =
          fu.followUpDate ||
          fu.scheduledDate ||
          fu.date ||
          fu.followUpTime;


        if (dateVal) {

          const d =
            new Date(dateVal);


          if (!Number.isNaN(d.getTime())) {

            const ds =
              `${d.getFullYear()}-${String(
                d.getMonth() + 1
              ).padStart(2, "0")}-${String(
                d.getDate()
              ).padStart(2, "0")}`;


            if (ds === todayStr) {

              todayCount++;

            }

          }

        }

      });


      setPendingFollowUps(
        pending
      );

      setCompletedFollowUps(
        completed
      );

      setMissedFollowUps(
        missed
      );

      setCancelledFollowUps(
        cancelled
      );

      setTodayFollowUps(
        todayCount
      );


      // ======================================================
      // CALL COUNT
      // ======================================================

      setTotalCalls(
        calls.length
      );


      // ======================================================
      // UNASSIGNED LEADS
      // ======================================================

      if (role !== "AGENT") {

        const assignedIds =
          new Set(
            assignments
              .filter(
                (a) =>
                  a.leadId != null
              )
              .map(
                (a) =>
                  String(a.leadId)
              )
          );


        let unassigned = 0;


        leads.forEach((lead) => {

          const st =
            String(
              lead.status || ""
            ).toUpperCase();


          if (
            ![
              "ENROLLED",
              "LOST",
              "NOT_INTERESTED",
              "WRONG_NUMBER",
            ].includes(st)
          ) {

            if (
              !assignedIds.has(
                String(lead.id)
              )
            ) {

              unassigned++;

            }

          }

        });


        setUnassignedLeads(
          unassigned
        );

      }


      // ======================================================
      // FALLBACK CHARTS
      // ======================================================

      await buildCharts(
        leads,
        assignments,
        calls,
        followUps,
        role,
        token,
        headers
      );


    } catch (err) {

      console.error(
        "Dashboard load error:",
        err
      );

    }

  }


  // ==========================================================
  // FALLBACK CHART BUILDER
  // ==========================================================

  async function buildCharts(
    leads: Lead[],
    assignments: Assignment[],
    calls: CallLog[],
    followUps: FollowUp[],
    role: string,
    token: string,
    headers: Record<string, string>
  ) {

    await waitForChartLayout();


    const Chart =
      (await import("chart.js/auto")).default;


    // ========================================================
    // LEAD OVERVIEW
    // ========================================================

    const statusCounts:
      Record<string, number> = {};


    leads.forEach((lead) => {

      const st =
        lead.status ||
        "UNKNOWN";


      statusCounts[st] =
        (statusCounts[st] || 0) + 1;

    });


    const leadCanvas =
      leadOverviewCanvasRef.current;


    if (leadCanvas) {

      if (leadOverviewChartRef.current) {

        leadOverviewChartRef.current.destroy();

        leadOverviewChartRef.current = null;

      }


      prepareCanvas(leadCanvas);


      leadOverviewChartRef.current =
        new Chart(leadCanvas, {

          type: "doughnut",

          data: {

            labels:
              Object.keys(statusCounts),

            datasets: [

              {

                data:
                  Object.values(statusCounts),

                backgroundColor: [

                  "#2563eb",

                  "#16a34a",

                  "#f59e0b",

                  "#ef4444",

                  "#8b5cf6",

                  "#06b6d4",

                  "#f97316",

                  "#ec4899",

                  "#14b8a6",

                  "#6366f1",

                ],

                borderWidth: 0,

                hoverOffset: 8,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {

              legend: {

                position: "bottom",

                labels: {

                  usePointStyle: true,

                  padding: 18,

                },

              },

            },

          },

        });

    }


    // ========================================================
    // CRM ACTIVITY
    // ========================================================

    const activityCanvas =
      crmActivityCanvasRef.current;


    if (activityCanvas) {

      if (crmActivityChartRef.current) {

        crmActivityChartRef.current.destroy();

        crmActivityChartRef.current = null;

      }


      prepareCanvas(activityCanvas);


      crmActivityChartRef.current =
        new Chart(activityCanvas, {

          type: "bar",

          data: {

            labels: [

              "Leads",

              "Assigned",

              "Follow-ups",

              "Calls",

            ],

            datasets: [

              {

                label:
                  "CRM Activity",

                data: [

                  leads.length,

                  assignments.length,

                  followUps.length,

                  calls.length,

                ],

                backgroundColor: [

                  "#2563eb",

                  "#16a34a",

                  "#f59e0b",

                  "#ef4444",

                ],

                borderRadius: 10,

                borderSkipped: false,

                maxBarThickness: 60,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

              legend: {

                display: false,

              },

            },

            scales: {

              x: {

                grid: {

                  display: false,

                },

              },

              y: {

                beginAtZero: true,

                ticks: {

                  precision: 0,

                },

              },

            },

          },

        });

    }


    // ========================================================
    // AGENT ROLE
    // ========================================================

    if (role === "AGENT") {

      return;

    }


    // ========================================================
    // AGENT LEAD DISTRIBUTION
    // ========================================================

    const agentLeadMap:
      Record<
        string,
        Set<string>
      > = {};


    assignments.forEach((a) => {

      const record =
        a as Record<string, unknown>;


      const name =
        (record.agentName as string) ||
        String(
          record.agentId ||
          "Unknown"
        );


      if (!agentLeadMap[name]) {

        agentLeadMap[name] =
          new Set<string>();

      }


      if (a.leadId != null) {

        agentLeadMap[name].add(
          String(a.leadId)
        );

      }

    });


    const agentCanvas =
      agentLeadDistCanvasRef.current;


    if (agentCanvas) {

      if (agentLeadDistChartRef.current) {

        agentLeadDistChartRef.current.destroy();

        agentLeadDistChartRef.current = null;

      }


      prepareCanvas(agentCanvas);


      const agentNames =
        Object.keys(
          agentLeadMap
        );


      const agentCounts =
        agentNames.map(
          (name) =>
            agentLeadMap[name].size
        );


      agentLeadDistChartRef.current =
        new Chart(agentCanvas, {

          type: "bar",

          data: {

            labels: agentNames,

            datasets: [

              {

                label:
                  "Active Leads",

                data:
                  agentCounts,

                backgroundColor:
                  "#2563eb",

                borderRadius: 8,

                maxBarThickness: 60,

              },

            ],

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

              legend: {

                display: false,

              },

            },

            scales: {

              y: {

                beginAtZero: true,

                ticks: {

                  precision: 0,

                },

              },

              x: {

                grid: {

                  display: false,

                },

              },

            },

          },

        });

    }


    // ========================================================
    // AGENT PERFORMANCE TABLE
    // ========================================================

    try {

      const usersRes =
        await fetch(
          `${API_BASE_URL}/api/users`,
          {
            headers,
          }
        );


      if (usersRes.ok) {

        const users:
          Array<{
            id: number;
            fullName: string;
          }> =
          await usersRes.json();


        const performance:
          AgentPerformance[] =
          users.map((u) => {

            const agentAssignments =
              assignments.filter(
                (a) =>
                  String(
                    (
                      a as Record<
                        string,
                        unknown
                      >
                    ).agentId
                  ) ===
                  String(u.id)
              );


            const agentCalls =
              calls.filter(
                (c) =>
                  String(
                    (
                      c as Record<
                        string,
                        unknown
                      >
                    ).agentId
                  ) ===
                  String(u.id)
              );


            const enrolled =
              leads.filter(
                (l) =>

                  String(
                    l.status
                  ).toUpperCase() ===
                  "ENROLLED" &&

                  agentAssignments.some(
                    (a) =>
                      String(
                        a.leadId
                      ) ===
                      String(l.id)
                  )
              ).length;


            return {

              agentName:
                u.fullName,

              activeLeads:
                agentAssignments.length,

              totalCalls:
                agentCalls.length,

              enrolled,

            };

          });


        setAgentPerformanceData(
          performance
        );

      }

    } catch {

      // Ignore analytics failure

    }


    // ========================================================
    // CAMPAIGN PERFORMANCE
    // ========================================================

    try {

      const campaignsRes =
        await fetch(
          `${API_BASE_URL}/api/campaigns`,
          {
            headers,
          }
        );


      if (campaignsRes.ok) {

        const campaigns:
          Array<{
            id: number;
            campaignName: string;
            source: string;
            status: string;
          }> =
          await campaignsRes.json();


        const campaignData:
          Campaign[] =
          campaigns.map((c) => {

            const campaignLeads =
              leads.filter(
                (l) =>
                  String(
                    l.campaignId
                  ) ===
                  String(c.id)
              );


            const enrolled =
              campaignLeads.filter(
                (l) =>
                  String(
                    l.status
                  ).toUpperCase() ===
                  "ENROLLED"
              ).length;


            return {

              campaignName:
                c.campaignName,

              source:
                c.source,

              status:
                c.status,

              totalLeads:
                campaignLeads.length,

              enrolled,

            };

          });


        setCampaignPerformanceData(
          campaignData
        );

      }

    } catch {

      // Ignore analytics failure

    }


    // ========================================================
    // LEAD SOURCE PERFORMANCE
    // ========================================================

    const sourceMap:
      Record<
        string,
        {
          count: number;
          enrolled: number;
        }
      > = {};


    leads.forEach((l) => {

      const src =
        l.leadSource ||
        "Unknown";


      if (!sourceMap[src]) {

        sourceMap[src] = {

          count: 0,

          enrolled: 0,

        };

      }


      sourceMap[src].count++;


      if (
        String(
          l.status
        ).toUpperCase() ===
        "ENROLLED"
      ) {

        sourceMap[src].enrolled++;

      }

    });


    setLeadSourceData(

      Object.entries(
        sourceMap
      ).map(
        ([source, d]) => ({

          source,

          count:
            d.count,

          enrolled:
            d.enrolled,

        })
      )

    );

  }


  // ==========================================================
  // ROLE
  // ==========================================================

  const isManagement =
    userRole === "ADMIN" ||
    userRole === "MANAGER";


  // ==========================================================
  // STAT CARD
  // ==========================================================
  const StatCard = ({
    icon,
    label,
    value,
    sublabel,
    id,
    onClick,
  }: {
    icon: string;
    label: string;
    value: number;
    sublabel: string;
    id?: string;
    onClick?: () => void;
  }) => (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all duration-200 ${onClick
        ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-200"
        : ""
        }`}
    >
      <div className="text-3xl mb-3">
        {icon}
      </div>

      <div className="text-sm font-medium text-gray-500 mb-1">
        {label}
      </div>

      <div className="text-3xl font-bold text-blue-600 mb-1">
        {value}
      </div>

      <div className="text-xs text-gray-400">
        {sublabel}
      </div>
    </div>
  );
  // ==========================================================
  // ANALYTICS CARD
  // ==========================================================

  const AnalyticsCard = ({
    title,
    subtitle,
    children,
    large,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
    large?: boolean;
  }) => (

    <div
      className={`
        bg-white
        rounded-xl
        p-6
        shadow-sm
        border
        border-gray-100
        ${large ? "md:col-span-2" : ""}
      `}
    >

      <div className="mb-4">

        <h3 className="
          text-base
          font-bold
          text-gray-800
        ">
          {title}
        </h3>


        <p className="
          text-xs
          text-gray-500
          mt-0.5
        ">
          {subtitle}
        </p>

      </div>


      {children}

    </div>

  );


  // ==========================================================
  // TABLE CLASSES
  // ==========================================================

  const tableHeadClass =
    "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50";


  const tableCellClass =
    "px-4 py-3 text-sm text-gray-700 border-t border-gray-100";


  const tableCellCenterClass =
    "px-4 py-3 text-sm text-gray-700 border-t border-gray-100 text-center";


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <DashboardLayout
      activeMenu="dashboard"
    >

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="
        flex
        items-center
        justify-between
        mb-6
      ">

        <h2 className="
          text-2xl
          font-bold
          text-gray-800
        ">
          Dashboard
        </h2>


        <button
          type="button"
          onClick={() =>
            router.push("/add-lead")
          }
          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            text-sm
            font-semibold
            px-5
            py-2.5
            rounded-lg
            transition-colors
            duration-200
            shadow-sm
          "
        >
          + Add Lead
        </button>

      </div>


      {/* =====================================================
          DASHBOARD CARDS
          ===================================================== */}

      <div className="
        grid
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        gap-4
        mb-8
      ">

        <StatCard
          icon="👥"
          label="Total Leads"
          value={totalLeads}
          sublabel="Currently assigned"
          id="totalLeads"
          onClick={() => router.push("/leads")}
        />


        <StatCard
          icon="☎️"
          label="Attended Leads"
          value={attendedLeads}
          sublabel="Leads worked today"
          id="attendedLeadsCard"
        />


        <StatCard
          icon="⏳"
          label="Remaining Leads"
          value={remainingLeads}
          sublabel="Yet to be worked"
          id="remainingLeadsCard"
          onClick={() =>
            router.push("/leads?view=remaining")
          }
        />


        <StatCard
          icon="📅"
          label="Follow-ups"
          value={totalFollowUps}
          sublabel="Scheduled activities"
        />


        <StatCard
          icon="📞"
          label="Call Logs"
          value={totalCalls}
          sublabel="Recorded calls"
        />


        <StatCard
          icon="⏳"
          label="Pending Follow-ups"
          value={pendingFollowUps}
          sublabel="Waiting for action"
        />


        <StatCard
          icon="✅"
          label="Completed Follow-ups"
          value={completedFollowUps}
          sublabel="Successfully completed"
        />


        <StatCard
          icon="⚠️"
          label="Missed Follow-ups"
          value={missedFollowUps}
          sublabel="Require attention"
        />


        <StatCard
          icon="❌"
          label="Cancelled Follow-ups"
          value={cancelledFollowUps}
          sublabel="Cancelled activities"
        />


        <StatCard
          icon="📆"
          label="Today's Follow-ups"
          value={todayFollowUps}
          sublabel="Due today"
        />


        {isManagement && (

          <StatCard
            icon="📥"
            label="Unassigned Leads"
            value={unassignedLeads}
            sublabel="Awaiting assignment"
            id="unassignedLeadsCard"
          />

        )}

      </div>


      {/* =====================================================
          ANALYTICS
          ===================================================== */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-6
      ">


        {/* ===================================================
            LEAD OVERVIEW
            =================================================== */}

        <AnalyticsCard
          title="Lead Overview"
          subtitle="Current lead distribution"
          large
        >

          <div
            className="
              relative
              w-full
            "
            style={{
              height: "320px",
              minHeight: "320px",
            }}
          >

            <canvas
              id="leadOverviewChart"
              ref={leadOverviewCanvasRef}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
              }}
            />

          </div>

        </AnalyticsCard>


        {/* ===================================================
            CRM ACTIVITY
            =================================================== */}

        <AnalyticsCard
          title="CRM Activity"
          subtitle="Current activity summary"
        >

          <div
            className="
              relative
              w-full
            "
            style={{
              height: "320px",
              minHeight: "320px",
            }}
          >

            <canvas
              id="crmActivityChart"
              ref={crmActivityCanvasRef}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
              }}
            />

          </div>

        </AnalyticsCard>


        {/* ===================================================
            AGENT LEAD DISTRIBUTION
            =================================================== */}

        {isManagement && (

          <AnalyticsCard
            title="Agent Lead Distribution"
            subtitle="Currently assigned leads by agent"
            large
          >

            <div
              className="
                relative
                w-full
              "
              style={{
                height: "320px",
                minHeight: "320px",
              }}
            >

              <canvas
                id="agentLeadDistributionChart"
                ref={
                  agentLeadDistCanvasRef
                }
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                }}
              />

            </div>

          </AnalyticsCard>

        )}


        {/* ===================================================
            AGENT PERFORMANCE
            =================================================== */}

        {isManagement && (

          <AnalyticsCard
            title="Agent Performance"
            subtitle="Current agent activity and conversion"
            large
          >

            <div className="overflow-x-auto">

              <table
                id="agentPerformanceTable"
                className="
                  w-full
                  border-collapse
                "
              >

                <thead>

                  <tr>

                    <th
                      className={
                        tableHeadClass
                      }
                    >
                      Agent
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Active Leads
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Total Calls
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Enrolled
                    </th>

                  </tr>

                </thead>


                <tbody
                  id="agentPerformanceTableBody"
                >

                  {agentPerformanceData.length ===
                    0 ? (

                    <tr>

                      <td
                        colSpan={4}
                        className="
                          text-center
                          py-5
                          text-gray-400
                          text-sm
                          border-t
                          border-gray-100
                        "
                      >
                        Loading...
                      </td>

                    </tr>

                  ) : (

                    agentPerformanceData.map(
                      (agent, i) => (

                        <tr
                          key={i}
                          className="
                            hover:bg-gray-50
                            transition-colors
                          "
                        >

                          <td
                            className={
                              tableCellClass
                            }
                          >
                            {agent.agentName}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {agent.activeLeads}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {agent.totalCalls}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {agent.enrolled}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </AnalyticsCard>

        )}


        {/* ===================================================
            CAMPAIGN PERFORMANCE
            =================================================== */}

        {isManagement && (

          <AnalyticsCard
            title="Campaign Performance"
            subtitle="Leads and enrollments by campaign"
            large
          >

            <div className="overflow-x-auto">

              <table
                id="campaignPerformanceTable"
                className="
                  w-full
                  border-collapse
                "
              >

                <thead>

                  <tr>

                    <th
                      className={
                        tableHeadClass
                      }
                    >
                      Campaign
                    </th>


                    <th
                      className={
                        tableHeadClass
                      }
                    >
                      Source
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Status
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Total Leads
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Enrolled
                    </th>

                  </tr>

                </thead>


                <tbody
                  id="campaignPerformanceTableBody"
                >

                  {campaignPerformanceData.length ===
                    0 ? (

                    <tr>

                      <td
                        colSpan={5}
                        className="
                          text-center
                          py-5
                          text-gray-400
                          text-sm
                          border-t
                          border-gray-100
                        "
                      >
                        Loading...
                      </td>

                    </tr>

                  ) : (

                    campaignPerformanceData.map(
                      (c, i) => (

                        <tr
                          key={i}
                          className="
                            hover:bg-gray-50
                            transition-colors
                          "
                        >

                          <td
                            className={
                              tableCellClass
                            }
                          >
                            {c.campaignName}
                          </td>


                          <td
                            className={
                              tableCellClass
                            }
                          >
                            {c.source}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {c.status}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {c.totalLeads}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {c.enrolled}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </AnalyticsCard>

        )}


        {/* ===================================================
            LEAD SOURCE PERFORMANCE
            =================================================== */}

        {isManagement && (

          <AnalyticsCard
            title="Lead Source Performance"
            subtitle="Leads and enrollments by source"
            large
          >

            <div className="overflow-x-auto">

              <table
                id="leadSourcePerformanceTable"
                className="
                  w-full
                  border-collapse
                "
              >

                <thead>

                  <tr>

                    <th
                      className={
                        tableHeadClass
                      }
                    >
                      Source
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Total Leads
                    </th>


                    <th
                      className={`
                        ${tableHeadClass}
                        text-center
                      `}
                    >
                      Enrolled
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {leadSourceData.length ===
                    0 ? (

                    <tr>

                      <td
                        colSpan={3}
                        className="
                          text-center
                          py-5
                          text-gray-400
                          text-sm
                          border-t
                          border-gray-100
                        "
                      >
                        Loading...
                      </td>

                    </tr>

                  ) : (

                    leadSourceData.map(
                      (src, i) => (

                        <tr
                          key={i}
                          className="
                            hover:bg-gray-50
                            transition-colors
                          "
                        >

                          <td
                            className={
                              tableCellClass
                            }
                          >
                            {src.source}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {src.count}
                          </td>


                          <td
                            className={
                              tableCellCenterClass
                            }
                          >
                            {src.enrolled}
                          </td>

                        </tr>

                      )
                    )

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