"use client";

// ============================================================
// DERIVION CRM - FOLLOW-UP DETAILS PAGE
// Ported from follow-up-details.html + follow-up-details.js
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

function FollowUpDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const followUpId = searchParams.get("id");

  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getToken();

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
      const res = await fetch(`${API_BASE_URL}/api/follow-ups/${followUpId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load follow-up details.");
      const data: FollowUp = await res.json();
      setFollowUp(data);
    } catch {
      setError("Failed to load follow-up details.");
    } finally {
      setLoading(false);
    }
  }, [followUpId, token, router]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
    return (
      <DashboardLayout activeMenu="follow-ups" title="Follow-up Details">
        <div className="p-8 text-center text-gray-400">Loading follow-up details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="follow-ups">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Follow-up Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">Viewing follow-up #{followUpId}</p>
          </div>
          <div className="flex items-center gap-3">
            {followUp && (
              <button
                type="button"
                onClick={() => router.push(`/edit-follow-up?id=${followUp.id}`)}
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

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        ) : followUp ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <dl className="divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Follow-up ID</dt>
                <dd className="font-semibold text-gray-900">#{followUp.id}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Lead ID</dt>
                <dd className="font-semibold">
                  <Link href={`/lead-details?id=${followUp.leadId}`} className="text-blue-600 hover:underline">
                    #{followUp.leadId}
                  </Link>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Agent ID</dt>
                <dd className="font-semibold text-gray-900">{followUp.agentId}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Follow-up Date & Time</dt>
                <dd className="text-gray-700 whitespace-nowrap">{followUp.followUpDate || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Purpose</dt>
                <dd className="text-gray-900 font-medium">{followUp.purpose || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5 items-center">
                <dt className="text-gray-500 font-medium">Status</dt>
                <dd>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      followUp.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : followUp.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {followUp.status || "-"}
                  </span>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Remarks</dt>
                <dd className="text-gray-800 max-w-xs text-right">{followUp.remarks || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Created At</dt>
                <dd className="text-gray-700 whitespace-nowrap">{followUp.createdAt || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Updated At</dt>
                <dd className="text-gray-700 whitespace-nowrap">{followUp.updatedAt || "-"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function FollowUpDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <FollowUpDetailsContent />
    </Suspense>
  );
}
