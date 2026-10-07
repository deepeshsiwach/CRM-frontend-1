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
      <div className="add-course-page">
        <div className="add-course-page-header">
          <div>
            <h2>Add Course</h2>
            <p>Create a new CRM course.</p>
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

        <div className="add-course-form-container">
          <form id="addCourseForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="courseName">Course Name</label>
              <input
                type="text"
                id="courseName"
                name="courseName"
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
                name="description"
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
                name="durationMonths"
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
                name="status"
                required
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
                {loading ? "Creating..." : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
