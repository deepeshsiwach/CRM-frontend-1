"use client";

// ============================================================
// DERIVION CRM - ADD FOLLOW-UP PAGE
// Ported from add-follow-up.html + add-follow-up.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserId, getUserRole } from "@/lib/auth";

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

function AddFollowUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leadId, setLeadId] = useState(leadIdParam || "");
  const [leadDisplay, setLeadDisplay] = useState("Loading lead...");
  const [agentId, setAgentId] = useState("");
  const [agentDisplay, setAgentDisplay] = useState("");

  const [followUpDate, setFollowUpDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [remarks, setRemarks] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();

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

  const loadAssignedAgent = useCallback(async () => {
    if (!token) return;
    const currentUserId = getUserId();
    const role = getUserRole();

    // If logged in as AGENT, assign to self
    if (role === "AGENT") {
      if (!currentUserId) {
        setAgentDisplay("No Agent ID");
        return;
      }
      setAgentId(currentUserId);
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`, {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const user: User = await res.json();
          setAgentDisplay(`${user.fullName || user.name || "Agent"} (ID: ${currentUserId})`);
        }
      } catch {
        setAgentDisplay(`Agent (ID: ${currentUserId})`);
      }
      return;
    }

    // Admin / Manager: check active assignment for this lead
    if (!leadId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/lead-assignments/lead/${leadId}/active`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const assignment = await res.json();
        if (assignment?.agentId) {
          setAgentId(String(assignment.agentId));
          const uRes = await fetch(`${API_BASE_URL}/api/users/${assignment.agentId}`, {
            headers: { Authorization: "Bearer " + token },
          });
          if (uRes.ok) {
            const user: User = await uRes.json();
            setAgentDisplay(`${user.fullName || user.name || "Agent"} (ID: ${assignment.agentId})`);
          }
        } else {
          setAgentDisplay("No active agent assigned");
        }
      } else {
        setAgentDisplay("No active agent assigned");
      }
    } catch {
      setAgentDisplay("Unable to load assigned agent");
    }
  }, [leadId, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    loadLeadDetails();
    loadAssignedAgent();
  }, [token, router, loadLeadDetails, loadAssignedAgent]);

  const goBack = () => {
    if (leadIdParam) {
      router.push(`/lead-details?id=${leadIdParam}`);
    } else {
      router.push("/follow-ups");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      setMessage({ text: "Please select a valid lead.", isError: true });
      return;
    }
    if (!agentId) {
      setMessage({ text: "No active agent is assigned to this lead.", isError: true });
      return;
    }
    if (!followUpDate) {
      setMessage({ text: "Please select a follow-up date and time.", isError: true });
      return;
    }

    const payload = {
      leadId: Number(leadId),
      agentId: Number(agentId),
      followUpDate,
      purpose: purpose.trim(),
      status,
      remarks: remarks.trim(),
    };

    setSubmitting(true);
    setMessage({ text: "Saving follow-up...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/follow-ups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (!res.ok) {
        throw new Error(responseText || "Failed to create follow-up");
      }

      setMessage({ text: "Follow-up added successfully!", isError: false });
      setTimeout(() => {
        goBack();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to CRM server.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="follow-ups" title="Add Follow-up">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Schedule New Follow-up</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Set next action date and purpose</p>
        </div>
        <button
          type="button"
          onClick={goBack}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
        <form id="addFollowUpForm" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="leadDisplay" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Lead</label>
            <input
              type="text"
              id="leadDisplay"
              disabled
              value={leadDisplay}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f3f4f6" }}
            />
            {!leadIdParam && (
              <input
                type="number"
                placeholder="Enter Lead ID"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              />
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="agentDisplay" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Assigned Agent</label>
            <input
              type="text"
              id="agentDisplay"
              disabled
              value={agentDisplay}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f3f4f6" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="followUpDate" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Follow-up Date & Time *</label>
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
              placeholder="e.g., Course discussion, Payment confirmation"
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
              placeholder="Optional notes regarding this follow-up..."
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
              {submitting ? "Saving..." : "Schedule Follow-up"}
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
                id="addFollowUpMessage"
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

export default function AddFollowUpPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <AddFollowUpContent />
    </Suspense>
  );
}
