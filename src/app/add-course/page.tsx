"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

export default function AddCoursePage() {
  const router = useRouter();
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
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!courseName.trim()) {
      setMessage({ text: "Please enter course name.", isError: true });
      return;
    }

    let durationMonths: number | null = null;
    if (durationValue !== "") {
      durationMonths = Number(durationValue);
      if (!Number.isInteger(durationMonths) || durationMonths < 1) {
        setMessage({ text: "Duration must be a positive whole number.", isError: true });
        return;
      }
    }

    if (!status) {
      setMessage({ text: "Please select status.", isError: true });
      return;
    }

    const courseData = {
      courseName: courseName.trim(),
      description: description.trim(),
      durationMonths,
      status,
    };

    setLoading(true);
    setMessage({ text: "Creating course...", isError: false });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to create course.");
      }

      setMessage({ text: "Course created successfully.", isError: false });
      setCourseName("");
      setDescription("");
      setDurationValue("");
      setStatus("ACTIVE");

      setTimeout(() => {
        router.push("/courses");
      }, 1000);
    } catch (err: unknown) {
      console.error("Error creating course:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to create course.";
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activePage="courses">
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Course</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new CRM course or training program.</p>
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
          <form id="addCourseForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="courseName" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Course Name *
              </label>
              <input
                type="text"
                id="courseName"
                name="courseName"
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
                name="description"
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
                  name="durationMonths"
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
                  name="status"
                  required
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
                {loading ? "Creating..." : "Create Course"}
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
    </DashboardLayout>
  );
}
