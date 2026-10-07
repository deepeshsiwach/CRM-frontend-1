"use client";

// ============================================================
// DERIVION CRM - ADD LEAD PAGE
// Ported from add-lead.html + add-lead.js
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

export default function AddLeadPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseInterested, setCourseInterested] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [status, setStatus] = useState("NEW");
  const [priority, setPriority] = useState("MEDIUM");
  const [city, setCity] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setCourseInterested("");
    setLeadSource("");
    setStatus("NEW");
    setPriority("MEDIUM");
    setCity("");
    setCampaignId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setMessage("Full name is required.");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setMessage("Phone number must contain exactly 10 digits.");
      return;
    }

    const leadData = {
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      courseInterested: courseInterested.trim(),
      leadSource: leadSource.trim(),
      status,
      priority,
      city: city.trim(),
      campaignId: campaignId ? Number(campaignId) : null,
    };

    setMessage("Creating lead...");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(leadData),
      });

      let data: { message?: string; error?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        // Response may not contain JSON
      }

      if (!response.ok) {
        setMessage((data && data.message) || (data && data.error) || "Failed to create lead.");
        setSubmitting(false);
        return;
      }

      setMessage("Lead created successfully!");
      resetForm();

      setTimeout(() => {
        router.push("/leads");
      }, 1000);
    } catch (error) {
      console.error("Error creating lead:", error);
      setMessage("Unable to connect to CRM server.");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="leads" title="Add New Lead">
      <div className="form-container">
        <form id="addLeadForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
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
              required
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
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
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
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
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
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="campaignId">Campaign ID</label>
            <input
              type="number"
              id="campaignId"
              name="campaignId"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Lead"}
          </button>

          <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
            Clear
          </button>

          <button
            type="button"
            onClick={() => router.push("/leads")}
            style={{ marginLeft: 8 }}
          >
            Cancel
          </button>

          <p id="addLeadMessage" style={{ marginTop: 15, fontWeight: "bold" }}>
            {message}
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}
