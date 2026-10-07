"use client";

// ============================================================
// DERIVION CRM - LEADS PAGE
// Ported from leads.html + leads.js
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

// ============================================================
// TYPES
// ============================================================

interface Lead {
  id: number;
  fullName?: string;
  email?: string;
  phone?: string;
  courseInterested?: string;
  leadSource?: string;
  status?: string;
  priority?: string;
  city?: string;
  campaignId?: number | null;
  [key: string]: unknown;
}

const STATUS_OPTIONS = [
  "NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "COUNSELLING",
  "ENROLLED", "NOT_INTERESTED", "WRONG_NUMBER", "NO_RESPONSE", "LOST"
];

const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];
const SOURCE_OPTIONS = ["Website", "LinkedIn", "Instagram", "Facebook", "Referral", "Walk-in"];

const PAGE_SIZE = 25;

// ============================================================
// LEADS PAGE
// ============================================================

export default function LeadsPage() {
  const router = useRouter();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [message, setMessage] = useState("");

  // Excel import
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<Record<string, unknown>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = getToken();

  const loadLeads = useCallback(async () => {
    if (!token) { router.replace("/"); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      const data: Lead[] = await res.json();
      setAllLeads(data);
      const courses = [...new Set(data.map((l) => l.courseInterested).filter(Boolean) as string[])].sort();
      setCourseOptions(courses);
    } catch {
      setMessage("Unable to load leads.");
    }
  }, [token, router]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Apply filters
  useEffect(() => {
    let leads = [...allLeads];

    if (searchText) {
      const s = searchText.toLowerCase();
      leads = leads.filter((l) =>
        String(l.id).toLowerCase().includes(s) ||
        (l.fullName || "").toLowerCase().includes(s) ||
        (l.email || "").toLowerCase().includes(s) ||
        (l.phone || "").toLowerCase().includes(s) ||
        (l.courseInterested || "").toLowerCase().includes(s) ||
        (l.leadSource || "").toLowerCase().includes(s) ||
        (l.city || "").toLowerCase().includes(s) ||
        (l.status || "").toLowerCase().includes(s)
      );
    }

    if (statusFilter) leads = leads.filter((l) => l.status === statusFilter);
    if (priorityFilter) leads = leads.filter((l) => l.priority === priorityFilter);
    if (sourceFilter) leads = leads.filter((l) => l.leadSource === sourceFilter);
    if (courseFilter) leads = leads.filter((l) => l.courseInterested === courseFilter);

    // Sort
    if (sortField) {
      const priorityOrder: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      leads.sort((a, b) => {
        let va: string | number = (a[sortField] as string | number) ?? "";
        let vb: string | number = (b[sortField] as string | number) ?? "";
        if (sortField === "id") { va = Number(va); vb = Number(vb); }
        if (sortField === "priority") { va = priorityOrder[String(va)] || 999; vb = priorityOrder[String(vb)] || 999; }
        if (sortField === "status" || sortField === "fullName") {
          va = String(va || "").toLowerCase();
          vb = String(vb || "").toLowerCase();
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredLeads(leads);
    setCurrentPage(1);
  }, [allLeads, searchText, statusFilter, priorityFilter, sourceFilter, courseFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + PAGE_SIZE);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setCourseFilter("");
    setSortField("");
    setSortDir("asc");
  };

  const viewLead = (id: number) => router.push(`/lead-details?id=${id}`);
  const editLead = (id: number) => router.push(`/lead-edit?id=${id}`);
  const assignLead = (id: number) => router.push(`/lead-assignments?leadId=${id}`);

  const deleteLead = async (id: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed");
      setMessage("Lead deleted successfully.");
      loadLeads();
    } catch {
      setMessage("Unable to delete lead.");
    }
  };

  // ============================================================
  // EXCEL IMPORT
  // ============================================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setExcelFile(file);
    setPreviewOpen(false);
    setExcelRows([]);
    setExcelHeaders([]);
    setImportMessage("");
  };

  const previewExcelFile = async () => {
    if (!excelFile) { setImportMessage("Please select a file."); return; }
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    if (!win || !win.XLSX) {
      setImportMessage("XLSX library not loaded yet. Please wait.");
      return;
    }
    const XLSX = win.XLSX as {
      read: (data: ArrayBuffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
      utils: {
        sheet_to_json: (sheet: unknown, opts: { header: number; defval: string }) => unknown[][];
      };
    };
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as ArrayBuffer;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (rows.length < 2) { setImportMessage("File has no data."); return; }
      const headers = (rows[0] as string[]).map(String);
      const dataRows = rows.slice(1).map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = (row as unknown[])[i]; });
        return obj;
      });
      setExcelHeaders(headers);
      setExcelRows(dataRows);
      setPreviewOpen(true);
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const importExcelLeads = async () => {
    if (!excelRows.length) { setImportMessage("No data to import."); return; }
    setImportMessage("Importing...");
    let success = 0, failed = 0;
    for (const row of excelRows) {
      try {
        const leadData = {
          fullName: row["Name"] || row["Full Name"] || row["fullName"] || "",
          email: row["Email"] || row["email"] || "",
          phone: String(row["Phone"] || row["phone"] || row["Mobile"] || ""),
          courseInterested: String(row["Course"] || row["courseInterested"] || row["Course Interested"] || ""),
          leadSource: String(row["Source"] || row["leadSource"] || row["Lead Source"] || ""),
          status: String(row["Status"] || row["status"] || "NEW"),
          priority: String(row["Priority"] || row["priority"] || "MEDIUM"),
          city: String(row["City"] || row["city"] || ""),
        };
        const res = await fetch(`${API_BASE_URL}/api/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(leadData),
        });
        if (res.ok) success++;
        else failed++;
      } catch { failed++; }
    }
    setImportMessage(`Import complete: ${success} success, ${failed} failed.`);
    loadLeads();
  };

  return (
    <>
      {/* Load XLSX library */}
      <Script
        src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"
        onLoad={() => setXlsxLoaded(true)}
      />

      <DashboardLayout activeMenu="leads">
        <h2>Leads</h2>

        {/* ADD / IMPORT BUTTONS */}
        <button
          type="button"
          className="add-lead-button"
          onClick={() => router.push("/add-lead")}
        >
          + Add Lead
        </button>

        <button
          type="button"
          className="import-lead-button"
          onClick={() => setExcelOpen(!excelOpen)}
        >
          📊 Import Excel
        </button>

        {/* EXCEL IMPORT SECTION */}
        {excelOpen && (
          <div id="excelImportSection" className="excel-import-section">
            <div className="excel-import-header">
              <div>
                <h3>Import Leads from Excel</h3>
                <p>Upload an Excel file to import multiple leads into the CRM.</p>
              </div>
              <button type="button" className="excel-close-button" onClick={() => setExcelOpen(false)}>✕</button>
            </div>

            <div className="excel-upload-area">
              <div className="excel-upload-icon">📊</div>
              <h4>Select Excel File</h4>
              <p>Supported format: .xlsx</p>
              <input
                type="file"
                id="excelFile"
                accept=".xlsx"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              {excelFile && <div className="excel-file-name">{excelFile.name}</div>}
            </div>

            <div className="excel-import-actions">
              <button type="button" className="primary-button" onClick={previewExcelFile}>
                Preview Excel
              </button>
              <button type="button" className="secondary-button" onClick={() => setExcelOpen(false)}>
                Cancel
              </button>
            </div>

            {previewOpen && (
              <div id="excelPreviewSection" className="excel-preview-section">
                <div className="excel-preview-header">
                  <div>
                    <h4>Excel Preview</h4>
                    <p id="excelPreviewInfo">{excelRows.length} rows found. Review before importing.</p>
                  </div>
                </div>

                <div className="excel-preview-table-container">
                  <table className="excel-preview-table">
                    <thead>
                      <tr>{excelHeaders.map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {excelRows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {excelHeaders.map((h) => (
                            <td key={h}>{String(row[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importMessage && (
                  <div id="excelImportMessage" className="excel-import-message">
                    {importMessage}
                  </div>
                )}

                <button type="button" id="confirmExcelImport" className="primary-button" onClick={importExcelLeads}>
                  Import Leads
                </button>
              </div>
            )}
          </div>
        )}

        {/* LEAD FILTERS */}
        <div className="leads-toolbar">
          <input
            type="text"
            id="searchLead"
            placeholder="Search leads..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <select id="filterStatus" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select id="filterPriority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select id="filterSource" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select id="filterCourse" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All Courses</option>
            {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button id="refreshLeads" onClick={loadLeads}>Refresh</button>
          <button id="clearLeadFilters" onClick={clearFilters}>Clear Filters</button>
        </div>

        {message && <p style={{ color: "green", margin: "10px 0" }}>{message}</p>}

        {/* LEADS TABLE */}
        <div className="table-container">
          <table className="leads-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th className="sortable" onClick={() => handleSort("id")}>Lead ID ↕</th>
                <th className="sortable" onClick={() => handleSort("fullName")}>Name ↕</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Course</th>
                <th>Source</th>
                <th className="sortable" onClick={() => handleSort("status")}>Status ↕</th>
                <th className="sortable" onClick={() => handleSort("priority")}>Priority ↕</th>
                <th>City</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="leadsTableBody">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "30px" }}>
                    <strong>No leads found</strong><br />
                    <span>Try changing your search or filters.</span>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead, index) => (
                  <tr key={lead.id}>
                    <td>{startIndex + index + 1}</td>
                    <td>{lead.id ?? ""}</td>
                    <td>{lead.fullName ?? ""}</td>
                    <td>{lead.email ?? ""}</td>
                    <td>{lead.phone ?? ""}</td>
                    <td>{lead.courseInterested ?? ""}</td>
                    <td>{lead.leadSource ?? ""}</td>
                    <td>
                      <span className={`lead-status-badge status-${(lead.status || "").toLowerCase().replace(/_/g, "-")}`}>
                        {lead.status || ""}
                      </span>
                    </td>
                    <td>
                      <span className={`lead-priority-badge priority-${(lead.priority || "").toLowerCase()}`}>
                        {lead.priority || ""}
                      </span>
                    </td>
                    <td>{lead.city ?? ""}</td>
                    <td className="lead-actions">
                      <button type="button" className="action-view" title="View Lead" onClick={() => viewLead(lead.id)}>👁</button>
                      <button type="button" className="action-edit" title="Edit Lead" onClick={() => editLead(lead.id)}>✏️</button>
                      <button type="button" className="action-assign" title="Assign Lead" onClick={() => assignLead(lead.id)}>👤</button>
                      <button type="button" className="action-delete" title="Delete Lead" onClick={() => deleteLead(lead.id)}>🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="lead-pagination">
          <div className="pagination-info">
            Showing{" "}
            <span id="paginationStart">{filteredLeads.length === 0 ? 0 : startIndex + 1}</span>
            {" "}-{" "}
            <span id="paginationEnd">{Math.min(startIndex + PAGE_SIZE, filteredLeads.length)}</span>
            {" "}of{" "}
            <span id="paginationTotal">{filteredLeads.length}</span>
            {" "}leads
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              id="previousPage"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span id="paginationPage">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              id="nextPage"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
