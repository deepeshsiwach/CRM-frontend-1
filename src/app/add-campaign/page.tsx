"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface CourseOption {
  id: number | string;
  courseName: string;
}

export default function AddCampaignPage() {
  const router = useRouter();
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

    loadCourses();
  }, [router]);

  async function loadCourses() {
    setCoursesLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load courses. Status: " + res.status);
      }

      const data = await res.json();
      setCourses(data || []);
    } catch (err: unknown) {
      console.error("Error loading courses:", err);
      setMessage({ text: "Unable to load courses.", isError: true });
    } finally {
      setCoursesLoading(false);
    }
  }

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
    setMessage({ text: "Creating campaign...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to create campaign.");
      }

      setMessage({ text: "Campaign created successfully.", isError: false });

      setTimeout(() => {
        router.push("/campaigns");
      }, 800);
    } catch (err: unknown) {
      console.error("Error creating campaign:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to create campaign.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activePage="campaigns">
      <div className="add-campaign-page">
        <div className="page-header">
          <div>
            <h2>Add Campaign</h2>
            <p>Create a new marketing or admission campaign.</p>
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
          <form id="addCampaignForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="campaignName">Campaign Name</label>
              <input
                type="text"
                id="campaignName"
                name="campaignName"
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
                name="description"
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
                name="source"
                placeholder="e.g. Google Ads, Instagram, Facebook"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="courseId">Course</label>
              <select
                id="courseId"
                name="courseId"
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
                name="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                {loading ? "Creating..." : "Create Campaign"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
