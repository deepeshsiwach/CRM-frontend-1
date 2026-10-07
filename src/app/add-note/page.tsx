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
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Note</h1>
            <p className="text-sm text-gray-500 mt-0.5">Attach a note or update to this lead record.</p>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form id="addNoteForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="leadDisplay" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Lead
              </label>
              <input
                type="text"
                id="leadDisplay"
                disabled
                value={leadDisplay}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              {!leadIdParam && (
                <input
                  type="number"
                  placeholder="Enter Lead ID"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label htmlFor="userDisplay" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                User
              </label>
              <input
                type="text"
                id="userDisplay"
                disabled
                value={userDisplay}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="note" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Note *
              </label>
              <textarea
                id="note"
                rows={4}
                required
                placeholder="Enter note details here..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {submitting ? "Adding..." : "Add Note"}
              </button>
              <button
                type="button"
                onClick={() => setNote("")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Cancel
              </button>

              {message && (
                <span
                  id="message"
                  className={`text-xs font-semibold ${
                    message.isError ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AddNotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <AddNoteContent />
    </Suspense>
  );
}
