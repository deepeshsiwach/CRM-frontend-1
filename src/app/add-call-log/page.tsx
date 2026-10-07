"use client";

// ============================================================
// DERIVION CRM - ADD CALL LOG PAGE
// Ported from add-call-log.html + add-call-log.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserId } from "@/lib/auth";

interface Lead {
  id: number;
  fullName?: string;
  name?: string;
}

interface User {
  id: number;
  fullName?: string;
  name?: string;
}

function AddCallLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leadId, setLeadId] = useState(leadIdParam || "");
  const [leadDisplay, setLeadDisplay] = useState("Loading lead...");
  const [agentId, setAgentId] = useState("");
  const [agentDisplay, setAgentDisplay] = useState("");

  const [callStartTime, setCallStartTime] = useState("");
  const [callEndTime, setCallEndTime] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [callStatus, setCallStatus] = useState("COMPLETED");
  const [callOutcome, setCallOutcome] = useState("CONNECTED");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("");
  const [interestedArea, setInterestedArea] = useState("");
  const [remarks, setRemarks] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const token = getToken();

  // Initialize current date time
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setCallStartTime(localDateTime);
  }, []);

  const loadLeadDetails = useCallback(async () => {
    if (!leadId || !token) {
      setLeadDisplay("No Lead ID");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      const lead: Lead = await res.json();
      setLeadDisplay(`${lead.fullName || lead.name || "Lead"} (ID: ${leadId})`);
    } catch {
      setLeadDisplay(`Lead (ID: ${leadId})`);
    }
  }, [leadId, token]);

  const loadAgentDetails = useCallback(async () => {
    const currentUserId = getUserId();
    if (!currentUserId || !token) {
      setAgentDisplay("No Agent ID");
      return;
    }
    setAgentId(currentUserId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      const agent: User = await res.json();
      setAgentDisplay(`${agent.fullName || agent.name || "Agent"} (ID: ${currentUserId})`);
    } catch {
      setAgentDisplay(`Agent (ID: ${currentUserId})`);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    loadLeadDetails();
    loadAgentDetails();
  }, [token, router, loadLeadDetails, loadAgentDetails]);

  const goBack = () => {
    if (leadIdParam) {
      router.push(`/lead-details?id=${leadIdParam}`);
    } else {
      router.push("/call-logs");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      setMessage({ text: "Lead ID is required.", isError: true });
      return;
    }
    if (!agentId) {
      setMessage({ text: "Agent ID is required.", isError: true });
      return;
    }
    if (!callStartTime) {
      setMessage({ text: "Call start time is required.", isError: true });
      return;
    }
    if (!callStatus) {
      setMessage({ text: "Please select call status.", isError: true });
      return;
    }

    const payload = {
      leadId: Number(leadId),
      agentId: Number(agentId),
      callStartTime,
      callEndTime: callEndTime || null,
      durationSeconds: durationSeconds ? Number(durationSeconds) : null,
      callStatus,
      callOutcome: callOutcome || null,
      city: city.trim() || null,
      education: education.trim() || null,
      interestedArea: interestedArea.trim() || null,
      remarks: remarks.trim(),
    };

    setSaving(true);
    setMessage({ text: "Saving call log...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/call-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (!res.ok) {
        throw new Error(responseText || "Failed to create call log");
      }

      setMessage({ text: "Call log saved successfully.", isError: false });
      setTimeout(() => {
        goBack();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to CRM server.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout activeMenu="call-logs" title="Add Call Log">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Add New Call Log</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Record call outcome and details</p>
        </div>
        <button
          type="button"
          onClick={goBack}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 800 }}>
        <form id="callLogForm" onSubmit={handleSubmit}>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label htmlFor="leadDisplay">Lead</label>
              <input
                type="text"
                id="leadDisplay"
                disabled
                value={leadDisplay}
                style={{ background: "#f3f4f6" }}
              />
              {!leadIdParam && (
                <input
                  type="number"
                  placeholder="Enter Lead ID"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="agentDisplay">Agent</label>
              <input
                type="text"
                id="agentDisplay"
                disabled
                value={agentDisplay}
                style={{ background: "#f3f4f6" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="callStartTime">Call Start Time *</label>
              <input
                type="datetime-local"
                id="callStartTime"
                required
                value={callStartTime}
                onChange={(e) => setCallStartTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="callEndTime">Call End Time</label>
              <input
                type="datetime-local"
                id="callEndTime"
                value={callEndTime}
                onChange={(e) => setCallEndTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="durationSeconds">Duration (Seconds)</label>
              <input
                type="number"
                id="durationSeconds"
                min={0}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="callStatus">Call Status *</label>
              <select
                id="callStatus"
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
              >
                <option value="COMPLETED">COMPLETED</option>
                <option value="MISSED">MISSED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="BUSY">BUSY</option>
                <option value="NOT_ANSWERED">NOT_ANSWERED</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="callOutcome">Call Outcome</label>
              <select
                id="callOutcome"
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
              >
                <option value="CONNECTED">CONNECTED</option>
                <option value="INTERESTED">INTERESTED</option>
                <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                <option value="CALLBACK_REQUESTED">CALLBACK_REQUESTED</option>
                <option value="WRONG_NUMBER">WRONG_NUMBER</option>
                <option value="ENROLLED">ENROLLED</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="education">Education</label>
              <input
                type="text"
                id="education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="interestedArea">Interested Area</label>
              <input
                type="text"
                id="interestedArea"
                value={interestedArea}
                onChange={(e) => setInterestedArea(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label htmlFor="remarks">Remarks</label>
            <textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center" }}>
            <button
              type="submit"
              disabled={saving}
              className="primary-button"
              style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
            >
              {saving ? "Saving..." : "Save Call Log"}
            </button>
            <button
              type="button"
              onClick={goBack}
              style={{ padding: "9px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
            >
              Cancel
            </button>

            {message && (
              <span
                id="message"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: message.isError ? "#dc2626" : "#15803d",
                }}
              >
                {message.text}
              </span>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function AddCallLogPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <AddCallLogContent />
    </Suspense>
  );
}
