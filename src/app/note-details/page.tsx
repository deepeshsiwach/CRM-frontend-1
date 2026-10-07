"use client";

// ============================================================
// DERIVION CRM - NOTE DETAILS PAGE
// Ported from note-details.html + note-details.js
// ============================================================

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
        <div className="p-8 text-center text-gray-400">Loading note details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="notes">
      <div className="space-y-6 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Note Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">Viewing note #{noteId}</p>
          </div>
          <div className="flex items-center gap-3">
            {note && (
              <button
                type="button"
                onClick={() => router.push(`/edit-note?id=${note.id}`)}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Edit Note
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/notes")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              &larr; Back to Notes
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        ) : note ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <dl className="divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Note ID</dt>
                <dd className="font-semibold text-gray-900">{note.id}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Lead ID</dt>
                <dd className="font-semibold">
                  <Link href={`/lead-details?id=${note.leadId}`} className="text-blue-600 hover:underline">
                    #{note.leadId}
                  </Link>
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">User ID</dt>
                <dd className="font-semibold text-gray-900">{note.userId}</dd>
              </div>

              <div className="py-3">
                <dt className="text-gray-500 font-medium mb-1.5">Note Content</dt>
                <dd className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {note.note || "-"}
                </dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Created At</dt>
                <dd className="text-gray-700 whitespace-nowrap">{note.createdAt || "-"}</dd>
              </div>

              <div className="flex justify-between py-2.5">
                <dt className="text-gray-500 font-medium">Updated At</dt>
                <dd className="text-gray-700 whitespace-nowrap">{note.updatedAt || "-"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function NoteDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <NoteDetailsContent />
    </Suspense>
  );
}
