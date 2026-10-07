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
    <div className="edit-course-page">
      <div className="page-header">
        <div>
          <h2>Edit Course</h2>
          <p>Update CRM course information.</p>
        </div>
        <button type="button" onClick={() => router.push("/courses")}>
          ← Back to Courses
        </button>
      </div>

      {message && (
        <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}

      <div className="form-card">
        <form id="editCourseForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="courseId">Course ID</label>
            <input type="text" id="courseId" value={courseId ?? ""} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="courseName">Course Name</label>
            <input
              type="text"
              id="courseName"
              placeholder="Enter course name"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={5}
              placeholder="Enter course description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="durationMonths">Duration (Months)</label>
            <input
              type="number"
              id="durationMonths"
              min={1}
              placeholder="Enter duration in months"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => router.push("/courses")} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
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
      <Suspense fallback={<div>Loading edit course form...</div>}>
        <EditCourseContent />
      </Suspense>
    </DashboardLayout>
  );
}
