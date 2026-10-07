"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface CourseData {
  id?: number | string;
  courseName?: string;
  description?: string;
  durationMonths?: number | string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

function CourseDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("id");

  const [course, setCourse] = useState<CourseData | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

        const data = await res.json();
        setCourse(data);
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading course:", err);
        setMessage({ text: "Unable to load course.", isError: true });
      }
    }

    loadCourse();
  }, [courseId, router]);

  return (
    <div className="course-details-page">
      <div className="course-details-page-header">
        <div>
          <h2>Course Details</h2>
          <p>View CRM course information.</p>
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

      <div className="course-details-card">
        <div className="detail-row">
          <div className="detail-label">Course ID</div>
          <div className="detail-value" id="courseId">{course?.id ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Course Name</div>
          <div className="detail-value" id="courseName">{course?.courseName ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Description</div>
          <div className="detail-value" id="description">{course?.description ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Duration</div>
          <div className="detail-value" id="durationMonths">
            {course?.durationMonths != null ? `${course.durationMonths} months` : "-"}
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Status</div>
          <div className="detail-value" id="status">{course?.status ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Created At</div>
          <div className="detail-value" id="createdAt">{course?.createdAt ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Updated At</div>
          <div className="detail-value" id="updatedAt">{course?.updatedAt ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  return (
    <DashboardLayout activePage="courses">
      <Suspense fallback={<div>Loading course details...</div>}>
        <CourseDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
