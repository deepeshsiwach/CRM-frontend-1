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
        <div className="p-8 text-center text-gray-400">Loading follow-up...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="follow-ups">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Follow-up #{followUpId}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update follow-up status, schedule or remarks.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/follow-up-details?id=${followUpId}`)}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Cancel
          </button>
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form id="editFollowUpForm" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="leadId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Lead ID *
                </label>
                <input
                  type="number"
                  id="leadId"
                  required
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="agentId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Agent ID *
                </label>
                <input
                  type="number"
                  id="agentId"
                  required
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Status *
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
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/follow-up-details?id=${followUpId}`)}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function EditFollowUpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <EditFollowUpContent />
    </Suspense>
  );
}
