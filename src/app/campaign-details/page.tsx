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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaign Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View analytics and configuration for this campaign.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Campaigns
          </button>
          <button
            type="button"
            id="editCampaignButton"
            onClick={() => router.push(`/edit-campaign?id=${campaignId}`)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Edit Campaign
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            message.isError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Campaign Analytics */}
      <div className="space-y-6">
        {/* Lead KPI Cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Lead Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totalLeads}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">New Leads</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{newLeads}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Interested</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{interestedLeads}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Enrolled</span>
              <div className="text-2xl font-bold text-green-600 mt-1">{enrolledLeads}</div>
            </div>
          </div>
        </div>

        {/* Call KPI Cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Call Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Calls</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totalCalls}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Answered Calls</span>
              <div className="text-2xl font-bold text-green-600 mt-1">{answeredCalls}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Not Answered</span>
              <div className="text-2xl font-bold text-red-600 mt-1">{notAnsweredCalls}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Avg Duration</span>
              <div className="text-2xl font-bold text-purple-600 mt-1">{averageCallDuration} sec</div>
            </div>
          </div>
        </div>

        {/* Lead Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Lead Status Distribution</h3>
            <div className="relative h-64 w-full">
              <canvas ref={leadStatusCanvasRef} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Leads by City</h3>
            <div className="relative h-64 w-full">
              <canvas ref={cityCanvasRef} />
            </div>
          </div>
        </div>

        {/* Call Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Call Status Distribution</h3>
            {!hasCallStatusData && (
              <div className="p-8 text-center text-sm text-gray-400 my-auto">
                No call activity yet
              </div>
            )}
            <div className="relative h-64 w-full" style={{ display: hasCallStatusData ? "block" : "none" }}>
              <canvas ref={callStatusCanvasRef} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Call Outcome Distribution</h3>
            {!hasCallOutcomeData && (
              <div className="p-8 text-center text-sm text-gray-400 my-auto">
                No call activity yet
              </div>
            )}
            <div className="relative h-64 w-full" style={{ display: hasCallOutcomeData ? "block" : "none" }}>
              <canvas ref={callOutcomeCanvasRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Info Fields */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Campaign Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign ID</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.id ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Name</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.campaignName ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.description ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.source ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course ID</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.courseId ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Date</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.startDate ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.endDate ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-${(campaign?.status || "active").toLowerCase()}`}>
                {campaign?.status ?? "-"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.createdAt ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{campaign?.updatedAt ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function CampaignDetailsPage() {
  return (
    <DashboardLayout activePage="campaigns">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading campaign details...</div>}>
        <CampaignDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
