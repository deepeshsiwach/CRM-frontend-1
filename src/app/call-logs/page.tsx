"use client";

// ============================================================
// DERIVION CRM - CALL LOGS PAGE
// Ported from call-logs.html + call-logs.js
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface CallLog {
  id: number;
  leadId: number;
  agentId: number;
  callStartTime?: string;
  callEndTime?: string;
  durationSeconds?: number;
  callStatus?: string;
  callOutcome?: string;
  remarks?: string;
  [key: string]: unknown;
}

interface Lead {
  id: number;
  name?: string;
  fullName?: string;
}

interface User {
  id: number;
  name?: string;
  fullName?: string;
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

export default function CallLogsPage() {
  const router = useRouter();

  const [allCallLogs, setAllCallLogs] = useState<CallLog[]>([]);
  const [filteredCallLogs, setFilteredCallLogs] = useState<CallLog[]>([]);

  const [leadNameMap, setLeadNameMap] = useState<
    Record<number, string>
  >({});

  const [userNameMap, setUserNameMap] = useState<
    Record<number, string>
  >({});

  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  const token = getToken();

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
      const [
        callLogsRes,
        leadsRes,
        usersRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/call-logs`, {
          headers,
        }),

        fetch(`${API_BASE_URL}/api/leads`, {
          headers,
        }),

        fetch(`${API_BASE_URL}/api/users`, {
          headers,
        }),
      ]);

      if (!callLogsRes.ok) {
        throw new Error("Failed to load call logs");
      }

      const callLogs: CallLog[] =
        await callLogsRes.json();

      setAllCallLogs(callLogs);
      setFilteredCallLogs(callLogs);

      // ========================================================
      // LEAD NAME MAP
      // ========================================================

      if (leadsRes.ok) {
        const leads: Lead[] =
          await leadsRes.json();

        const lMap: Record<number, string> = {};

        leads.forEach((l) => {
          lMap[l.id] =
            l.name ||
            l.fullName ||
            "Unknown Lead";
        });

        setLeadNameMap(lMap);
      }

      // ========================================================
      // USER / AGENT NAME MAP
      // ========================================================

      if (usersRes.ok) {
        const users: User[] =
          await usersRes.json();

        const uMap: Record<number, string> = {};

        users.forEach((u) => {
          uMap[u.id] =
            u.fullName ||
            u.name ||
            "Unknown User";
        });

        setUserNameMap(uMap);
      }

    } catch (err) {
      console.error(err);
      setMessage("Unable to load call logs.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // SEARCH FILTER
  // ============================================================

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredCallLogs(allCallLogs);
      return;
    }

    const s = searchText
      .toLowerCase()
      .trim();

    const filtered = allCallLogs.filter(
      (log) => {
        const leadName = (
          leadNameMap[log.leadId] || ""
        ).toLowerCase();

        const agentName = (
          userNameMap[log.agentId] || ""
        ).toLowerCase();

        return (
          String(log.id)
            .toLowerCase()
            .includes(s) ||

          String(log.leadId)
            .toLowerCase()
            .includes(s) ||

          String(log.agentId)
            .toLowerCase()
            .includes(s) ||

          leadName.includes(s) ||

          agentName.includes(s) ||

          (log.callStartTime || "")
            .toLowerCase()
            .includes(s) ||

          (log.callEndTime || "")
            .toLowerCase()
            .includes(s) ||

          String(log.durationSeconds || "")
            .toLowerCase()
            .includes(s) ||

          (log.callStatus || "")
            .toLowerCase()
            .includes(s) ||

          (log.callOutcome || "")
            .toLowerCase()
            .includes(s) ||

          (log.remarks || "")
            .toLowerCase()
            .includes(s)
        );
      }
    );

    setFilteredCallLogs(filtered);

  }, [
    searchText,
    allCallLogs,
    leadNameMap,
    userNameMap,
  ]);

  // ============================================================
  // EXPORT CALL LOGS TO EXCEL
  // ============================================================

  const handleExportExcel = () => {

    if (!xlsxLoaded) {
      alert(
        "Excel export is still loading. Please try again in a moment."
      );
      return;
    }

    if (allCallLogs.length === 0) {
      alert("There are no call logs to export.");
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
    // EXPORT ALL CALL LOGS
    // ==========================================================

    const exportRows: Record<string, unknown>[] =
      allCallLogs.map((log) => {

        const row: Record<string, unknown> = {};

        // ------------------------------------------------------
        // EXPORT EVERY FIELD RETURNED BY BACKEND
        // ------------------------------------------------------

        Object.entries(log).forEach(
          ([key, value]) => {

            if (
              value !== null &&
              typeof value === "object"
            ) {
              row[key] =
                JSON.stringify(value);
            } else {
              row[key] =
                value ?? "";
            }

          }
        );

        // ------------------------------------------------------
        // ADD READABLE LEAD NAME
        // ------------------------------------------------------

        row["Lead Name"] =
          leadNameMap[log.leadId] ||
          "Unknown Lead";

        // ------------------------------------------------------
        // ADD READABLE AGENT NAME
        // ------------------------------------------------------

        row["Agent Name"] =
          userNameMap[log.agentId] ||
          "Unknown User";

        return row;
      });

    // ==========================================================
    // CREATE WORKSHEET
    // ==========================================================

    const worksheet =
      win.XLSX.utils.json_to_sheet(
        exportRows
      );

    // ==========================================================
    // CREATE WORKBOOK
    // ==========================================================

    const workbook =
      win.XLSX.utils.book_new();

    // ==========================================================
    // ADD SHEET
    // ==========================================================

    win.XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Call Logs"
    );

    // ==========================================================
    // FILE NAME
    // ==========================================================

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const fileName =
      `DERIVION_Call_Logs_${today}.xlsx`;

    // ==========================================================
    // DOWNLOAD EXCEL
    // ==========================================================

    win.XLSX.writeFile(
      workbook,
      fileName
    );
  };

  // ============================================================
  // TABLE STYLES
  // ============================================================

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
        src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"
        onLoad={() =>
          setXlsxLoaded(true)
        }
      />

      <DashboardLayout
        activeMenu="call-logs"
        title="Call Logs"
      >

        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">

          {/* SEARCH */}

          <input
            type="text"
            id="searchCallLog"
            placeholder="Search call logs..."
            value={searchText}
            onChange={(e) =>
              setSearchText(e.target.value)
            }
            className="max-w-xs w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />

          {/* ACTION BUTTONS */}

          <div className="flex flex-wrap gap-2">

            {/* ADD CALL LOG */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/add-call-log"
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Add Call Log
            </button>

            {/* REFRESH */}

            <button
              type="button"
              id="refreshCallLogs"
              onClick={loadData}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>

            {/* EXPORT */}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={
                !xlsxLoaded ||
                loading
              }
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              📊 Export Excel
            </button>

          </div>
        </div>

        {/* ====================================================
            MESSAGE
            ==================================================== */}

        {message && (
          <p
            id="callLogMessage"
            className="text-red-500 text-sm font-medium mb-3"
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
                    Call ID
                  </th>

                  <th className={thCls}>
                    Lead
                  </th>

                  <th className={thCls}>
                    Agent
                  </th>

                  <th className={thCls}>
                    Start Time
                  </th>

                  <th className={thCls}>
                    End Time
                  </th>

                  <th className={thCls}>
                    Duration (s)
                  </th>

                  <th className={thCls}>
                    Status
                  </th>

                  <th className={thCls}>
                    Outcome
                  </th>

                  <th className={thCls}>
                    Remarks
                  </th>

                  <th className={thCls}>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody id="callLogsTableBody">

                {/* LOADING */}

                {loading ? (

                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Loading call logs...
                    </td>
                  </tr>

                ) : filteredCallLogs.length === 0 ? (

                  /* EMPTY */

                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      No call logs found.
                    </td>
                  </tr>

                ) : (

                  /* DATA */

                  filteredCallLogs.map(
                    (log) => (

                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 transition-colors"
                      >

                        {/* CALL ID */}

                        <td className={tdCls}>
                          {log.id}
                        </td>

                        {/* LEAD */}

                        <td className={tdCls}>

                          <span className="font-semibold text-gray-800">
                            {
                              leadNameMap[
                              log.leadId
                              ] ||
                              "Unknown Lead"
                            }
                          </span>

                          <br />

                          <span className="text-xs text-gray-400">
                            ID: {log.leadId}
                          </span>

                        </td>

                        {/* AGENT */}

                        <td className={tdCls}>

                          <span className="font-semibold text-gray-800">
                            {
                              userNameMap[
                              log.agentId
                              ] ||
                              "Unknown User"
                            }
                          </span>

                          <br />

                          <span className="text-xs text-gray-400">
                            ID: {log.agentId}
                          </span>

                        </td>

                        {/* START */}

                        <td
                          className={`${tdCls} text-xs`}
                        >
                          {log.callStartTime ||
                            "-"}
                        </td>

                        {/* END */}

                        <td
                          className={`${tdCls} text-xs`}
                        >
                          {log.callEndTime ||
                            "-"}
                        </td>

                        {/* DURATION */}

                        <td className={tdCls}>
                          {log.durationSeconds ??
                            "-"}
                        </td>

                        {/* STATUS */}

                        <td className={tdCls}>

                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            {log.callStatus ||
                              "-"}
                          </span>

                        </td>

                        {/* OUTCOME */}

                        <td className={tdCls}>
                          {log.callOutcome ||
                            "-"}
                        </td>

                        {/* REMARKS */}

                        <td
                          className={`${tdCls} max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap`}
                        >
                          {log.remarks ||
                            "-"}
                        </td>

                        {/* ACTION */}

                        <td className={tdCls}>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/call-log-details?id=${log.id}`
                              )
                            }
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                          >
                            View
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

      </DashboardLayout>
    </>
  );
}