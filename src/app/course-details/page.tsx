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
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Course Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View CRM course syllabus, duration, and status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/courses")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            &larr; Back to Courses
          </button>
          <button
            type="button"
            onClick={() => router.push(`/edit-course?id=${courseId}`)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Edit Course
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course ID</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{course?.id ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course Name</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{course?.courseName ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{course?.description ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">
              {course?.durationMonths != null ? `${course.durationMonths} months` : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-${(course?.status || "active").toLowerCase()}`}>
                {course?.status ?? "-"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{course?.createdAt ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{course?.updatedAt ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  return (
    <DashboardLayout activePage="courses">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading course details...</div>}>
        <CourseDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
