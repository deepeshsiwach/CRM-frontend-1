"use client";

// ============================================================
// DERIVION CRM - EDIT FOLLOW-UP PAGE
// Ported from edit-follow-up.html + edit-follow-up.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface FollowUp {
  id: number;
  leadId: number;
  agentId: number;
  followUpDate?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
}

function EditFollowUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const followUpId = searchParams.get("id");

  const [leadId, setLeadId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [remarks, setRemarks] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();

  const loadFollowUp = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    if (!followUpId) {
      setMessage({ text: "Follow-up ID is missing.", isError: true });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/follow-ups/${followUpId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load follow-up.");
      const fu: FollowUp = await res.json();
      setLeadId(String(fu.leadId ?? ""));
      setAgentId(String(fu.agentId ?? ""));
      if (fu.followUpDate) {
        setFollowUpDate(fu.followUpDate.substring(0, 16));
      }
      setPurpose(fu.purpose || "");
      setStatus(fu.status || "PENDING");
      setRemarks(fu.remarks || "");
    } catch {
      setMessage({ text: "Unable to connect to the backend.", isError: true });
    } finally {
      setLoading(false);
    }
  }, [followUpId, token, router]);

  useEffect(() => {
    loadFollowUp();
  }, [loadFollowUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpId || !token) return;

    const payload = {
      leadId: Number(leadId),
      agentId: Number(agentId),
      followUpDate,
      purpose: purpose.trim(),
      status,
      remarks: remarks.trim(),
    };

    setSubmitting(true);
    setMessage({ text: "Updating follow-up...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/follow-ups/${followUpId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update follow-up.");
      }

      setMessage({ text: "Follow-up updated successfully!", isError: false });
      setTimeout(() => {
        router.push(`/follow-up-details?id=${followUpId}`);
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating follow-up.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="follow-ups" title="Edit Follow-up">
        <p style={{ padding: 20 }}>Loading follow-up...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="follow-ups">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit Follow-up #{followUpId}</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Update follow-up status, schedule or remarks</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/follow-up-details?id=${followUpId}`)}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          ← Cancel
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
        <form id="editFollowUpForm" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="leadId" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Lead ID</label>
            <input
              type="number"
              id="leadId"
              required
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="agentId" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Agent ID</label>
            <input
              type="number"
              id="agentId"
              required
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="followUpDate" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Follow-up Date & Time</label>
            <input
              type="datetime-local"
              id="followUpDate"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="purpose" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Purpose</label>
            <input
              type="text"
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="status" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="remarks" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Remarks</label>
            <textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              className="primary-button"
              style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/follow-up-details?id=${followUpId}`)}
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

export default function EditFollowUpPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <EditFollowUpContent />
    </Suspense>
  );
}
