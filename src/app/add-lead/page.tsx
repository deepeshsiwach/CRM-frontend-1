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

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <DashboardLayout activeMenu="leads" title="Add New Lead">
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form id="addLeadForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fullName" className={labelCls}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelCls}>Phone <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="phone"
                name="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="10-digit number"
              />
            </div>

            <div>
              <label htmlFor="courseInterested" className={labelCls}>Course Interested</label>
              <input
                type="text"
                id="courseInterested"
                name="courseInterested"
                value={courseInterested}
                onChange={(e) => setCourseInterested(e.target.value)}
                className={inputCls}
                placeholder="e.g. Full Stack Development"
              />
            </div>

            <div>
              <label htmlFor="leadSource" className={labelCls}>Lead Source</label>
              <input
                type="text"
                id="leadSource"
                name="leadSource"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className={inputCls}
                placeholder="e.g. Website, LinkedIn"
              />
            </div>

            <div>
              <label htmlFor="city" className={labelCls}>City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
                placeholder="e.g. Mumbai"
              />
            </div>

            <div>
              <label htmlFor="status" className={labelCls}>Status</label>
              <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
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

            <div>
              <label htmlFor="priority" className={labelCls}>Priority</label>
              <select id="priority" name="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div>
              <label htmlFor="campaignId" className={labelCls}>Campaign ID</label>
              <input
                type="number"
                id="campaignId"
                name="campaignId"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>

            <div className="col-span-full mt-2">
              {message && (
                <p id="addLeadMessage" className={`mb-4 text-sm font-semibold ${message.includes("success") ? "text-green-600" : "text-red-500"}`}>
                  {message}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? "Adding..." : "Add Lead"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/leads")}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
