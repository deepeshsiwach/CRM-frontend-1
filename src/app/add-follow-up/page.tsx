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
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule New Follow-up</h1>
            <p className="text-sm text-gray-500 mt-0.5">Set next action date and purpose for this lead.</p>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form id="addFollowUpForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="leadDisplay" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Lead
              </label>
              <input
                type="text"
                id="leadDisplay"
                disabled
                value={leadDisplay}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              {!leadIdParam && (
                <input
                  type="number"
                  placeholder="Enter Lead ID"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label htmlFor="agentDisplay" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Assigned Agent
              </label>
              <input
                type="text"
                id="agentDisplay"
                disabled
                value={agentDisplay}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="followUpDate" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Follow-up Date & Time *
              </label>
              <input
                type="datetime-local"
                id="followUpDate"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="purpose" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Purpose
              </label>
              <input
                type="text"
                id="purpose"
                placeholder="e.g., Course discussion, Payment confirmation"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label htmlFor="remarks" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Remarks
              </label>
              <textarea
                id="remarks"
                rows={3}
                placeholder="Optional notes regarding this follow-up..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {submitting ? "Saving..." : "Schedule Follow-up"}
              </button>
              <button
                type="button"
                onClick={goBack}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Cancel
              </button>

              {message && (
                <span
                  id="addFollowUpMessage"
                  className={`text-xs font-semibold ${
                    message.isError ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AddFollowUpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <AddFollowUpContent />
    </Suspense>
  );
}
