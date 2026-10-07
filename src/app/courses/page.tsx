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
      <div className="courses-page">
        <div className="courses-page-header">
          <div>
            <h2>Courses</h2>
            <p>Manage CRM courses and programs.</p>
          </div>
          <div className="courses-header-actions">
            <button type="button" onClick={() => router.push("/dashboard")}>
              ← Dashboard
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/add-course")}
            >
              + Add Course
            </button>
          </div>
        </div>

        {message && (
          <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
            {message.text}
          </div>
        )}

        <div className="courses-toolbar">
          <input
            type="text"
            id="searchCourse"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" id="refreshCourses" onClick={loadCourses} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="courses-table-container">
          <table className="courses-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Course Name</th>
                <th>Description</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="coursesTableBody">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    {loading ? "Loading..." : "No courses found."}
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.id}</td>
                    <td>{course.courseName ?? ""}</td>
                    <td>{course.description ?? ""}</td>
                    <td>
                      {course.durationMonths != null
                        ? `${course.durationMonths} months`
                        : ""}
                    </td>
                    <td>{course.status ?? ""}</td>
                    <td>{course.createdAt ?? ""}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/course-details?id=${course.id}`))}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/edit-course?id=${course.id}`))}
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(course.id)}>
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
    </DashboardLayout>
  );
}
