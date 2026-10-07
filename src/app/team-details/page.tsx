"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface TeamData {
  id?: number | string;
  teamName?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function TeamDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("id");

  const [team, setTeam] = useState<TeamData | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("teams")) {
      router.push("/dashboard");
      return;
    }

    if (!teamId) {
      setMessage({ text: "Team ID is missing.", isError: true });
      return;
    }

    async function loadTeam() {
      setMessage({ text: "Loading team...", isError: false });
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load team. Status: " + res.status);
        }

        const data = await res.json();
        setTeam(data);
        setMessage(null);
      } catch (err: unknown) {
        console.error("Error loading team:", err);
        setMessage({ text: "Unable to load team.", isError: true });
      }
    }

    loadTeam();
  }, [teamId, router]);

  return (
    <div className="team-details-page">
      <div className="team-details-page-header">
        <div>
          <h2>Team Details</h2>
          <p>View CRM team information.</p>
        </div>
        <button type="button" onClick={() => router.push("/teams")}>
          ← Back to Teams
        </button>
      </div>

      {message && (
        <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
          {message.text}
        </div>
      )}

      <div className="team-details-card">
        <div className="detail-row">
          <div className="detail-label">Team ID</div>
          <div className="detail-value" id="teamId">{team?.id ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Team Name</div>
          <div className="detail-value" id="teamName">{team?.teamName ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Description</div>
          <div className="detail-value" id="description">{team?.description ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Status</div>
          <div className="detail-value" id="status">{team?.status ?? "-"}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Created At</div>
          <div className="detail-value" id="createdAt">{team?.createdAt ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetailsPage() {
  return (
    <DashboardLayout activePage="teams">
      <Suspense fallback={<div>Loading team details...</div>}>
        <TeamDetailsContent />
      </Suspense>
    </DashboardLayout>
  );
}
