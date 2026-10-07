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
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update campaign details and settings.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/campaigns")}
          className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr; Back to Campaigns
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
        <form id="editCampaignForm" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="campaignId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Campaign ID
            </label>
            <input
              type="text"
              id="campaignId"
              value={campaignId ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="campaignName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Campaign Name *
            </label>
            <input
              type="text"
              id="campaignName"
              placeholder="Enter campaign name"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Enter campaign description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="source" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Source
              </label>
              <input
                type="text"
                id="source"
                placeholder="e.g. Google Ads, Instagram, Facebook"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="courseId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Course
              </label>
              <select
                id="courseId"
                value={courseIdValue}
                onChange={(e) => setCourseIdValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{coursesLoading ? "Loading courses..." : "Select Course"}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
            >
              Cancel
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
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading edit campaign form...</div>}>
        <EditCampaignContent />
      </Suspense>
    </DashboardLayout>
  );
}
