"use client";

// ============================================================
// DERIVION CRM - LEADS PAGE
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserRole } from "@/lib/auth";

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

interface Course {
  id: number;
  courseName?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "COUNSELLING",
  "ENROLLED",
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "NO_RESPONSE",
  "LOST",
];

const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];

const SOURCE_OPTIONS = [
  "Website",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Referral",
  "Walk-in",
];

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

  // ============================================================
  // EXCEL IMPORT
  // ============================================================

  const [excelOpen, setExcelOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<Record<string, unknown>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = getToken();

  // ============================================================
  // LEAD QUEUE STORAGE
  // ============================================================

  const getQueueStorageKey = useCallback(() => {
    if (typeof window === "undefined") {
      return "derivion_lead_queue";
    }

    const userId =
      window.localStorage.getItem("userId") || "current-user";

    return `derivion_lead_queue_${userId}`;
  }, []);

  // ============================================================
  // CHECK WHETHER CURRENT USER IS AGENT
  // ============================================================

  const isAgent = useCallback(() => {
    try {
      const role = getUserRole();

      return String(role || "").toUpperCase() === "AGENT";
    } catch {
      return false;
    }
  }, []);

  // ============================================================
  // SAVE LEAD QUEUE ORDER
  // ============================================================

  const saveLeadQueue = useCallback(
    (leads: Lead[]) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const ids = leads.map((lead) => lead.id);

        window.localStorage.setItem(
          getQueueStorageKey(),
          JSON.stringify(ids)
        );
      } catch (error) {
        console.error(
          "Unable to save lead queue:",
          error
        );
      }
    },
    [getQueueStorageKey]
  );

  // ============================================================
  // APPLY SAVED LEAD QUEUE ORDER
  // ============================================================

  const applySavedLeadQueue = useCallback(
    (leads: Lead[]): Lead[] => {
      if (typeof window === "undefined") {
        return leads;
      }

      try {
        const stored = window.localStorage.getItem(
          getQueueStorageKey()
        );

        if (!stored) {
          return leads;
        }

        const savedIds: number[] = JSON.parse(stored);

        if (
          !Array.isArray(savedIds) ||
          savedIds.length === 0
        ) {
          return leads;
        }

        const leadMap = new Map<number, Lead>();

        leads.forEach((lead) => {
          leadMap.set(lead.id, lead);
        });

        const orderedLeads: Lead[] = [];

        // --------------------------------------------------------
        // First add leads according to saved queue
        // --------------------------------------------------------

        savedIds.forEach((id) => {
          const lead = leadMap.get(id);

          if (lead) {
            orderedLeads.push(lead);
            leadMap.delete(id);
          }
        });

        // --------------------------------------------------------
        // New leads which were not in old queue
        // are added at the beginning.
        // --------------------------------------------------------

        const newLeads = Array.from(leadMap.values());

        return [...newLeads, ...orderedLeads];
      } catch (error) {
        console.error(
          "Unable to restore lead queue:",
          error
        );

        return leads;
      }
    },
    [getQueueStorageKey]
  );

  // ============================================================
  // ROTATE LEAD TO END OF QUEUE
  // ============================================================

  const rotateLeadToEnd = useCallback(
    (leadId: number) => {
      if (!isAgent()) {
        return;
      }

      setAllLeads((currentLeads) => {
        const index = currentLeads.findIndex(
          (lead) => lead.id === leadId
        );

        if (index === -1) {
          return currentLeads;
        }

        const selectedLead = currentLeads[index];

        const remainingLeads = currentLeads.filter(
          (lead) => lead.id !== leadId
        );

        const newOrder = [
          ...remainingLeads,
          selectedLead,
        ];

        saveLeadQueue(newOrder);

        return newOrder;
      });
    },
    [isAgent, saveLeadQueue]
  );

  // ============================================================
  // LOAD LEADS + COURSES
  // ============================================================

  const loadLeads = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      // --------------------------------------------------------
      // LOAD LEADS
      // --------------------------------------------------------

      const res = await fetch(
        `${API_BASE_URL}/api/leads`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load leads.");
      }

      const data: Lead[] = await res.json();

      // --------------------------------------------------------
      // RESTORE QUEUE ORDER
      // --------------------------------------------------------

      const orderedLeads =
        applySavedLeadQueue(data);

      setAllLeads(orderedLeads);

      // --------------------------------------------------------
      // SAVE CLEANED QUEUE
      // --------------------------------------------------------

      if (isAgent()) {
        saveLeadQueue(orderedLeads);
      }

      // --------------------------------------------------------
      // LOAD COURSES
      // --------------------------------------------------------

      try {
        const courseRes = await fetch(
          `${API_BASE_URL}/api/courses`,
          {
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );

        if (courseRes.ok) {
          const courses: Course[] =
            await courseRes.json();

          const courseNames = courses
            .map(
              (course) =>
                course.courseName
            )
            .filter(Boolean) as string[];

          // ----------------------------------------------------
          // ALSO GET COURSE NAMES FROM LEADS
          // ----------------------------------------------------

          const leadCourseNames = orderedLeads
            .map(
              (lead) =>
                lead.courseInterested
            )
            .filter(Boolean) as string[];

          const mergedCourses = [
            ...new Set([
              ...courseNames,
              ...leadCourseNames,
            ]),
          ].sort();

          setCourseOptions(mergedCourses);
        } else {
          // ----------------------------------------------------
          // FALLBACK
          // ----------------------------------------------------

          const leadCourseNames = [
            ...new Set(
              orderedLeads
                .map(
                  (lead) =>
                    lead.courseInterested
                )
                .filter(Boolean) as string[]
            ),
          ].sort();

          setCourseOptions(
            leadCourseNames
          );
        }
      } catch (courseError) {
        console.error(
          "Unable to load courses:",
          courseError
        );

        const leadCourseNames = [
          ...new Set(
            orderedLeads
              .map(
                (lead) =>
                  lead.courseInterested
              )
              .filter(Boolean) as string[]
          ),
        ].sort();

        setCourseOptions(
          leadCourseNames
        );
      }
    } catch (error) {
      console.error(
        "Error loading leads:",
        error
      );

      setMessage(
        "Unable to load leads."
      );
    }
  }, [
    token,
    router,
    applySavedLeadQueue,
    isAgent,
    saveLeadQueue,
  ]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ============================================================
  // APPLY FILTERS
  // ============================================================

  useEffect(() => {
    let leads = [...allLeads];

    // ----------------------------------------------------------
    // SEARCH
    // ----------------------------------------------------------

    if (searchText) {
      const s =
        searchText.toLowerCase();

      leads = leads.filter(
        (l) =>
          String(l.id)
            .toLowerCase()
            .includes(s) ||
          (l.fullName || "")
            .toLowerCase()
            .includes(s) ||
          (l.email || "")
            .toLowerCase()
            .includes(s) ||
          (l.phone || "")
            .toLowerCase()
            .includes(s) ||
          (l.courseInterested || "")
            .toLowerCase()
            .includes(s) ||
          (l.leadSource || "")
            .toLowerCase()
            .includes(s) ||
          (l.city || "")
            .toLowerCase()
            .includes(s) ||
          (l.status || "")
            .toLowerCase()
            .includes(s)
      );
    }

    // ----------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------

    if (statusFilter) {
      leads = leads.filter(
        (l) =>
          l.status === statusFilter
      );
    }

    // ----------------------------------------------------------
    // PRIORITY
    // ----------------------------------------------------------

    if (priorityFilter) {
      leads = leads.filter(
        (l) =>
          l.priority === priorityFilter
      );
    }

    // ----------------------------------------------------------
    // SOURCE
    // ----------------------------------------------------------

    if (sourceFilter) {
      leads = leads.filter(
        (l) =>
          l.leadSource === sourceFilter
      );
    }

    // ----------------------------------------------------------
    // COURSE
    // ----------------------------------------------------------

    if (courseFilter) {
      leads = leads.filter(
        (l) =>
          l.courseInterested ===
          courseFilter
      );
    }

    // ----------------------------------------------------------
    // SORT
    // ----------------------------------------------------------

    if (sortField) {
      const priorityOrder: Record<
        string,
        number
      > = {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };

      leads.sort((a, b) => {
        let va: string | number =
          (a[sortField] as
            | string
            | number) ?? "";

        let vb: string | number =
          (b[sortField] as
            | string
            | number) ?? "";

        if (sortField === "id") {
          va = Number(va);
          vb = Number(vb);
        }

        if (sortField === "priority") {
          va =
            priorityOrder[
            String(va)
            ] || 999;

          vb =
            priorityOrder[
            String(vb)
            ] || 999;
        }

        if (
          sortField === "status" ||
          sortField === "fullName"
        ) {
          va = String(
            va || ""
          ).toLowerCase();

          vb = String(
            vb || ""
          ).toLowerCase();
        }

        if (va < vb) {
          return sortDir === "asc"
            ? -1
            : 1;
        }

        if (va > vb) {
          return sortDir === "asc"
            ? 1
            : -1;
        }

        return 0;
      });
    }

    setFilteredLeads(leads);

    setCurrentPage(1);
  }, [
    allLeads,
    searchText,
    statusFilter,
    priorityFilter,
    sourceFilter,
    courseFilter,
    sortField,
    sortDir,
  ]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredLeads.length /
      PAGE_SIZE
    )
  );

  const startIndex =
    (currentPage - 1) *
    PAGE_SIZE;

  const paginatedLeads =
    filteredLeads.slice(
      startIndex,
      startIndex + PAGE_SIZE
    );

  // ============================================================
  // SORT
  // ============================================================

  const handleSort = (
    field: string
  ) => {
    if (sortField === field) {
      setSortDir(
        sortDir === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setCourseFilter("");
    setSortField("");
    setSortDir("asc");
  };

  // ============================================================
  // VIEW LEAD
  // ============================================================

  const viewLead = (
    id: number
  ) => {
    // ----------------------------------------------------------
    // IMPORTANT:
    // For agents, move the viewed lead to the end
    // of the queue before opening the detail page.
    // ----------------------------------------------------------

    rotateLeadToEnd(id);

    router.push(
      `/lead-details?id=${id}`
    );
  };

  // ============================================================
  // EDIT LEAD
  // ============================================================

  const editLead = (
    id: number
  ) => {
    router.push(
      `/lead-edit?id=${id}`
    );
  };

  // ============================================================
  // ASSIGN LEAD
  // ============================================================

  const assignLead = (
    id: number
  ) => {
    router.push(
      `/lead-assignments?leadId=${id}`
    );
  };

  // ============================================================
  // DELETE LEAD
  // ============================================================

  const deleteLead = async (
    id: number
  ) => {
    if (
      !confirm(
        "Are you sure you want to delete this lead?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/leads/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to delete lead."
        );
      }

      setMessage(
        "Lead deleted successfully."
      );

      await loadLeads();
    } catch (error) {
      console.error(
        "Error deleting lead:",
        error
      );

      setMessage(
        "Unable to delete lead."
      );
    }
  };

  // ============================================================


  // EXCEL FILE CHANGE
  // ============================================================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0] ||
      null;

    setExcelFile(file);
    setPreviewOpen(false);
    setExcelRows([]);
    setExcelHeaders([]);
    setImportMessage("");
  };

  // ============================================================
  // PREVIEW EXCEL
  // ============================================================

  const previewExcelFile =
    async () => {
      if (!excelFile) {
        setImportMessage(
          "Please select a file."
        );
        return;
      }

      const win =
        typeof window !==
          "undefined"
          ? (window as unknown as Record<
            string,
            unknown
          >)
          : null;

      if (!win || !win.XLSX) {
        setImportMessage(
          "XLSX library not loaded yet. Please wait."
        );
        return;
      }

      const XLSX = win.XLSX as {
        read: (
          data: ArrayBuffer,
          opts: {
            type: string;
          }
        ) => {
          SheetNames: string[];
          Sheets: Record<
            string,
            unknown
          >;
        };

        utils: {
          sheet_to_json: (
            sheet: unknown,
            opts: {
              header: number;
              defval: string;
            }
          ) => unknown[][];
        };
      };

      const reader =
        new FileReader();

      reader.onload = (ev) => {
        const data =
          ev.target
            ?.result as ArrayBuffer;

        const workbook =
          XLSX.read(data, {
            type: "array",
          });

        const sheetName =
          workbook
            .SheetNames[0];

        const sheet =
          workbook.Sheets[
          sheetName
          ];

        const rows: unknown[][] =
          XLSX.utils.sheet_to_json(
            sheet,
            {
              header: 1,
              defval: "",
            }
          );

        if (rows.length < 2) {
          setImportMessage(
            "File has no data."
          );
          return;
        }

        const headers =
          (
            rows[0] as string[]
          ).map(String);

        const dataRows =
          rows
            .slice(1)
            .map((row) => {
              const obj: Record<
                string,
                unknown
              > = {};

              headers.forEach(
                (h, i) => {
                  obj[h] =
                    (
                      row as unknown[]
                    )[i];
                }
              );

              return obj;
            });

        setExcelHeaders(
          headers
        );

        setExcelRows(
          dataRows
        );

        setPreviewOpen(
          true
        );
      };

      reader.readAsArrayBuffer(
        excelFile
      );
    };

  // ============================================================
  // IMPORT EXCEL LEADS
  // ============================================================

  const importExcelLeads =
    async () => {
      if (!excelRows.length) {
        setImportMessage(
          "No data to import."
        );
        return;
      }

      setImportMessage(
        "Importing..."
      );

      let success = 0;
      let failed = 0;

      for (const row of excelRows) {
        try {
          const leadData = {
            fullName:
              row["Name"] ||
              row["Full Name"] ||
              row["fullName"] ||
              "",

            email:
              row["Email"] ||
              row["email"] ||
              "",

            phone: String(
              row["Phone"] ||
              row["phone"] ||
              row["Mobile"] ||
              ""
            ),

            courseInterested:
              String(
                row["Course"] ||
                row[
                "courseInterested"
                ] ||
                row[
                "Course Interested"
                ] ||
                ""
              ),

            leadSource:
              String(
                row["Source"] ||
                row[
                "leadSource"
                ] ||
                row[
                "Lead Source"
                ] ||
                ""
              ),

            status:
              String(
                row["Status"] ||
                row["status"] ||
                "NEW"
              ),

            priority:
              String(
                row["Priority"] ||
                row["priority"] ||
                "MEDIUM"
              ),

            city:
              String(
                row["City"] ||
                row["city"] ||
                ""
              ),
          };

          const res =
            await fetch(
              `${API_BASE_URL}/api/leads`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    "Bearer " +
                    token,
                },

                body: JSON.stringify(
                  leadData
                ),
              }
            );

          if (res.ok) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(
            "Error importing lead:",
            error
          );

          failed++;
        }
      }

      setImportMessage(
        `Import complete: ${success} success, ${failed} failed.`
      );

      await loadLeads();
    };

  // ============================================================
  // LEAD 360 EXCEL EXPORT
  // ============================================================

  const exportLead360Excel = async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const XLSX = (window as any).XLSX;

      if (!XLSX) {
        setMessage(
          "Excel library is still loading. Please wait a moment and try again."
        );
        return;
      }

      setMessage(
        "Preparing Lead 360 Excel export..."
      );

      const [
        assignmentsRes,
        callLogsRes,
        followUpsRes,
        notesRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/lead-assignments`, {
          headers: {
            Authorization: "Bearer " + token,
          },
        }),

        fetch(`${API_BASE_URL}/api/call-logs`, {
          headers: {
            Authorization: "Bearer " + token,
          },
        }),

        fetch(`${API_BASE_URL}/api/follow-ups`, {
          headers: {
            Authorization: "Bearer " + token,
          },
        }),

        fetch(`${API_BASE_URL}/api/notes`, {
          headers: {
            Authorization: "Bearer " + token,
          },
        }),
      ]);

      if (
        !assignmentsRes.ok ||
        !callLogsRes.ok ||
        !followUpsRes.ok ||
        !notesRes.ok
      ) {
        throw new Error(
          "Unable to load all CRM records for Excel export."
        );
      }

      const assignments =
        await assignmentsRes.json();

      const callLogs =
        await callLogsRes.json();

      const followUps =
        await followUpsRes.json();

      const notes =
        await notesRes.json();

      // --------------------------------------------------------
      // ONLY EXPORT RELATED RECORDS FOR ACCESSIBLE LEADS
      // --------------------------------------------------------

      const leadIds = new Set(
        allLeads.map(
          (lead) => lead.id
        )
      );

      const filterByLead = (
        rows: unknown
      ): unknown[] => {
        if (!Array.isArray(rows)) {
          return [];
        }

        return rows.filter(
          (row) => {
            if (
              !row ||
              typeof row !==
              "object"
            ) {
              return false;
            }

            const item =
              row as Record<
                string,
                unknown
              >;

            const leadId =
              Number(
                item.leadId
              );

            return (
              Number.isFinite(
                leadId
              ) &&
              leadIds.has(
                leadId
              )
            );
          }
        );
      };

      // --------------------------------------------------------
      // CONVERT OBJECTS TO EXCEL-SAFE ROWS
      // --------------------------------------------------------

      const normalizeRows = (
        rows: unknown[]
      ): Record<
        string,
        unknown
      >[] => {
        return rows.map(
          (row) => {
            if (
              !row ||
              typeof row !==
              "object"
            ) {
              return {
                Value: String(
                  row ?? ""
                ),
              };
            }

            const output:
              Record<
                string,
                unknown
              > = {};

            Object.entries(
              row as Record<
                string,
                unknown
              >
            ).forEach(
              ([key, value]) => {
                if (
                  value !== null &&
                  typeof value ===
                  "object"
                ) {
                  output[key] =
                    JSON.stringify(
                      value
                    );
                } else {
                  output[key] =
                    value;
                }
              }
            );

            return output;
          }
        );
      };

      // --------------------------------------------------------
      // CREATE WORKBOOK
      // --------------------------------------------------------

      const workbook =
        XLSX.utils.book_new();

      const leadsSheet =
        XLSX.utils.json_to_sheet(
          normalizeRows(
            allLeads
          )
        );

      const assignmentsSheet =
        XLSX.utils.json_to_sheet(
          normalizeRows(
            filterByLead(
              assignments
            )
          )
        );

      const callLogsSheet =
        XLSX.utils.json_to_sheet(
          normalizeRows(
            filterByLead(
              callLogs
            )
          )
        );

      const followUpsSheet =
        XLSX.utils.json_to_sheet(
          normalizeRows(
            filterByLead(
              followUps
            )
          )
        );

      const notesSheet =
        XLSX.utils.json_to_sheet(
          normalizeRows(
            filterByLead(
              notes
            )
          )
        );

      // --------------------------------------------------------
      // ADD SHEETS
      // --------------------------------------------------------

      XLSX.utils.book_append_sheet(
        workbook,
        leadsSheet,
        "Leads"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        assignmentsSheet,
        "Assignments"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        callLogsSheet,
        "Call Logs"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        followUpsSheet,
        "Follow-ups"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        notesSheet,
        "Notes"
      );

      // --------------------------------------------------------
      // DOWNLOAD
      // IMPORTANT:
      // writeFile is directly under XLSX,
      // NOT under XLSX.utils
      // --------------------------------------------------------

      const today =
        new Date()
          .toISOString()
          .split("T")[0];

      XLSX.writeFile(
        workbook,
        `DERIVION_Lead_360_${today}.xlsx`
      );

      setMessage(
        "Lead 360 Excel exported successfully."
      );
    } catch (error) {
      console.error(
        "Lead 360 export error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to export Lead 360 Excel."
      );
    }
  };

  // ============================================================
  // STYLES
  // ============================================================

  const inputCls =
    "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";

  const thCls =
    "px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap";

  const tdCls =
    "px-3 py-3 text-sm text-gray-700 border-t border-gray-100";

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* ======================================================
          XLSX LIBRARY
          ====================================================== */}

      <Script
        src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"
      />

      <DashboardLayout
        activeMenu="leads"
      >

        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="flex items-center justify-between mb-6">

          <h2 className="text-2xl font-bold text-gray-800">
            Leads
          </h2>

          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/add-lead"
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
            >
              + Add Lead
            </button>

            <button
              type="button"
              onClick={() =>
                setExcelOpen(
                  !excelOpen
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
            >
              📊 Import Excel
            </button>

            <button
              type="button"
              onClick={exportLead360Excel}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-sm"
            >
              📥 Export Excel
            </button>

          </div>

        </div>

        {/* ====================================================
            EXCEL IMPORT
            ==================================================== */}

        {excelOpen && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">

            <div className="flex justify-between items-start mb-4">

              <div>

                <h3 className="text-base font-bold text-gray-800">
                  Import Leads from Excel
                </h3>

                <p className="text-sm text-gray-500 mt-0.5">
                  Upload an Excel file to import multiple leads into the CRM.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setExcelOpen(
                    false
                  )
                }
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
              >
                ✕
              </button>

            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 mb-4">

              <div className="text-4xl mb-2">
                📊
              </div>

              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Select Excel File
              </h4>

              <p className="text-xs text-gray-400 mb-3">
                Supported format: .xlsx
              </p>

              <input
                type="file"
                accept=".xlsx"
                ref={fileInputRef}
                onChange={
                  handleFileChange
                }
                className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 cursor-pointer"
              />

              {excelFile && (
                <div className="mt-2 text-xs text-gray-500 font-medium">
                  {excelFile.name}
                </div>
              )}

            </div>

            <div className="flex gap-3">

              <button
                type="button"
                onClick={
                  previewExcelFile
                }
                disabled={
                  !excelFile
                }
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Preview Excel
              </button>

              <button
                type="button"
                onClick={() =>
                  setExcelOpen(
                    false
                  )
                }
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>

            </div>

            {previewOpen && (
              <div className="mt-4">

                <h4 className="text-sm font-bold text-gray-800 mb-1">
                  Excel Preview
                </h4>

                <p className="text-xs text-gray-500 mb-3">
                  {excelRows.length} rows found.
                  Review before importing.
                </p>

                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-3">

                  <table className="w-full border-collapse text-sm">

                    <thead>

                      <tr>

                        {excelHeaders.map(
                          (header) => (
                            <th
                              key={
                                header
                              }
                              className={
                                thCls
                              }
                            >
                              {header}
                            </th>
                          )
                        )}

                      </tr>

                    </thead>

                    <tbody>

                      {excelRows
                        .slice(
                          0,
                          10
                        )
                        .map(
                          (
                            row,
                            index
                          ) => (

                            <tr
                              key={
                                index
                              }
                              className="hover:bg-gray-50"
                            >

                              {excelHeaders.map(
                                (
                                  header
                                ) => (

                                  <td
                                    key={
                                      header
                                    }
                                    className={
                                      tdCls
                                    }
                                  >
                                    {String(
                                      row[
                                      header
                                      ] ??
                                      ""
                                    )}
                                  </td>

                                )
                              )}

                            </tr>

                          )
                        )}

                    </tbody>

                  </table>


                </div>

                {importMessage && (
                  <div className="text-sm font-medium text-blue-700 bg-blue-50 px-4 py-2.5 rounded-lg mb-3">
                    {
                      importMessage
                    }
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    importExcelLeads
                  }
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  Import Leads
                </button>

              </div>
            )}

          </div>
        )}

        {/* ====================================================
            FILTERS
            ==================================================== */}

        <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">

          <input
            type="text"
            placeholder="Search leads..."
            value={searchText}
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
            className={`${inputCls} flex-1 min-w-[180px]`}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className={inputCls}
          >
            <option value="">
              All Status
            </option>

            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value
              )
            }
            className={inputCls}
          >
            <option value="">
              All Priority
            </option>

            {PRIORITY_OPTIONS.map(
              (priority) => (
                <option
                  key={priority}
                  value={priority}
                >
                  {priority}
                </option>
              )
            )}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(
                e.target.value
              )
            }
            className={inputCls}
          >
            <option value="">
              All Sources
            </option>

            {SOURCE_OPTIONS.map(
              (source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
                </option>
              )
            )}
          </select>

          <select
            value={courseFilter}
            onChange={(e) =>
              setCourseFilter(
                e.target.value
              )
            }
            className={inputCls}
          >
            <option value="">
              All Courses
            </option>

            {courseOptions.map(
              (course) => (
                <option
                  key={course}
                  value={course}
                >
                  {course}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={loadLeads}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Clear
          </button>

        </div>

        {/* ====================================================
            MESSAGE
            ==================================================== */}

        {message && (
          <p className="text-green-600 font-medium text-sm mb-4">
            {message}
          </p>
        )}

        {/* ====================================================
            AGENT QUEUE INFORMATION
            ==================================================== */}

        {isAgent() && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <strong>Agent Queue:</strong>{" "}
            When you open a lead, that lead moves to the end of
            the queue and the next lead comes forward.
          </div>
        )}

        {/* ====================================================
            LEADS TABLE
            ==================================================== */}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead>

                <tr>

                  <th className={thCls}>
                    S.No.
                  </th>

                  <th
                    className={`${thCls} cursor-pointer hover:bg-gray-100`}
                    onClick={() =>
                      handleSort(
                        "id"
                      )
                    }
                  >
                    Lead ID ↕
                  </th>

                  <th
                    className={`${thCls} cursor-pointer hover:bg-gray-100`}
                    onClick={() =>
                      handleSort(
                        "fullName"
                      )
                    }
                  >
                    Name ↕
                  </th>

                  <th className={thCls}>
                    Email
                  </th>

                  <th className={thCls}>
                    Phone
                  </th>

                  <th className={thCls}>
                    Course
                  </th>

                  <th className={thCls}>
                    Source
                  </th>

                  <th
                    className={`${thCls} cursor-pointer hover:bg-gray-100`}
                    onClick={() =>
                      handleSort(
                        "status"
                      )
                    }
                  >
                    Status ↕
                  </th>

                  <th
                    className={`${thCls} cursor-pointer hover:bg-gray-100`}
                    onClick={() =>
                      handleSort(
                        "priority"
                      )
                    }
                  >
                    Priority ↕
                  </th>

                  <th className={thCls}>
                    City
                  </th>

                  <th className={thCls}>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {paginatedLeads.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan={11}
                      className="text-center py-10 text-gray-400"
                    >

                      <div className="text-4xl mb-2">
                        🔍
                      </div>

                      <strong className="block text-gray-600">
                        No leads found
                      </strong>

                      <span className="text-sm">
                        Try changing your search or filters.
                      </span>

                    </td>

                  </tr>

                ) : (

                  paginatedLeads.map(
                    (
                      lead,
                      index
                    ) => (

                      <tr
                        key={
                          lead.id
                        }
                        className="hover:bg-gray-50 transition-colors"
                      >

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            startIndex +
                            index +
                            1
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.id
                          }
                        </td>

                        <td
                          className={`${tdCls} font-medium text-gray-800`}
                        >
                          {
                            lead.fullName ??
                            ""
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.email ??
                            ""
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.phone ??
                            ""
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.courseInterested ??
                            ""
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.leadSource ??
                            ""
                          }
                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >

                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold status-${(
                              lead.status ||
                              ""
                            )
                              .toLowerCase()
                              .replace(
                                /_/g,
                                "-"
                              )}`}
                          >
                            {
                              lead.status ||
                              ""
                            }
                          </span>

                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >

                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold priority-${(
                              lead.priority ||
                              ""
                            ).toLowerCase()}`}
                          >
                            {
                              lead.priority ||
                              ""
                            }
                          </span>

                        </td>

                        <td
                          className={
                            tdCls
                          }
                        >
                          {
                            lead.city ??
                            ""
                          }
                        </td>

                        <td
                          className={`${tdCls} whitespace-nowrap`}
                        >

                          {/* VIEW */}

                          <button
                            type="button"
                            title="View Lead"
                            onClick={() =>
                              viewLead(
                                lead.id
                              )
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-blue-100 text-base transition-colors mr-0.5"
                          >
                            👁
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            title="Edit Lead"
                            onClick={() =>
                              editLead(
                                lead.id
                              )
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-yellow-100 text-base transition-colors mr-0.5"
                          >
                            ✏️
                          </button>

                          {/* ASSIGN */}

                          <button
                            type="button"
                            title="Assign Lead"
                            onClick={() =>
                              assignLead(
                                lead.id
                              )
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-green-100 text-base transition-colors mr-0.5"
                          >
                            👤
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            title="Delete Lead"
                            onClick={() =>
                              deleteLead(
                                lead.id
                              )
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-red-100 text-base transition-colors"
                          >
                            🗑
                          </button>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ====================================================
            PAGINATION
            ==================================================== */}

        <div className="flex items-center justify-between mt-4 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">

          <div className="text-sm text-gray-500">

            Showing{" "}

            <span className="font-semibold text-gray-700">
              {
                filteredLeads.length ===
                  0
                  ? 0
                  : startIndex +
                  1
              }
            </span>

            {" - "}

            <span className="font-semibold text-gray-700">
              {Math.min(
                startIndex +
                PAGE_SIZE,
                filteredLeads.length
              )}
            </span>

            {" of "}

            <span className="font-semibold text-gray-700">
              {
                filteredLeads.length
              }
            </span>

            {" "}leads

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={
                currentPage <= 1
              }
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.max(
                      1,
                      p - 1
                    )
                )
              }
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="text-sm font-medium text-gray-600 px-2">
              Page{" "}
              {
                currentPage
              }{" "}
              of{" "}
              {
                totalPages
              }
            </span>

            <button
              type="button"
              disabled={
                currentPage >=
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.min(
                      totalPages,
                      p + 1
                    )
                )
              }
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