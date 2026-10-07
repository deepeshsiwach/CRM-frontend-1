"use client";

// ============================================================
// DERIVION CRM - FOLLOW-UP DETAILS PAGE
// Follow-up details + complete Lead Details
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface FollowUp {
  id: number;
  leadId: number;
  agentId: number;
  followUpDate?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Lead {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  courseInterested?: string;
  leadSource?: string;
  status?: string;
  priority?: string;
  city?: string;
  campaignId?: number | string;
}

interface LeadAssignment {
  id?: number;
  leadId?: number;
  agentId?: number;
  assignedAt?: string;
  active?: boolean;
}

function FollowUpDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const followUpId = searchParams.get("id");

  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [assignment, setAssignment] = useState<LeadAssignment | null>(null);

  const [loading, setLoading] = useState(true);
  const [leadLoading, setLeadLoading] = useState(false);

  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");

  const token = getToken();

  // ============================================================
  // LOAD FOLLOW-UP
  // ============================================================

  const loadDetails = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    if (!followUpId) {
      setError("Follow-up ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/follow-ups/${followUpId}`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load follow-up details.");
      }

      const data: FollowUp = await res.json();

      setFollowUp(data);
    } catch (err) {
      console.error("Error loading follow-up:", err);

      setError("Failed to load follow-up details.");
    } finally {
      setLoading(false);
    }
  }, [followUpId, token, router]);

  // ============================================================
  // LOAD LEAD DETAILS
  // ============================================================

  const loadLeadDetails = useCallback(
    async (leadId: number) => {
      if (!token || !leadId) {
        return;
      }

      setLeadLoading(true);
      setLeadError("");

      try {
        // --------------------------------------------------------
        // LOAD LEAD
        // --------------------------------------------------------

        const leadResponse = await fetch(
          `${API_BASE_URL}/api/leads/${leadId}`,
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );

        if (!leadResponse.ok) {
          throw new Error(
            `Failed to load lead details. Status: ${leadResponse.status}`
          );
        }

        const leadData: Lead = await leadResponse.json();

        setLead(leadData);

        // --------------------------------------------------------
        // LOAD ACTIVE ASSIGNMENT
        // --------------------------------------------------------

        try {
          const assignmentResponse = await fetch(
            `${API_BASE_URL}/api/lead-assignments/lead/${leadId}/active`,
            {
              headers: {
                Authorization: "Bearer " + token,
              },
            }
          );

          if (assignmentResponse.ok) {
            const assignmentData: LeadAssignment =
              await assignmentResponse.json();

            setAssignment(assignmentData);
          } else {
            setAssignment(null);
          }
        } catch (assignmentErr) {
          console.warn(
            "Unable to load active lead assignment:",
            assignmentErr
          );

          setAssignment(null);
        }
      } catch (err) {
        console.error("Error loading lead details:", err);

        setLead(null);

        setLeadError(
          "Unable to load the complete lead details."
        );
      } finally {
        setLeadLoading(false);
      }
    },
    [token]
  );

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // ============================================================
  // LOAD LEAD AFTER FOLLOW-UP IS LOADED
  // ============================================================

  useEffect(() => {
    if (followUp?.leadId) {
      loadLeadDetails(followUp.leadId);
    }
  }, [followUp?.leadId, loadLeadDetails]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <DashboardLayout
        activeMenu="follow-ups"
        title="Follow-up Details"
      >
        <div className="p-8 text-center text-gray-400">
          Loading follow-up details...
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <DashboardLayout activeMenu="follow-ups">
      <div className="space-y-6 w-full max-w-7xl">
        {/* ======================================================
            PAGE HEADER
            ====================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Follow-up Details
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Viewing follow-up #{followUpId}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {followUp && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/edit-follow-up?id=${followUp.id}`
                  )
                }
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Edit Follow-up
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/follow-ups")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              &larr; Back to Follow-ups
            </button>
          </div>
        </div>

        {/* ======================================================
            ERROR
            ====================================================== */}

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        ) : null}

        {/* ======================================================
            TWO COLUMN LAYOUT
            ====================================================== */}

        {followUp && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* ==================================================
                LEFT COLUMN
                FOLLOW-UP DETAILS
                ================================================== */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Follow-up Information
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Complete information about this follow-up.
                </p>
              </div>

              <dl className="divide-y divide-gray-100 text-sm">
                {/* FOLLOW-UP ID */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Follow-up ID
                  </dt>

                  <dd className="font-semibold text-gray-900">
                    #{followUp.id}
                  </dd>
                </div>

                {/* LEAD ID */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Lead ID
                  </dt>

                  <dd className="font-semibold">
                    <Link
                      href={`/lead-details?id=${followUp.leadId}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{followUp.leadId}
                    </Link>
                  </dd>
                </div>

                {/* AGENT ID */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Agent ID
                  </dt>

                  <dd className="font-semibold text-gray-900">
                    {followUp.agentId}
                  </dd>
                </div>

                {/* FOLLOW-UP DATE */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Follow-up Date & Time
                  </dt>

                  <dd className="text-gray-700 text-right break-all">
                    {followUp.followUpDate || "-"}
                  </dd>
                </div>

                {/* PURPOSE */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Purpose
                  </dt>

                  <dd className="text-gray-900 font-medium text-right">
                    {followUp.purpose || "-"}
                  </dd>
                </div>

                {/* STATUS */}

                <div className="flex justify-between gap-4 py-3 items-center">
                  <dt className="text-gray-500 font-medium">
                    Status
                  </dt>

                  <dd>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${followUp.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : followUp.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : followUp.status === "MISSED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {followUp.status || "-"}
                    </span>
                  </dd>
                </div>

                {/* REMARKS */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Remarks
                  </dt>

                  <dd className="text-gray-800 max-w-xs text-right whitespace-pre-wrap break-words">
                    {followUp.remarks || "-"}
                  </dd>
                </div>

                {/* CREATED AT */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Created At
                  </dt>

                  <dd className="text-gray-700 text-right break-all">
                    {followUp.createdAt || "-"}
                  </dd>
                </div>

                {/* UPDATED AT */}

                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-500 font-medium">
                    Updated At
                  </dt>

                  <dd className="text-gray-700 text-right break-all">
                    {followUp.updatedAt || "-"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ==================================================
                RIGHT COLUMN
                COMPLETE LEAD DETAILS
                ================================================== */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Lead Details
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Complete information for Lead #{followUp.leadId}.
                  </p>
                </div>

                <Link
                  href={`/lead-details?id=${followUp.leadId}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  View Lead
                </Link>
              </div>

              {/* LEAD LOADING */}

              {leadLoading ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Loading lead details...
                </div>
              ) : leadError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {leadError}
                </div>
              ) : lead ? (
                <dl className="divide-y divide-gray-100 text-sm">
                  {/* LEAD ID */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Lead ID
                    </dt>

                    <dd className="font-semibold text-gray-900">
                      #{lead.id}
                    </dd>
                  </div>

                  {/* NAME */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Lead Name
                    </dt>

                    <dd className="font-semibold text-gray-900 text-right">
                      {lead.name || "-"}
                    </dd>
                  </div>

                  {/* PHONE */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Phone
                    </dt>

                    <dd className="text-gray-900 text-right">
                      {lead.phone || "-"}
                    </dd>
                  </div>

                  {/* EMAIL */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Email
                    </dt>

                    <dd className="text-gray-900 text-right break-all">
                      {lead.email || "-"}
                    </dd>
                  </div>

                  {/* COURSE */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Course Interested
                    </dt>

                    <dd className="text-gray-900 font-medium text-right">
                      {lead.courseInterested || "-"}
                    </dd>
                  </div>

                  {/* LEAD SOURCE */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Lead Source
                    </dt>

                    <dd className="text-gray-900 text-right">
                      {lead.leadSource || "-"}
                    </dd>
                  </div>

                  {/* STATUS */}

                  <div className="flex justify-between gap-4 py-3 items-center">
                    <dt className="text-gray-500 font-medium">
                      Status
                    </dt>

                    <dd>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {lead.status || "-"}
                      </span>
                    </dd>
                  </div>

                  {/* PRIORITY */}

                  <div className="flex justify-between gap-4 py-3 items-center">
                    <dt className="text-gray-500 font-medium">
                      Priority
                    </dt>

                    <dd>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${lead.priority === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : lead.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : lead.priority === "LOW"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {lead.priority || "-"}
                      </span>
                    </dd>
                  </div>

                  {/* CITY */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      City
                    </dt>

                    <dd className="text-gray-900 text-right">
                      {lead.city || "-"}
                    </dd>
                  </div>

                  {/* CAMPAIGN ID */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Campaign ID
                    </dt>

                    <dd className="text-gray-900 font-semibold text-right">
                      {lead.campaignId
                        ? `#${lead.campaignId}`
                        : "-"}
                    </dd>
                  </div>

                  {/* ASSIGNED AGENT */}

                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-gray-500 font-medium">
                      Assigned Agent
                    </dt>

                    <dd className="text-gray-900 font-semibold text-right">
                      {assignment?.agentId
                        ? `Agent ID: ${assignment.agentId}`
                        : `Agent ID: ${followUp.agentId}`}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No lead details found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// PAGE WRAPPER
// ============================================================

export default function FollowUpDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-400">
          Loading...
        </div>
      }
    >
      <FollowUpDetailsContent />
    </Suspense>
  );
}