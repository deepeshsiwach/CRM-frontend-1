"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface CampaignData {
  id?: number | string;
  campaignName?: string;
  description?: string;
  source?: string;
  courseId?: number | string | null;
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface LeadItem {
  id?: number | string;
  status?: string;
  city?: string;
  [key: string]: unknown;
}

interface CallLogItem {
  id?: number | string;
  callStatus?: string;
  callOutcome?: string;
  durationSeconds?: number;
  [key: string]: unknown;
}

function CampaignDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Lead KPI states
  const [totalLeads, setTotalLeads] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [interestedLeads, setInterestedLeads] = useState(0);
  const [enrolledLeads, setEnrolledLeads] = useState(0);

  // Call KPI states
  const [totalCalls, setTotalCalls] = useState(0);
  const [answeredCalls, setAnsweredCalls] = useState(0);
  const [notAnsweredCalls, setNotAnsweredCalls] = useState(0);
  const [averageCallDuration, setAverageCallDuration] = useState(0);

  // Chart canvas refs
  const leadStatusCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const callStatusCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const callOutcomeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasCallStatusData, setHasCallStatusData] = useState(false);
  const [hasCallOutcomeData, setHasCallOutcomeData] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("campaigns")) {
      router.push("/dashboard");
      return;
    }

    if (!campaignId) {
      setMessage({ text: "Campaign ID is missing.", isError: true });
      return;
    }

    let isMounted = true;
    let leadStatusChartInstance: { destroy: () => void } | null = null;
    let cityChartInstance: { destroy: () => void } | null = null;
    let callStatusChartInstance: { destroy: () => void } | null = null;
    let callOutcomeChartInstance: { destroy: () => void } | null = null;

    async function loadData() {
      setMessage({ text: "Loading campaign...", isError: false });
      const token = getToken();

      try {
        // Load Campaign Info
        const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load campaign. Status: " + res.status);
        }

        const campaignData = await res.json();
        if (isMounted) setCampaign(campaignData);

        // Load Campaign Leads
        const leadsRes = await fetch(`${API_BASE_URL}/api/leads/campaign/${campaignId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const leads: LeadItem[] = leadsRes.ok ? await leadsRes.json() : [];

        // Load Campaign Call Logs
        const callsRes = await fetch(`${API_BASE_URL}/api/call-logs/campaign/${campaignId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const callLogs: CallLogItem[] = callsRes.ok ? await callsRes.json() : [];

        if (!isMounted) return;

        // Calculate Lead KPIs
        const tLeads = leads.length;
        const nLeads = leads.filter((l) => l.status === "NEW").length;
        const iLeads = leads.filter((l) => l.status === "INTERESTED").length;
        const eLeads = leads.filter((l) => l.status === "ENROLLED").length;

        setTotalLeads(tLeads);
        setNewLeads(nLeads);
        setInterestedLeads(iLeads);
        setEnrolledLeads(eLeads);

        // Calculate Call KPIs
        const tCalls = callLogs.length;
        const aCalls = callLogs.filter((c) => c.callStatus === "ANSWERED").length;
        const naCalls = callLogs.filter((c) => c.callStatus === "NOT_ANSWERED").length;
        const totalDuration = callLogs.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
        const avgDuration = tCalls > 0 ? Math.round(totalDuration / tCalls) : 0;

        setTotalCalls(tCalls);
        setAnsweredCalls(aCalls);
        setNotAnsweredCalls(naCalls);
        setAverageCallDuration(avgDuration);

        // Lead Status Counts
        const statusCounts: Record<string, number> = {};
        leads.forEach((lead) => {
          const st = lead.status || "UNKNOWN";
          statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        // City Counts
        const cityCounts: Record<string, number> = {};
        leads.forEach((lead) => {
          const city = lead.city && lead.city.trim() ? lead.city.trim() : "Unknown";
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        });

        // Call Status Counts
        const callStatusCounts: Record<string, number> = {};
        callLogs.forEach((call) => {
          const st = call.callStatus || "UNKNOWN";
          callStatusCounts[st] = (callStatusCounts[st] || 0) + 1;
        });

        // Call Outcome Counts
        const callOutcomeCounts: Record<string, number> = {};
        callLogs.forEach((call) => {
          const out = call.callOutcome || "UNKNOWN";
          callOutcomeCounts[out] = (callOutcomeCounts[out] || 0) + 1;
        });

        const hasCalls = Object.keys(callStatusCounts).length > 0;
        const hasOutcomes = Object.keys(callOutcomeCounts).length > 0;
        setHasCallStatusData(hasCalls);
        setHasCallOutcomeData(hasOutcomes);

        // Dynamic Chart.js import
        const Chart = (await import("chart.js/auto")).default;

        // Render Lead Status Chart
        if (leadStatusCanvasRef.current && Object.keys(statusCounts).length > 0) {
          leadStatusChartInstance = new Chart(leadStatusCanvasRef.current, {
            type: "doughnut",
            data: {
              labels: Object.keys(statusCounts),
              datasets: [{ data: Object.values(statusCounts) }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            },
          });
        }

        // Render City Chart
        if (cityCanvasRef.current && Object.keys(cityCounts).length > 0) {
          cityChartInstance = new Chart(cityCanvasRef.current, {
            type: "bar",
            data: {
              labels: Object.keys(cityCounts),
              datasets: [{ label: "Leads", data: Object.values(cityCounts) }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
              plugins: { legend: { display: false } },
            },
          });
        }

        // Render Call Status Chart
        if (callStatusCanvasRef.current && hasCalls) {
          callStatusChartInstance = new Chart(callStatusCanvasRef.current, {
            type: "doughnut",
            data: {
              labels: Object.keys(callStatusCounts),
              datasets: [{ data: Object.values(callStatusCounts) }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            },
          });
        }

        // Render Call Outcome Chart
        if (callOutcomeCanvasRef.current && hasOutcomes) {
          callOutcomeChartInstance = new Chart(callOutcomeCanvasRef.current, {
            type: "doughnut",
            data: {
              labels: Object.keys(callOutcomeCounts),
              datasets: [{ data: Object.values(callOutcomeCounts) }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            },
          });
        }

        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading campaign analytics:", err);
        setMessage({ text: "Unable to load campaign.", isError: true });
      }
    }

    loadData();

    return () => {
      isMounted = false;
      leadStatusChartInstance?.destroy();
      cityChartInstance?.destroy();
      callStatusChartInstance?.destroy();
      callOutcomeChartInstance?.destroy();
    };
  }, [campaignId, router]);

  return (
    <div className="campaign-details-page">
      <div className="page-header">
        <div>
          <h2>Campaign Details</h2>
          <p>View complete campaign information.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" onClick={() => router.push("/campaigns")}>
            ← Back to Campaigns
          </button>
          <button
            type="button"
            id="editCampaignButton"
            className="primary-button"
            onClick={() => router.push(`/edit-campaign?id=${campaignId}`)}
          >
            Edit Campaign
          </button>
        </div>
      </div>

      {message && (
        <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}

      <div className="details-card">
        {/* Campaign Analytics */}
        <div className="campaign-analytics">
          <div className="analytics-header">
            <div>
              <h2>Campaign Analytics</h2>
              <p>Performance overview for this campaign</p>
            </div>
          </div>

          {/* Lead KPI Cards */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <span>Total Leads</span>
              <strong id="analyticsTotalLeads">{totalLeads}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>New Leads</span>
              <strong id="analyticsNewLeads">{newLeads}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>Interested</span>
              <strong id="analyticsInterestedLeads">{interestedLeads}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>Enrolled</span>
              <strong id="analyticsEnrolledLeads">{enrolledLeads}</strong>
            </div>
          </div>

          {/* Call KPI Cards */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <span>Total Calls</span>
              <strong id="analyticsTotalCalls">{totalCalls}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>Answered Calls</span>
              <strong id="analyticsAnsweredCalls">{answeredCalls}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>Not Answered</span>
              <strong id="analyticsNotAnsweredCalls">{notAnsweredCalls}</strong>
            </div>
            <div className="analytics-kpi-card">
              <span>Avg. Call Duration</span>
              <strong id="analyticsAverageCallDuration">{averageCallDuration} sec</strong>
            </div>
          </div>

          {/* Lead Charts */}
          <div className="analytics-chart-grid">
            <div className="analytics-chart-card">
              <h3>Lead Status Distribution</h3>
              <div style={{ position: "relative", height: "250px" }}>
                <canvas ref={leadStatusCanvasRef} id="campaignLeadStatusChart"></canvas>
              </div>
            </div>

            <div className="analytics-chart-card">
              <h3>Leads by City</h3>
              <div style={{ position: "relative", height: "250px" }}>
                <canvas ref={cityCanvasRef} id="campaignCityChart"></canvas>
              </div>
            </div>
          </div>

          {/* Call Charts */}
          <div className="analytics-chart-grid">
            <div className="analytics-chart-card">
              <h3>Call Status Distribution</h3>
              {!hasCallStatusData && (
                <div id="campaignCallStatusEmpty" className="analytics-empty-state">
                  No call activity yet
                </div>
              )}
              <div style={{ position: "relative", height: "250px", display: hasCallStatusData ? "block" : "none" }}>
                <canvas ref={callStatusCanvasRef} id="campaignCallStatusChart"></canvas>
              </div>
            </div>

            <div className="analytics-chart-card">
              <h3>Call Outcome Distribution</h3>
              {!hasCallOutcomeData && (
                <div id="campaignCallOutcomeEmpty" className="analytics-empty-state">
                  No call activity yet
                </div>
              )}
              <div style={{ position: "relative", height: "250px", display: hasCallOutcomeData ? "block" : "none" }}>
                <canvas ref={callOutcomeCanvasRef} id="campaignCallOutcomeChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Info Fields */}
        <div className="detail-row">
          <span className="detail-label">Campaign ID</span>
          <span className="detail-value" id="campaignId">{campaign?.id ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Campaign Name</span>
          <span className="detail-value" id="campaignName">{campaign?.campaignName ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Description</span>
          <span className="detail-value" id="description">{campaign?.description ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Source</span>
          <span className="detail-value" id="source">{campaign?.source ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Course ID</span>
          <span className="detail-value" id="courseId">{campaign?.courseId ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Start Date</span>
          <span className="detail-value" id="startDate">{campaign?.startDate ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">End Date</span>
          <span className="detail-value" id="endDate">{campaign?.endDate ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value" id="status">{campaign?.status ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Created At</span>
          <span className="detail-value" id="createdAt">{campaign?.createdAt ?? "-"}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Updated At</span>
          <span className="detail-value" id="updatedAt">{campaign?.updatedAt ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailsPage() {
  return (
    <DashboardLayout activePage="campaigns">
      <Suspense fallback={<div>Loading campaign details...</div>}>
        <CampaignDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
