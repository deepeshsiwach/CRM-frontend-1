"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

function EditCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("id");

  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("courses")) {
      router.push("/dashboard");
      return;
    }

    if (!courseId) {
      setMessage({ text: "Course ID is missing.", isError: true });
      return;
    }

    async function loadCourse() {
      setMessage({ text: "Loading course...", isError: false });
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load course. Status: " + res.status);
        }

        const course = await res.json();
        setCourseName(course.courseName ?? "");
        setDescription(course.description ?? "");
        setDurationValue(course.durationMonths != null ? String(course.durationMonths) : "");
        setStatus(course.status ?? "ACTIVE");
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading course:", err);
        setMessage({ text: "Unable to load course.", isError: true });
      }
    }

    loadCourse();
  }, [courseId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!courseName.trim()) {
      setMessage({ text: "Course name is required.", isError: true });
      return;
    }

    let durationMonths: number | null = null;
    if (durationValue !== "") {
      durationMonths = Number(durationValue);
      if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
        setMessage({ text: "Duration must be a positive whole number.", isError: true });
        return;
      }
    }

    const courseData = {
      courseName: courseName.trim(),
      description: description.trim(),
      durationMonths,
      status,
    };

    setLoading(true);
    setMessage({ text: "Saving changes...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to update course.");
      }

      setMessage({ text: "Course updated successfully.", isError: false });

      setTimeout(() => {
        router.push("/courses");
      }, 800);
    } catch (err: unknown) {
      console.error("Error updating course:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to update course.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Course</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update CRM course information and duration.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/courses")}
          className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          &larr; Back to Courses
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
        <form id="editCourseForm" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="courseId" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Course ID
            </label>
            <input
              type="text"
              id="courseId"
              value={courseId ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="courseName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Course Name *
            </label>
            <input
              type="text"
              id="courseName"
              placeholder="Enter course name"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Enter course description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="durationMonths" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Duration (Months)
              </label>
              <input
                type="number"
                id="durationMonths"
                min={1}
                placeholder="Enter duration in months"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
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
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
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
              onClick={() => router.push("/courses")}
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

export default function EditCoursePage() {
  return (
    <DashboardLayout activePage="courses">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading edit course form...</div>}>
        <EditCourseContent />
      </Suspense>
    </DashboardLayout>
  );
}
