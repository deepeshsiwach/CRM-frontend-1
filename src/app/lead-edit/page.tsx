"use client";

// ============================================================
// DERIVION CRM - LEAD EDIT PAGE
// Ported from lead-edit.html + lead-edit.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserRole } from "@/lib/auth";

interface Lead {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  courseInterested?: string;
  leadSource?: string;
  status?: string;
  priority?: string;
  city?: string;
}

function LeadEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");

  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseInterested, setCourseInterested] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [status, setStatus] = useState("NEW");
  const [priority, setPriority] = useState("MEDIUM");
  const [city, setCity] = useState("");
  const [originalLead, setOriginalLead] = useState<Lead | null>(null);

  const token = getToken();

  const loadLead = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load lead.");
      const lead: Lead = await res.json();
      setOriginalLead(lead);
      setFullName(lead.fullName || "");
      setEmail(lead.email || "");
      setPhone(lead.phone || "");
      setCourseInterested(lead.courseInterested || "");
      setLeadSource(lead.leadSource || "");
      setStatus(lead.status || "NEW");
      setPriority(lead.priority || "MEDIUM");
      setCity(lead.city || "");
    } catch {
      setMessage("Unable to load lead.");
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    const currentRole = getUserRole();
    setRole(currentRole);
    if (currentRole === "AGENT") {
      setMessage("Agent mode: only lead status can be updated.");
    }
    loadLead();
  }, [token, router, loadLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !token) return;

    setSubmitting(true);
    setMessage("Saving changes...");

    // Agent mode: status only
    if (role === "AGENT") {
      if (!status) {
        setMessage("Please select a lead status.");
        setSubmitting(false);
        return;
      }
      if (originalLead && originalLead.status === status) {
        setMessage("No status changes made.");
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/agent/leads/${leadId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(status),
        });

        if (!res.ok) {
          const errText = await res.text();
          setMessage(errText || "Failed to update lead status.");
          setSubmitting(false);
          return;
        }

        setMessage("Lead status updated successfully!");
        setTimeout(() => {
          router.push(`/lead-details?id=${leadId}`);
        }, 600);
      } catch {
        setMessage("Unable to connect to CRM server.");
        setSubmitting(false);
      }
      return;
    }

    // Admin / Manager mode: full update
    const updatedLead = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      courseInterested: courseInterested.trim(),
      leadSource: leadSource.trim(),
      status,
      priority,
      city: city.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(updatedLead),
      });

      let data: { error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        setMessage(data?.error || "Failed to update lead.");
        setSubmitting(false);
        return;
      }

      setMessage("Lead updated successfully!");
      setTimeout(() => {
        router.push(`/lead-details?id=${leadId}`);
      }, 600);
    } catch {
      setMessage("Unable to connect to CRM server.");
      setSubmitting(false);
    }
  };

  const isAgent = role === "AGENT";

  if (loading) {
    return (
      <DashboardLayout activeMenu="leads" title="Edit Lead">
        <div className="p-8 text-center text-gray-400">Loading lead details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="leads">
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Lead #{leadId}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update lead contact information and status.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Leads
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Lead Information
          </h2>

          {message && (
            <div
              id="editMessage"
              className={`p-3 rounded-lg text-sm font-medium border mb-5 ${
                message.includes("success")
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {message}
            </div>
          )}

          <form id="editLeadForm" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  disabled={isAgent}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  disabled={isAgent}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  disabled={isAgent}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label htmlFor="courseInterested" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Course Interested
                </label>
                <input
                  type="text"
                  id="courseInterested"
                  name="courseInterested"
                  disabled={isAgent}
                  value={courseInterested}
                  onChange={(e) => setCourseInterested(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label htmlFor="leadSource" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Lead Source
                </label>
                <input
                  type="text"
                  id="leadSource"
                  name="leadSource"
                  disabled={isAgent}
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Lead Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="INTERESTED">INTERESTED</option>
                  <option value="FOLLOW_UP">FOLLOW_UP</option>
                  <option value="COUNSELLING">COUNSELLING</option>
                  <option value="ENROLLED">ENROLLED</option>
                  <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                  <option value="WRONG_NUMBER">WRONG_NUMBER</option>
                  <option value="NO_RESPONSE">NO_RESPONSE</option>
                  <option value="LOST">LOST</option>
                </select>
                {isAgent && (
                  <p className="text-xs text-gray-500 mt-1">Agents can update only this field.</p>
                )}
              </div>

              <div>
                <label htmlFor="priority" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  disabled={isAgent}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <label htmlFor="city" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  disabled={isAgent}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
                    isAgent ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>
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
                onClick={() => router.push("/leads")}
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

export default function LeadEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <LeadEditContent />
    </Suspense>
  );
}
