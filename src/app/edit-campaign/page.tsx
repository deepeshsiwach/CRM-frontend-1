"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface CourseOption {
  id: number | string;
  courseName: string;
}

function EditCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [courseIdValue, setCourseIdValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("campaigns")) {
      router.push("/dashboard");
      return;
    }

    if (!campaignId) {
      setMessage({ text: "Campaign ID is missing.", isError: true });
      return;
    }

    async function loadData() {
      setMessage({ text: "Loading campaign...", isError: false });
      const token = getToken();

      try {
        // Load courses
        setCoursesLoading(true);
        const coursesRes = await fetch(`${API_BASE_URL}/api/courses`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData || []);
        }
        setCoursesLoading(false);

        // Load campaign
        const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load campaign. Status: " + res.status);
        }

        const campaign = await res.json();
        setCampaignName(campaign.campaignName ?? "");
        setDescription(campaign.description ?? "");
        setSource(campaign.source ?? "");
        setCourseIdValue(campaign.courseId != null ? String(campaign.courseId) : "");
        setStartDate(campaign.startDate ?? "");
        setEndDate(campaign.endDate ?? "");
        setStatus(campaign.status ?? "DRAFT");
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading campaign:", err);
        setMessage({ text: "Unable to load campaign.", isError: true });
      }
    }

    loadData();
  }, [campaignId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!campaignName.trim()) {
      setMessage({ text: "Campaign name is required.", isError: true });
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setMessage({ text: "Campaign end date cannot be before start date.", isError: true });
      return;
    }

    const campaignData = {
      campaignName: campaignName.trim(),
      description: description.trim(),
      source: source.trim(),
      courseId: courseIdValue ? Number(courseIdValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
    };

    setLoading(true);
    setMessage({ text: "Saving changes...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to update campaign.");
      }

      setMessage({ text: "Campaign updated successfully.", isError: false });

      setTimeout(() => {
        router.push("/campaigns");
      }, 800);
    } catch (err: unknown) {
      console.error("Error updating campaign:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to update campaign.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="edit-campaign-page">
      <div className="page-header">
        <div>
          <h2>Edit Campaign</h2>
          <p>Update campaign information.</p>
        </div>
        <button type="button" onClick={() => router.push("/campaigns")}>
          ← Back to Campaigns
        </button>
      </div>

      {message && (
        <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}

      <div className="form-card">
        <form id="editCampaignForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="campaignId">Campaign ID</label>
            <input type="text" id="campaignId" value={campaignId ?? ""} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="campaignName">Campaign Name</label>
            <input
              type="text"
              id="campaignName"
              placeholder="Enter campaign name"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              placeholder="Enter campaign description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="source">Source</label>
            <input
              type="text"
              id="source"
              placeholder="e.g. Google Ads, Instagram, Facebook"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseId">Course</label>
            <select
              id="courseId"
              value={courseIdValue}
              onChange={(e) => setCourseIdValue(e.target.value)}
            >
              <option value="">{coursesLoading ? "Loading courses..." : "Select Course"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.push("/campaigns")} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditCampaignPage() {
  return (
    <DashboardLayout activePage="campaigns">
      <Suspense fallback={<div>Loading edit campaign form...</div>}>
        <EditCampaignContent />
      </Suspense>
    </DashboardLayout>
  );
}
