"use client";

// ============================================================
// DERIVION CRM - FOLLOW-UP DETAILS PAGE
// Ported from follow-up-details.html + follow-up-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
        <p style={{ padding: 20 }}>Loading follow-up details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="follow-ups">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Follow-up Details</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Viewing follow-up #{followUpId}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {followUp && (
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push(`/edit-follow-up?id=${followUp.id}`)}
              style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
            >
              ✏️ Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/follow-ups")}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            ← Back to Follow-ups
          </button>
        </div>
      </div>

      {error ? (
        <p id="message" style={{ color: "red" }}>{error}</p>
      ) : followUp ? (
        <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Follow-up ID:</strong>
              <span id="followUpId">{followUp.id}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Lead ID:</strong>
              <span id="leadId">
                <a href={`/lead-details?id=${followUp.leadId}`} style={{ color: "#2563eb", textDecoration: "underline" }}>
                  {followUp.leadId}
                </a>
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Agent ID:</strong>
              <span id="agentId">{followUp.agentId}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Follow-up Date & Time:</strong>
              <span id="followUpDate">{followUp.followUpDate || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Purpose:</strong>
              <span id="purpose">{followUp.purpose || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Status:</strong>
              <span
                id="status"
                style={{
                  padding: "3px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    followUp.status === "PENDING"
                      ? "#fef3c7"
                      : followUp.status === "COMPLETED"
                      ? "#dcfce7"
                      : "#f3f4f6",
                  color:
                    followUp.status === "PENDING"
                      ? "#92400e"
                      : followUp.status === "COMPLETED"
                      ? "#166534"
                      : "#374151",
                }}
              >
                {followUp.status || "-"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Remarks:</strong>
              <span id="remarks">{followUp.remarks || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Created At:</strong>
              <span id="createdAt">{followUp.createdAt || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <strong style={{ color: "#4b5563" }}>Updated At:</strong>
              <span id="updatedAt">{followUp.updatedAt || "-"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default function FollowUpDetailsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <FollowUpDetailsContent />
    </Suspense>
  );
}
