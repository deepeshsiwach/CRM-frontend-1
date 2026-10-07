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

  return (
    <DashboardLayout activeMenu="notes" title="Notes">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, gap: 15, flexWrap: "wrap" }}>
        <input
          type="text"
          id="searchNote"
          placeholder="Search notes..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 300, width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/add-note")}
            style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 600 }}
          >
            + Add Note
          </button>
          <button
            type="button"
            onClick={loadData}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {message && <p id="message" style={{ color: "#2563eb", fontSize: 13, margin: "6px 0 12px" }}>{message}</p>}

      <div className="table-container" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflowX: "auto" }}>
        <table className="leads-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111827", color: "#fff" }}>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Lead</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>User</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Note</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Created At</th>
              <th style={{ padding: "12px 10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody id="notesTableBody">
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Loading notes...</td>
              </tr>
            ) : filteredNotes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No notes found.
                </td>
              </tr>
            ) : (
              filteredNotes.map((note) => (
                <tr key={note.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>{note.id}</td>
                  <td style={{ padding: "10px" }}>
                    <strong>{leadNameMap[String(note.leadId)] || "Unknown Lead"}</strong>
                    <br />
                    <small style={{ color: "#6b7280" }}>ID: {note.leadId}</small>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <strong>{userNameMap[String(note.userId)] || "Unknown User"}</strong>
                    <br />
                    <small style={{ color: "#6b7280" }}>ID: {note.userId}</small>
                  </td>
                  <td style={{ padding: "10px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.note || "-"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13 }}>{note.createdAt || "-"}</td>
                  <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/note-details?id=${note.id}`)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/edit-note?id=${note.id}`)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", marginRight: 4 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
