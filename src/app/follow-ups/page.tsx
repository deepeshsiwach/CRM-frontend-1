"use client";

// ============================================================
// DERIVION CRM - FOLLOW-UPS PAGE
// Ported from follow-ups.html + follow-ups.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface FollowUp {
  id: number;
  leadId: number;
  agentId: number;
  followUpDate?: string;
  purpose?: string;
  status?: string;
  remarks?: string;
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

interface XLSXLibrary {
  utils: {
    json_to_sheet: (data: Record<string, unknown>[]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (
      workbook: unknown,
      worksheet: unknown,
      sheetName: string
    ) => void;
  };
  writeFile: (workbook: unknown, filename: string) => void;
}

export default function FollowUpsPage() {
  const router = useRouter();


  const [selectedStatus, setSelectedStatus] = useState("");

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setSelectedStatus(
    (params.get("status") || "").toUpperCase()
  );
}, []);

const [selectedView, setSelectedView] = useState("");

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setSelectedView(
    (params.get("view") || "").toLowerCase()
  );
}, []);

  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [filteredFollowUps, setFilteredFollowUps] = useState<FollowUp[]>([]);

  const [leadNameMap, setLeadNameMap] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});

  const [searchText, setSearchText] = useState("");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [statusTab, setStatusTab] = useState("ALL");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  const token = getToken();

  // ============================================================
  // DUE CATEGORY
  // ============================================================

  const getDueCategory = (fu: FollowUp): string => {
    if (fu.status !== "PENDING" || !fu.followUpDate) return "OTHER";

    const fuDate = fu.followUpDate.split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    if (fuDate < today) return "OVERDUE";
    if (fuDate === today) return "TODAY";
    if (fuDate > today) return "UPCOMING";

    return "OTHER";
  };

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = useCallback(async () => {
    if (!token) {
      router.replace("/");
      return;
    }

    const headers = {
      Authorization: "Bearer " + token,
    };

    try {
      const [fuRes, leadsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/follow-ups`, { headers }),
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/users`, { headers }),
      ]);

      if (!fuRes.ok) {
        throw new Error("Failed to load follow-ups.");
      }

      const followUps: FollowUp[] = await fuRes.json();

      setAllFollowUps(followUps);
      setFilteredFollowUps(followUps);

      // ========================================================
      // LEAD NAME MAP
      // ========================================================

      if (leadsRes.ok) {
        const leads: Lead[] = await leadsRes.json();

        const lMap: Record<string, string> = {};

        leads.forEach((l) => {
          lMap[String(l.id)] =
            l.fullName ||
            l.name ||
            "Unknown Lead";
        });

        setLeadNameMap(lMap);
      }

      // ========================================================
      // USER / AGENT NAME MAP
      // ========================================================

      if (usersRes.ok) {
        const users: User[] = await usersRes.json();

        const uMap: Record<string, string> = {};

        users.forEach((u) => {
          uMap[String(u.id)] =
            u.fullName ||
            u.name ||
            u.username ||
            "Unknown Agent";
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

  // ============================================================
  // APPLY FILTERS
  // ============================================================

  useEffect(() => {
    let result = [...allFollowUps];

    // FILTER TODAY'S FOLLOW-UPS
if (selectedView === "today") {
  const now = new Date();

  const todayDate =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  result = result.filter(
    (fu) =>
      fu.followUpDate?.split("T")[0] === todayDate
  );
}
    
    // FILTER BY DASHBOARD STATUS
if (selectedStatus) {
  result = result.filter(
    (fu) =>
      String(fu.status || "").toUpperCase() === selectedStatus
  );
}


    if (dueFilter !== "ALL") {
      result = result.filter(
        (fu) => getDueCategory(fu) === dueFilter
      );
    }

    if (agentFilter !== "ALL") {
      result = result.filter((fu) => String(fu.agentId) === agentFilter);
    }

    if (statusTab !== "ALL") {
      result = result.filter((fu) => {
        if (statusTab === "OVERDUE") return getDueCategory(fu) === "OVERDUE";
        return String(fu.status || "").toUpperCase() === statusTab;
      });
    }

    if (searchText.trim()) {
      const s = searchText.toLowerCase().trim();

      result = result.filter((fu) => {
        const leadName = (
          leadNameMap[String(fu.leadId)] || ""
        ).toLowerCase();

        const agentName = (
          userNameMap[String(fu.agentId)] || ""
        ).toLowerCase();

        return (
          String(fu.id ?? "")
            .toLowerCase()
            .includes(s) ||

          String(fu.leadId ?? "")
            .toLowerCase()
            .includes(s) ||

          String(fu.agentId ?? "")
            .toLowerCase()
            .includes(s) ||

          leadName.includes(s) ||

          agentName.includes(s) ||

          String(fu.followUpDate ?? "")
            .toLowerCase()
            .includes(s) ||

          String(fu.status ?? "")
            .toLowerCase()
            .includes(s) ||

          String(fu.remarks ?? "")
            .toLowerCase()
            .includes(s)
        );
      });

      setMessage(
        result.length === 0
          ? "No matching follow-ups found."
          : `${result.length} follow-up(s) found.`
      );
    } else {
      setMessage("");
    }

    setFilteredFollowUps(result);
  }, [
    searchText,
    dueFilter,
    agentFilter,
    statusTab,
    allFollowUps,
    leadNameMap,
    userNameMap,
    selectedStatus,
    selectedView,
  ]);

  // ============================================================
  // EXPORT FOLLOW-UPS TO EXCEL
  // ============================================================

  const handleExportExcel = () => {
    if (!xlsxLoaded) {
      alert(
        "Excel export is still loading. Please try again in a moment."
      );
      return;
    }

    if (allFollowUps.length === 0) {
      alert("There are no follow-ups to export.");
      return;
    }

    const win = window as unknown as {
      XLSX?: XLSXLibrary;
    };

    if (!win.XLSX) {
      alert(
        "Excel library is not available. Please refresh the page."
      );
      return;
    }

    // ==========================================================
    // IMPORTANT:
    // Use allFollowUps instead of filteredFollowUps.
    // This exports ALL follow-ups loaded from the backend.
    // ==========================================================

    const exportRows: Record<string, unknown>[] =
      allFollowUps.map((fu) => {
        const row: Record<string, unknown> = {};

        // ------------------------------------------------------
        // Export EVERY field returned by backend
        // ------------------------------------------------------

        Object.entries(fu).forEach(([key, value]) => {
          if (
            value !== null &&
            typeof value === "object"
          ) {
            row[key] = JSON.stringify(value);
          } else {
            row[key] = value ?? "";
          }
        });

        // ------------------------------------------------------
        // Add readable Lead Name
        // ------------------------------------------------------

        row["Lead Name"] =
          leadNameMap[String(fu.leadId)] ||
          "Unknown Lead";

        // ------------------------------------------------------
        // Add readable Agent Name
        // ------------------------------------------------------

        row["Agent Name"] =
          userNameMap[String(fu.agentId)] ||
          "Unknown Agent";

        return row;
      });

    // ==========================================================
    // CREATE EXCEL SHEET
    // ==========================================================

    const worksheet =
      win.XLSX.utils.json_to_sheet(exportRows);

    const workbook =
      win.XLSX.utils.book_new();

    win.XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Follow-ups"
    );

    // ==========================================================
    // FILE NAME
    // ==========================================================

    const today =
      new Date().toISOString().split("T")[0];

    const fileName =
      `DERIVION_Followups_${today}.xlsx`;

    // ==========================================================
    // DOWNLOAD
    // ==========================================================

    win.XLSX.writeFile(
      workbook,
      fileName
    );
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Follow-up ID ${id}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/follow-ups/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to delete follow-up."
        );
      }

      loadData();
    } catch (err) {
      console.error(err);
      alert("Unable to delete follow-up.");
    }
  };

  // ============================================================
  // STATUS BADGE
  // ============================================================

  const statusBadge = (
    status: string | undefined
  ) => {
    if (status === "PENDING") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (status === "COMPLETED") {
      return "bg-green-100 text-green-800";
    }

    return "bg-gray-100 text-gray-700";
  };

  const totalCount = allFollowUps.length;
  const pendingCount = allFollowUps.filter(
    (fu) => String(fu.status || "").toUpperCase() === "PENDING"
  ).length;
  const overdueCount = allFollowUps.filter(
    (fu) => getDueCategory(fu) === "OVERDUE"
  ).length;
  const completedCount = allFollowUps.filter(
    (fu) => String(fu.status || "").toUpperCase() === "COMPLETED"
  ).length;
  const agentOptions = Array.from(
    new Set(allFollowUps.map((fu) => String(fu.agentId)))
  ).filter((id) => id !== "undefined" && id !== "null");

  // ============================================================
  // STYLES
  // ============================================================

  const inputCls =
    "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const thCls =
    "px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider";

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
        src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
        onLoad={() => setXlsxLoaded(true)}
      />

      <DashboardLayout
        activeMenu="follow-ups"
        title="Follow-ups"
      >
        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">

          <div className="flex flex-wrap gap-2 flex-1">

            {/* SEARCH */}

            <input
              type="text"
              id="searchFollowUp"
              placeholder="Search follow-ups..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
              className={`${inputCls} max-w-xs w-full`}
            />

            {/* DUE FILTER */}

            <select
              id="followUpDueFilter"
              value={dueFilter}
              onChange={(e) =>
                setDueFilter(e.target.value)
              }
              className={inputCls}
            >
              <option value="ALL">
                All Follow-ups
              </option>

              <option value="OVERDUE">
                Overdue
              </option>

              <option value="TODAY">
                Due Today
              </option>

              <option value="UPCOMING">
                Upcoming
              </option>
            </select>

            <select
              id="followUpAgentFilter"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className={inputCls}
              aria-label="Filter follow-ups by agent"
            >
              <option value="ALL">All Agents</option>
              {agentOptions.map((agentId) => (
                <option key={agentId} value={agentId}>
                  {userNameMap[agentId] || `Agent ${agentId}`}
                </option>
              ))}
            </select>

          </div>

          {/* ==================================================
              ACTION BUTTONS
              ================================================== */}

          <div className="flex flex-wrap gap-2">

            {/* ADD */}

            <button
              type="button"
              onClick={() =>
                router.push("/add-follow-up")
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Add Follow-up
            </button>

            {/* REFRESH */}

            <button
              type="button"
              onClick={loadData}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>

            {/* EXPORT */}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!xlsxLoaded || loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              📊 Export Excel
            </button>

          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total Follow-ups", value: totalCount, tab: "ALL", style: "border-gray-200" },
            { label: "Pending", value: pendingCount, tab: "PENDING", style: "border-amber-200" },
            { label: "Overdue", value: overdueCount, tab: "OVERDUE", style: "border-red-200" },
            { label: "Completed", value: completedCount, tab: "COMPLETED", style: "border-green-200" },
          ].map((card) => (
            <button
              key={card.tab}
              type="button"
              onClick={() => setStatusTab(card.tab)}
              className={`text-left bg-white rounded-xl border ${card.style} p-4 shadow-sm hover:shadow transition-shadow ${
                statusTab === card.tab ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{card.value}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "Overdue", value: "OVERDUE" },
            { label: "Completed", value: "COMPLETED" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                statusTab === tab.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ====================================================
            MESSAGE
            ==================================================== */}

        {message && (
          <p
            id="followUpMessage"
            className="text-blue-600 text-sm font-medium mb-3"
          >
            {message}
          </p>
        )}

        {/* ====================================================
            TABLE
            ==================================================== */}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead className="bg-gray-900">

                <tr>

                  <th className={thCls}>
                    ID
                  </th>

                  <th className={thCls}>
                    Lead
                  </th>

                  <th className={thCls}>
                    Agent
                  </th>

                  <th className={thCls}>
                    Date
                  </th>

                  <th className={thCls}>
                    Time
                  </th>

                  <th className={thCls}>
                    Status
                  </th>

                  <th className={thCls}>
                    Remarks
                  </th>

                  <th className={thCls}>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody id="followUpsTableBody">

                {/* LOADING */}

                {loading ? (

                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Loading follow-ups...
                    </td>
                  </tr>

                ) : filteredFollowUps.length === 0 ? (

                  /* EMPTY */

                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      No follow-ups found.
                    </td>
                  </tr>

                ) : (

                  /* DATA */

                  filteredFollowUps.map((fu) => {

                    const dateTime =
                      fu.followUpDate || "";

                    let fuDate = "";
                    let fuTime = "";

                    if (dateTime.includes("T")) {

                      const parts =
                        dateTime.split("T");

                      fuDate = parts[0];
                      fuTime = parts[1];

                    } else {

                      fuDate = dateTime;

                    }

                    return (

                      <tr
                        key={fu.id}
                        className="hover:bg-gray-50 transition-colors"
                      >

                        {/* ID */}

                        <td className={tdCls}>
                          {fu.id}
                        </td>

                        {/* LEAD */}

                        <td className={tdCls}>

                          <span className="font-semibold text-gray-800">
                            {
                              leadNameMap[
                              String(fu.leadId)
                              ] ||
                              "Unknown Lead"
                            }
                          </span>

                          <br />

                          <span className="text-xs text-gray-400">
                            ID: {fu.leadId}
                          </span>

                        </td>

                        {/* AGENT */}

                        <td className={tdCls}>

                          <span className="font-semibold text-gray-800">
                            {
                              userNameMap[
                              String(fu.agentId)
                              ] ||
                              "Unknown Agent"
                            }
                          </span>

                          <br />

                          <span className="text-xs text-gray-400">
                            ID: {fu.agentId}
                          </span>

                        </td>

                        {/* DATE */}

                        <td className={tdCls}>
                          {fuDate}
                        </td>

                        {/* TIME */}

                        <td className={tdCls}>
                          {fuTime}
                        </td>

                        {/* STATUS */}

                        <td className={tdCls}>

                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(
                              fu.status
                            )}`}
                          >
                            {fu.status}
                          </span>

                        </td>

                        {/* REMARKS */}

                        <td
                          className={`${tdCls} max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap`}
                        >
                          {fu.remarks || "-"}
                        </td>

                        {/* ACTION */}

                        <td
                          className={`${tdCls} whitespace-nowrap`}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/follow-up-details?id=${fu.id}`
                              )
                            }
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/edit-follow-up?id=${fu.id}`
                              )
                            }
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors mr-1"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(fu.id)
                            }
                            className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    );
                  })

                )}

              </tbody>

            </table>

          </div>

        </div>

      </DashboardLayout>
    </>
  );
}