"use client";

// ============================================================
// DERIVION CRM - NOTES PAGE
// Ported from notes.html + notes.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Note {
  id: number;
  leadId: number;
  userId: number;
  note?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface Lead {
  id: number;
  fullName?: string;
  name?: string;
}

interface User {
  id: number;
  fullName?: string;
  name?: string;
  username?: string;
}

export default function NotesPage() {
  const router = useRouter();

  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [leadNameMap, setLeadNameMap] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});

  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const token = getToken();

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }
    const headers = { Authorization: "Bearer " + token };

    try {
      const [notesRes, leadsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/notes`, { headers }),
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/users`, { headers }),
      ]);

      if (!notesRes.ok) throw new Error("Failed to load notes.");
      const notes: Note[] = await notesRes.json();
      setAllNotes(notes);
      setFilteredNotes(notes);

      if (leadsRes.ok) {
        const leads: Lead[] = await leadsRes.json();
        const lMap: Record<string, string> = {};
        leads.forEach((l) => {
          lMap[String(l.id)] = l.fullName || l.name || "Unknown Lead";
        });
        setLeadNameMap(lMap);
      }

      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        const uMap: Record<string, string> = {};
        users.forEach((u) => {
          uMap[String(u.id)] = u.fullName || u.name || u.username || "Unknown User";
        });
        setUserNameMap(uMap);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search filter
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredNotes(allNotes);
      setMessage(allNotes.length === 0 ? "No notes found." : "");
      return;
    }

    const s = searchText.toLowerCase().trim();
    const filtered = allNotes.filter((note) => {
      const leadName = (leadNameMap[String(note.leadId)] || "").toLowerCase();
      const userName = (userNameMap[String(note.userId)] || "").toLowerCase();
      return (
        String(note.id ?? "").toLowerCase().includes(s) ||
        String(note.leadId ?? "").toLowerCase().includes(s) ||
        String(note.userId ?? "").toLowerCase().includes(s) ||
        leadName.includes(s) ||
        userName.includes(s) ||
        (note.note || "").toLowerCase().includes(s) ||
        (note.createdAt || "").toLowerCase().includes(s)
      );
    });

    setFilteredNotes(filtered);
    setMessage(filtered.length === 0 ? "No matching notes found." : "");
  }, [searchText, allNotes, leadNameMap, userNameMap]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Note ID ${id}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to delete note.");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Unable to delete note.");
    }
  };

  const thCls = "px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider";
  const tdCls = "px-3 py-3 text-sm text-gray-700 border-t border-gray-100";

  return (
    <DashboardLayout activeMenu="notes" title="Notes">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <input
          type="text"
          id="searchNote"
          placeholder="Search notes..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/add-note")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add Note
          </button>
          <button
            type="button"
            onClick={loadData}
            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {message && (
        <p id="message" className="text-blue-600 text-sm font-medium mb-3">{message}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-900">
              <tr>
                <th className={thCls}>ID</th>
                <th className={thCls}>Lead</th>
                <th className={thCls}>User</th>
                <th className={thCls}>Note</th>
                <th className={thCls}>Created At</th>
                <th className={thCls}>Action</th>
              </tr>
            </thead>
            <tbody id="notesTableBody">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Loading notes...</td></tr>
              ) : filteredNotes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No notes found.</td></tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className={tdCls}>{note.id}</td>
                    <td className={tdCls}>
                      <span className="font-semibold text-gray-800">{leadNameMap[String(note.leadId)] || "Unknown Lead"}</span>
                      <br />
                      <span className="text-xs text-gray-400">ID: {note.leadId}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="font-semibold text-gray-800">{userNameMap[String(note.userId)] || "Unknown User"}</span>
                      <br />
                      <span className="text-xs text-gray-400">ID: {note.userId}</span>
                    </td>
                    <td className={`${tdCls} max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap`}>{note.note || "-"}</td>
                    <td className={`${tdCls} text-xs`}>{note.createdAt || "-"}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <button type="button" onClick={() => router.push(`/note-details?id=${note.id}`)}
                        className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1">View</button>
                      <button type="button" onClick={() => router.push(`/edit-note?id=${note.id}`)}
                        className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1">Edit</button>
                      <button type="button" onClick={() => handleDelete(note.id)}
                        className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors">Delete</button>
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
