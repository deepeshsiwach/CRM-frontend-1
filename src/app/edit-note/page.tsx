"use client";

// ============================================================
// DERIVION CRM - EDIT NOTE PAGE
// Ported from edit-note.html + edit-note.js
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
}

function EditNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("id");

  const [leadId, setLeadId] = useState("");
  const [userId, setUserId] = useState("");
  const [noteText, setNoteText] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();

  const loadNote = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    if (!noteId) {
      setMessage({ text: "Note ID is missing.", isError: true });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load note");
      const note: Note = await res.json();
      setLeadId(String(note.leadId ?? ""));
      setUserId(String(note.userId ?? ""));
      setNoteText(note.note || "");
    } catch {
      setMessage({ text: "Unable to load note.", isError: true });
    } finally {
      setLoading(false);
    }
  }, [noteId, token, router]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteId || !token) return;

    if (!noteText.trim()) {
      setMessage({ text: "Note cannot be empty.", isError: true });
      return;
    }

    setSubmitting(true);
    setMessage({ text: "Updating note...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          leadId: Number(leadId),
          userId: Number(userId),
          note: noteText.trim(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update note");
      }

      setMessage({ text: "Note updated successfully.", isError: false });
      setTimeout(() => {
        router.push(`/note-details?id=${noteId}`);
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update note.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeMenu="notes" title="Edit Note">
        <p style={{ padding: 20 }}>Loading note...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="notes">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit Note #{noteId}</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Update note details</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/note-details?id=${noteId}`)}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          ← Cancel
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
        <form id="editNoteForm" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="leadId" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Lead ID</label>
            <input
              type="number"
              id="leadId"
              required
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="userId" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>User ID</label>
            <input
              type="number"
              id="userId"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="note" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Note Content *</label>
            <textarea
              id="note"
              rows={4}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              className="primary-button"
              style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/note-details?id=${noteId}`)}
              style={{ padding: "9px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
            >
              Cancel
            </button>

            {message && (
              <span
                id="message"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: message.isError ? "#dc2626" : "#15803d",
                }}
              >
                {message.text}
              </span>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function EditNotePage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <EditNoteContent />
    </Suspense>
  );
}
