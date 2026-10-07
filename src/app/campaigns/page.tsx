"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, hasRoleAccess } from "@/lib/auth";

interface Campaign {
  id: number | string;
  campaignName?: string;
  description?: string;
  source?: string;
  courseId?: number | string | null;
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    if (!hasRoleAccess("campaigns")) {
      router.push("/dashboard");
      return;
    }

    loadCampaigns();
  }, [router]);

  async function loadCampaigns() {
    setLoading(true);
    setMessage({ text: "Loading campaigns...", isError: false });
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load campaigns. Status: " + res.status);
      }

      const data = await res.json();
      setCampaigns(data || []);
      setMessage(null);
    } catch (err: unknown) {
      console.error("Error loading campaigns:", err);
      setMessage({ text: "Unable to load campaigns.", isError: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number | string) {
    const confirmed = confirm("Are you sure you want to delete this campaign?");
    if (!confirmed) return;

    try {
      setMessage({ text: "Deleting campaign...", isError: false });
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Unable to delete campaign.");
      }

      setMessage({ text: "Campaign deleted successfully.", isError: false });
      loadCampaigns();
    } catch (err: unknown) {
      console.error("Error deleting campaign:", err);
      const errorMsg = err instanceof Error ? err.message : "Unable to delete campaign.";
      setMessage({ text: errorMsg, isError: true });
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(c.id ?? "").toLowerCase().includes(s) ||
      String(c.campaignName ?? "").toLowerCase().includes(s) ||
      String(c.description ?? "").toLowerCase().includes(s) ||
      String(c.source ?? "").toLowerCase().includes(s) ||
      String(c.courseId ?? "").toLowerCase().includes(s) ||
      String(c.status ?? "").toLowerCase().includes(s) ||
      String(c.createdAt ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout activePage="campaigns">
      <div className="campaigns-page">
        <div className="campaigns-page-header">
          <div>
            <h2>Campaigns</h2>
            <p>Manage marketing campaigns and admission sources.</p>
          </div>
          <div className="campaigns-header-actions">
            <button type="button" onClick={() => router.push("/dashboard")}>
              ← Dashboard
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/add-campaign")}
            >
              + Add Campaign
            </button>
          </div>
        </div>

        {message && (
          <div id="message" style={{ color: message.isError ? "red" : "green", marginBottom: "16px" }}>
            {message.text}
          </div>
        )}

        <div className="campaigns-toolbar">
          <input
            type="text"
            id="searchCampaign"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" id="refreshCampaigns" onClick={loadCampaigns} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="campaigns-table-container">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Campaign Name</th>
                <th>Description</th>
                <th>Source</th>
                <th>Course ID</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="campaignsTableBody">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center" }}>
                    {loading ? "Loading..." : "No campaigns found."}
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.campaignName ?? ""}</td>
                    <td>{c.description ?? ""}</td>
                    <td>{c.source ?? ""}</td>
                    <td>{c.courseId ?? ""}</td>
                    <td>{c.startDate ?? ""}</td>
                    <td>{c.endDate ?? ""}</td>
                    <td>{c.status ?? ""}</td>
                    <td>{c.createdAt ?? ""}</td>
                    <td
                      style={{
                        position: "sticky",
                        right: 0,
                        background: "#ffffff",
                        zIndex: 2,
                        whiteSpace: "nowrap",
                        minWidth: "210px",
                        textAlign: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/campaign-details?id=${c.id}`))}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(() => router.push(`/edit-campaign?id=${c.id}`))}
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(c.id)}>
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
