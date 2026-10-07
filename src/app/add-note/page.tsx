"use client";

// ============================================================
// DERIVION CRM - ADD NOTE PAGE
// Ported from add-note.html + add-note.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserId } from "@/lib/auth";

interface Lead {
  id: number;
  fullName?: string;
  name?: string;
}

interface User {
  id: number;
  fullName?: string;
  name?: string;
}

function AddNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leadId, setLeadId] = useState(leadIdParam || "");
  const [leadDisplay, setLeadDisplay] = useState("Loading lead...");
  const [userId, setUserId] = useState("");
  const [userDisplay, setUserDisplay] = useState("");
  const [note, setNote] = useState("");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();

  const loadLeadDetails = useCallback(async () => {
    if (!leadId || !token) {
      setLeadDisplay("No Lead ID");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      const lead: Lead = await res.json();
      setLeadDisplay(`${lead.fullName || lead.name || "Lead"} (ID: ${leadId})`);
    } catch {
      setLeadDisplay(`Lead (ID: ${leadId})`);
    }
  }, [leadId, token]);

  const loadUserDetails = useCallback(async () => {
    const currentUserId = getUserId();
    if (!currentUserId || !token) {
      setUserDisplay("No User ID");
      return;
    }
    setUserId(currentUserId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      const user: User = await res.json();
      setUserDisplay(`${user.fullName || user.name || "User"} (ID: ${currentUserId})`);
    } catch {
      setUserDisplay(`User (ID: ${currentUserId})`);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    loadLeadDetails();
    loadUserDetails();
  }, [token, router, loadLeadDetails, loadUserDetails]);

  const goBack = () => {
    if (leadIdParam) {
      router.push(`/lead-details?id=${leadIdParam}`);
    } else {
      router.push("/notes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      setMessage({ text: "Please select a valid lead.", isError: true });
      return;
    }
    if (!userId) {
      setMessage({ text: "Please select a valid user.", isError: true });
      return;
    }
    if (!note.trim()) {
      setMessage({ text: "Please enter a note.", isError: true });
      return;
    }

    const payload = {
      leadId: Number(leadId),
      userId: Number(userId),
      note: note.trim(),
    };

    setSubmitting(true);
    setMessage({ text: "Adding note...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (!res.ok) {
        throw new Error(responseText || "Failed to add note.");
      }

      setMessage({ text: "Note added successfully!", isError: false });
      setTimeout(() => {
        goBack();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to the backend.";
      setMessage({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="notes" title="Add Note">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Add New Note</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Attach a note to this lead</p>
        </div>
        <button
          type="button"
          onClick={goBack}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>

      <div className="form-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, maxWidth: 700 }}>
        <form id="addNoteForm" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="leadDisplay" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Lead</label>
            <input
              type="text"
              id="leadDisplay"
              disabled
              value={leadDisplay}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f3f4f6" }}
            />
            {!leadIdParam && (
              <input
                type="number"
                placeholder="Enter Lead ID"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              />
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 15 }}>
            <label htmlFor="userDisplay" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>User</label>
            <input
              type="text"
              id="userDisplay"
              disabled
              value={userDisplay}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f3f4f6" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="note" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Note *</label>
            <textarea
              id="note"
              rows={4}
              required
              placeholder="Enter note details here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              {submitting ? "Adding..." : "Add Note"}
            </button>
            <button
              type="button"
              onClick={() => setNote("")}
              style={{ padding: "9px 18px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={goBack}
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

export default function AddNotePage() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>Loading...</p>}>
      <AddNoteContent />
    </Suspense>
  );
}
