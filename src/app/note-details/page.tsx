"use client";

// ============================================================
// DERIVION CRM - NOTE DETAILS PAGE
// Ported from note-details.html + note-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Note {
  id: number;
  leadId: number;
  userId: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

function NoteDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("id");

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getToken();

  const loadDetails = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    if (!noteId) {
      setError("Note ID is missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load note details.");
      const data: Note = await res.json();
      setNote(data);
    } catch {
      setError("Failed to load note details.");
    } finally {
      setLoading(false);
    }
  }, [noteId, token, router]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
    return (
      <DashboardLayout activeMenu="notes" title="Note Details">
        <p style={{ padding: 20 }}>Loading note details...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="notes">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Note Details</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Viewing note #{noteId}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {note && (
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push(`/edit-note?id=${note.id}`)}
              style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
            >
              ✏️ Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/notes")}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            ← Back to Notes
          </button>
        </div>
      </div>

      {error ? (
        <p id="message" style={{ color: "red" }}>{error}</p>
      ) : note ? (
        <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Note ID:</strong>
              <span id="noteId">{note.id}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Lead ID:</strong>
              <span id="leadId">
                <a href={`/lead-details?id=${note.leadId}`} style={{ color: "#2563eb", textDecoration: "underline" }}>
                  {note.leadId}
                </a>
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>User ID:</strong>
              <span id="userId">{note.userId}</span>
            </div>

            <div style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563", display: "block", marginBottom: 6 }}>Note Content:</strong>
              <p id="note" style={{ margin: 0, color: "#111827", whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 6, border: "1px solid #f3f4f6" }}>
                {note.note || "-"}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#4b5563" }}>Created At:</strong>
              <span id="createdAt">{note.createdAt || "-"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <strong style={{ color: "#4b5563" }}>Updated At:</strong>
              <span id="updatedAt">{note.updatedAt || "-"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default function NoteDetailsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <NoteDetailsContent />
    </Suspense>
  );
}
