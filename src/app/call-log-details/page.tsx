"use client";

// ============================================================
// DERIVION CRM - CALL LOG DETAILS PAGE
// Ported from call-log-details.html + call-log-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
}

function CallLogDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callLogId = searchParams.get("id");

  const [callLog, setCallLog] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getToken();

  const loadDetails = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    if (!callLogId) {
      setError("Call Log ID not found.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/call-logs/${callLogId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load call log");
      const data: CallLog = await res.json();
      setCallLog(data);
    } catch {
      setError("Unable to load call log details.");
    } finally {
      setLoading(false);
    }
  }, [callLogId, token, router]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
    return (
      <DashboardLayout activeMenu="call-logs" title="Call Log Details">
        <div className="p-8 text-center text-gray-400">Loading call log details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="call-logs">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Call Log Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">Viewing call log #{callLogId}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/call-logs")}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Call Logs
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        ) : callLog ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <dl className="divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Call Log ID</dt>
                <dd className="font-semibold text-gray-900">{callLog.id}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Lead ID</dt>
                <dd className="font-semibold">
                  <Link href={`/lead-details?id=${callLog.leadId}`} className="text-blue-600 hover:underline">
                    #{callLog.leadId}
                  </Link>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Agent ID</dt>
                <dd className="font-semibold text-gray-900">{callLog.agentId}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Start Time</dt>
                <dd className="text-gray-700 whitespace-nowrap">{callLog.callStartTime || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">End Time</dt>
                <dd className="text-gray-700 whitespace-nowrap">{callLog.callEndTime || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Duration</dt>
                <dd className="text-gray-900 font-medium">
                  {callLog.durationSeconds != null ? `${callLog.durationSeconds} seconds` : "-"}
                </dd>
              </div>

              <div className="flex justify-between py-2.5 items-center">
                <dt className="text-gray-500 font-medium">Status</dt>
                <dd>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {callLog.callStatus || "-"}
                  </span>
                </dd>
              </div>

              <div className="flex justify-between py-2.5 items-center">
                <dt className="text-gray-500 font-medium">Outcome</dt>
                <dd>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {callLog.callOutcome || "-"}
                  </span>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Remarks</dt>
                <dd className="text-gray-800 max-w-xs text-right">{callLog.remarks || "-"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function CallLogDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <CallLogDetailsContent />
    </Suspense>
  );
}
