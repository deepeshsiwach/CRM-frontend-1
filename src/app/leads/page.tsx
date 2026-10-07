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

  // Shared style helpers
  const inputCls = "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
  const thCls = "px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap";
  const tdCls = "px-3 py-3 text-sm text-gray-700 border-t border-gray-100";

  return (
    <>
      {/* Load XLSX library */}
      <Script
        src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"
        onLoad={() => setXlsxLoaded(true)}
      />

      <DashboardLayout activeMenu="leads">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Leads</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/add-lead")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
            >
              + Add Lead
            </button>
            <button
              type="button"
              onClick={() => setExcelOpen(!excelOpen)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
            >
              📊 Import Excel
            </button>
          </div>
        </div>

        {/* EXCEL IMPORT SECTION */}
        {excelOpen && (
          <div id="excelImportSection" className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">Import Leads from Excel</h3>
                <p className="text-sm text-gray-500 mt-0.5">Upload an Excel file to import multiple leads into the CRM.</p>
              </div>
              <button
                type="button"
                onClick={() => setExcelOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 mb-4">
              <div className="text-4xl mb-2">📊</div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Select Excel File</h4>
              <p className="text-xs text-gray-400 mb-3">Supported format: .xlsx</p>
              <input
                type="file"
                id="excelFile"
                accept=".xlsx"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 cursor-pointer"
              />
              {excelFile && <div className="mt-2 text-xs text-gray-500 font-medium">{excelFile.name}</div>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={previewExcelFile}
                disabled={!excelFile}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Preview Excel
              </button>
              <button
                type="button"
                onClick={() => setExcelOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>

            {previewOpen && (
              <div id="excelPreviewSection" className="mt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Excel Preview</h4>
                    <p id="excelPreviewInfo" className="text-xs text-gray-500 mt-0.5">{excelRows.length} rows found. Review before importing.</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-3">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>{excelHeaders.map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {excelRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {excelHeaders.map((h) => (
                            <td key={h} className={tdCls}>{String(row[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importMessage && (
                  <div id="excelImportMessage" className="text-sm font-medium text-blue-700 bg-blue-50 px-4 py-2.5 rounded-lg mb-3">
                    {importMessage}
                  </div>
                )}

                <button
                  type="button"
                  id="confirmExcelImport"
                  onClick={importExcelLeads}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  Import Leads
                </button>
              </div>
            )}
          </div>
        )}

        {/* LEAD FILTERS */}
        <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <input
            type="text"
            id="searchLead"
            placeholder="Search leads..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`${inputCls} flex-1 min-w-[180px]`}
          />

          <select id="filterStatus" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select id="filterPriority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputCls}>
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select id="filterSource" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={inputCls}>
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select id="filterCourse" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={inputCls}>
            <option value="">All Courses</option>
            {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            id="refreshLeads"
            onClick={loadLeads}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            id="clearLeadFilters"
            onClick={clearFilters}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>

        {message && <p className="text-green-600 font-medium text-sm mb-4">{message}</p>}

        {/* LEADS TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thCls}>S.No.</th>
                  <th className={`${thCls} cursor-pointer hover:bg-gray-100`} onClick={() => handleSort("id")}>Lead ID ↕</th>
                  <th className={`${thCls} cursor-pointer hover:bg-gray-100`} onClick={() => handleSort("fullName")}>Name ↕</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Course</th>
                  <th className={thCls}>Source</th>
                  <th className={`${thCls} cursor-pointer hover:bg-gray-100`} onClick={() => handleSort("status")}>Status ↕</th>
                  <th className={`${thCls} cursor-pointer hover:bg-gray-100`} onClick={() => handleSort("priority")}>Priority ↕</th>
                  <th className={thCls}>City</th>
                  <th className={thCls}>Action</th>
                </tr>
              </thead>
              <tbody id="leadsTableBody">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-400">
                      <div className="text-4xl mb-2">🔍</div>
                      <strong className="block text-gray-600">No leads found</strong>
                      <span className="text-sm">Try changing your search or filters.</span>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead, index) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className={tdCls}>{startIndex + index + 1}</td>
                      <td className={tdCls}>{lead.id ?? ""}</td>
                      <td className={`${tdCls} font-medium text-gray-800`}>{lead.fullName ?? ""}</td>
                      <td className={tdCls}>{lead.email ?? ""}</td>
                      <td className={tdCls}>{lead.phone ?? ""}</td>
                      <td className={tdCls}>{lead.courseInterested ?? ""}</td>
                      <td className={tdCls}>{lead.leadSource ?? ""}</td>
                      <td className={tdCls}>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold status-${(lead.status || "").toLowerCase().replace(/_/g, "-")}`}>
                          {lead.status || ""}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold priority-${(lead.priority || "").toLowerCase()}`}>
                          {lead.priority || ""}
                        </span>
                      </td>
                      <td className={tdCls}>{lead.city ?? ""}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <button type="button" title="View Lead" onClick={() => viewLead(lead.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-blue-100 text-base transition-colors mr-0.5">👁</button>
                        <button type="button" title="Edit Lead" onClick={() => editLead(lead.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-yellow-100 text-base transition-colors mr-0.5">✏️</button>
                        <button type="button" title="Assign Lead" onClick={() => assignLead(lead.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-green-100 text-base transition-colors mr-0.5">👤</button>
                        <button type="button" title="Delete Lead" onClick={() => deleteLead(lead.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-red-100 text-base transition-colors">🗑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-4 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">
            Showing{" "}
            <span id="paginationStart" className="font-semibold text-gray-700">{filteredLeads.length === 0 ? 0 : startIndex + 1}</span>
            {" "}-{" "}
            <span id="paginationEnd" className="font-semibold text-gray-700">{Math.min(startIndex + PAGE_SIZE, filteredLeads.length)}</span>
            {" "}of{" "}
            <span id="paginationTotal" className="font-semibold text-gray-700">{filteredLeads.length}</span>
            {" "}leads
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="previousPage"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span id="paginationPage" className="text-sm font-medium text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              id="nextPage"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
