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
        <p style={{ padding: 20 }}>Loading lead details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="leads">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: 24 }}>Edit Lead</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#6b7280" }}>Update lead information and status</p>
        </div>
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/leads")}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          ← Back to Leads
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24 }}>
        <h2 className="form-section-title" style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>Lead Information</h2>

        {message && (
          <div
            id="editMessage"
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              marginBottom: 16,
              background: message.includes("success") ? "#dcfce7" : "#f3f4f6",
              color: message.includes("success") ? "#166534" : "#374151",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        <form id="editLeadForm" onSubmit={handleSubmit}>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                disabled={isAgent}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                disabled={isAgent}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="text"
                id="phone"
                name="phone"
                disabled={isAgent}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="courseInterested">Course Interested</label>
              <input
                type="text"
                id="courseInterested"
                name="courseInterested"
                disabled={isAgent}
                value={courseInterested}
                onChange={(e) => setCourseInterested(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="leadSource">Lead Source</label>
              <input
                type="text"
                id="leadSource"
                name="leadSource"
                disabled={isAgent}
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Lead Status</label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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
              {isAgent && <div className="field-help" style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Agents can update only this field.</div>}
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                disabled={isAgent}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                disabled={isAgent}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions" style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="submit"
              className="save-button"
              disabled={submitting}
              style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => router.push("/leads")}
              style={{ padding: "9px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function LeadEditPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <LeadEditContent />
    </Suspense>
  );
}
