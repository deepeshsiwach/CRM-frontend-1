"use client";

// ============================================================
// DERIVION CRM - CALL LOG DETAILS PAGE
// Ported from call-log-details.html + call-log-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
        <p style={{ padding: 20 }}>Loading call log details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="call-logs">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Call Log Details</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Viewing call log #{callLogId}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/call-logs")}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          ← Back to Call Logs
        </button>
      </div>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : callLog ? (
        <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Call Log ID:</strong>
              <span id="callLogId">{callLog.id}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Lead ID:</strong>
              <span id="leadId">
                <a href={`/lead-details?id=${callLog.leadId}`} style={{ color: "#2563eb", textDecoration: "underline" }}>
                  {callLog.leadId}
                </a>
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Agent ID:</strong>
              <span id="agentId">{callLog.agentId}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Start Time:</strong>
              <span id="startTime">{callLog.callStartTime || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>End Time:</strong>
              <span id="endTime">{callLog.callEndTime || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Duration:</strong>
              <span id="duration">{callLog.durationSeconds != null ? `${callLog.durationSeconds} seconds` : "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Status:</strong>
              <span id="callStatus" style={{ padding: "3px 8px", borderRadius: 12, fontSize: 12, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>
                {callLog.callStatus || "-"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Outcome:</strong>
              <span id="outcome">{callLog.callOutcome || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <strong style={{ color: "#4b5563" }}>Remarks:</strong>
              <span id="remarks">{callLog.remarks || "-"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default function CallLogDetailsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <CallLogDetailsContent />
    </Suspense>
  );
}
