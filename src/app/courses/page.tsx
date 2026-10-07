"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface Course {
  id: number | string;
  courseName?: string;
  description?: string;
  durationMonths?: number | string | null;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function CoursesPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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

    loadCourses();
  }, [router]);

  async function loadCourses() {
    setLoading(true);
    setMessage({ text: "Loading courses...", isError: false });
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
      setMessage(null);
    } catch (err: unknown) {
      console.error("Error loading courses:", err);
      setMessage({ text: "Unable to load courses.", isError: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number | string) {
    const confirmed = confirm("Are you sure you want to delete this course?");
    if (!confirmed) return;

    try {
      setMessage({ text: "Deleting course...", isError: false });
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to delete course.");
      }

      setMessage({ text: "Course deleted successfully.", isError: false });
      loadCourses();
    } catch (err: unknown) {
      console.error("Error deleting course:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to delete course.";
      setMessage({ text: errorMsg, isError: true });
    }
  }

  const filteredCourses = courses.filter((c) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(c.id ?? "").toLowerCase().includes(s) ||
      String(c.courseName ?? "").toLowerCase().includes(s) ||
      String(c.description ?? "").toLowerCase().includes(s) ||
      String(c.durationMonths ?? "").toLowerCase().includes(s) ||
      String(c.status ?? "").toLowerCase().includes(s) ||
      String(c.createdAt ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout activePage="courses">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Courses</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage CRM courses and programs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              &larr; Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/add-course")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              + Add Course
            </button>
          </div>
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

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <input
            type="text"
            id="searchCourse"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            type="button"
            id="refreshCourses"
            onClick={loadCourses}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Course Name</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold text-center sticky right-0 bg-gray-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? "Loading..." : "No courses found."}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{course.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{course.courseName ?? ""}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={course.description ?? ""}>
                        {course.description ?? ""}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {course.durationMonths != null ? `${course.durationMonths} months` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium status-${(course.status || "active").toLowerCase()}`}>
                          {course.status ?? "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{course.createdAt ?? ""}</td>
                      <td className="px-4 py-3 sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] text-center whitespace-nowrap min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => startTransition(() => router.push(`/course-details?id=${course.id}`))}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors mr-1.5"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => startTransition(() => router.push(`/edit-course?id=${course.id}`))}
                          className="text-xs px-2.5 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 font-medium transition-colors mr-1.5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(course.id)}
                          className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
