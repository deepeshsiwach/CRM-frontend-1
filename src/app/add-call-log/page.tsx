"use client";

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

function AddCallLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leadId, setLeadId] = useState(leadIdParam || "");
  const [leadDisplay, setLeadDisplay] = useState("Loading lead...");
  const [agentId, setAgentId] = useState("");
  const [agentDisplay, setAgentDisplay] = useState("");

  const [callStartTime, setCallStartTime] = useState("");
  const [callEndTime, setCallEndTime] = useState("");

  // Default value must exist in backend CallOutcome enum
  const [callOutcome, setCallOutcome] = useState("INTERESTED");

  const [remarks, setRemarks] = useState("");

  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  const token = getToken();

  // ========================================
  // INITIALIZE CURRENT DATE/TIME
  // ========================================

  useEffect(() => {
    const now = new Date();

    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setCallStartTime(localDateTime);
  }, []);

  // ========================================
  // LOAD LEAD DETAILS
  // ========================================

  const loadLeadDetails = useCallback(async () => {
    if (!leadId || !token) {
      setLeadDisplay("No Lead ID");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/leads/${leadId}`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed");
      }

      const lead: Lead = await res.json();

      setLeadDisplay(
        `${lead.fullName || lead.name || "Lead"} (ID: ${leadId})`
      );
    } catch {
      setLeadDisplay(`Lead (ID: ${leadId})`);
    }
  }, [leadId, token]);

  // ========================================
  // LOAD CURRENT AGENT DETAILS
  // ========================================

  const loadAgentDetails = useCallback(async () => {
    const currentUserId = getUserId();

    if (!currentUserId || !token) {
      setAgentDisplay("No Agent ID");
      return;
    }

    setAgentId(currentUserId);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users/${currentUserId}`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed");
      }

      const agent: User = await res.json();

      setAgentDisplay(
        `${agent.fullName || agent.name || "Agent"} (ID: ${currentUserId})`
      );
    } catch {
      setAgentDisplay(`Agent (ID: ${currentUserId})`);
    }
  }, [token]);

  // ========================================
  // CHECK LOGIN AND LOAD DATA
  // ========================================

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }

    loadLeadDetails();
    loadAgentDetails();
  }, [
    token,
    router,
    loadLeadDetails,
    loadAgentDetails,
  ]);

  // ========================================
  // GO BACK
  // ========================================

  const goBack = () => {
    if (leadIdParam) {
      router.push(`/lead-details?id=${leadIdParam}`);
    } else {
      router.push("/call-logs");
    }
  };

  // ========================================
  // SUBMIT CALL LOG
  // ========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      setMessage({
        text: "Lead ID is required.",
        isError: true,
      });
      return;
    }

    if (!agentId) {
      setMessage({
        text: "Agent ID is required.",
        isError: true,
      });
      return;
    }

    if (!callStartTime) {
      setMessage({
        text: "Call start time is required.",
        isError: true,
      });
      return;
    }

    // Only fields that are currently required by the form
    const payload = {
      leadId: Number(leadId),
      agentId: Number(agentId),
      callStartTime,
      callEndTime: callEndTime || null,
      callOutcome: callOutcome || null,
      remarks: remarks.trim(),
    };

    setSaving(true);

    setMessage({
      text: "Saving call log...",
      isError: false,
    });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/call-logs`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },

          body: JSON.stringify(payload),
        }
      );

      const responseText = await res.text();

      if (!res.ok) {
        throw new Error(
          responseText || "Failed to create call log"
        );
      }

      setMessage({
        text: "Call log saved successfully.",
        isError: false,
      });

      setTimeout(() => {
        goBack();
      }, 800);

    } catch (err: unknown) {

      const msg =
        err instanceof Error
          ? err.message
          : "Unable to connect to CRM server.";

      setMessage({
        text: msg,
        isError: true,
      });

    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      activeMenu="call-logs"
      title="Add Call Log"
    >

      <div className="space-y-6 max-w-4xl">

        {/* ========================================
            PAGE HEADER
            ======================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Add New Call Log
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Record call outcome and lead conversation details.
            </p>

          </div>

          <button
            type="button"
            onClick={goBack}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>

        </div>


        {/* ========================================
            FORM CARD
            ======================================== */}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

          <form
            id="callLogForm"
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">


              {/* ========================================
                  LEAD
                  ======================================== */}

              <div>

                <label
                  htmlFor="leadDisplay"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
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
                    onChange={(e) =>
                      setLeadId(e.target.value)
                    }
                    className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

              </div>


              {/* ========================================
                  AGENT
                  ======================================== */}

              <div>

                <label
                  htmlFor="agentDisplay"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Agent
                </label>

                <input
                  type="text"
                  id="agentDisplay"
                  disabled
                  value={agentDisplay}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                />

              </div>


              {/* ========================================
                  CALL START TIME
                  ======================================== */}

              <div>

                <label
                  htmlFor="callStartTime"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Call Start Time *
                </label>

                <input
                  type="datetime-local"
                  id="callStartTime"
                  required
                  value={callStartTime}
                  onChange={(e) =>
                    setCallStartTime(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              {/* ========================================
                  CALL END TIME
                  ======================================== */}

              <div>

                <label
                  htmlFor="callEndTime"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Call End Time
                </label>

                <input
                  type="datetime-local"
                  id="callEndTime"
                  value={callEndTime}
                  onChange={(e) =>
                    setCallEndTime(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              {/* ========================================
                  CALL OUTCOME
                  ======================================== */}

              <div>

                <label
                  htmlFor="callOutcome"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Call Outcome
                </label>

                <select
                  id="callOutcome"
                  value={callOutcome}
                  onChange={(e) =>
                    setCallOutcome(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >

                  <option value="INTERESTED">
                    INTERESTED
                  </option>

                  <option value="NOT_INTERESTED">
                    NOT_INTERESTED
                  </option>

                  <option value="CALL_BACK">
                    CALL_BACK
                  </option>

                  <option value="FOLLOW_UP">
                    FOLLOW_UP
                  </option>

                  <option value="COUNSELLING">
                    COUNSELLING
                  </option>

                  <option value="ENROLLED">
                    ENROLLED
                  </option>

                  <option value="WRONG_NUMBER">
                    WRONG_NUMBER
                  </option>

                  <option value="NO_RESPONSE">
                    NO_RESPONSE
                  </option>

                </select>

              </div>

            </div>


            {/* ========================================
                REMARKS
                ======================================== */}

            <div>

              <label
                htmlFor="remarks"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Remarks
              </label>

              <textarea
                id="remarks"
                rows={3}
                value={remarks}
                onChange={(e) =>
                  setRemarks(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>


            {/* ========================================
                ACTIONS
                ======================================== */}

            <div className="flex flex-wrap items-center gap-3 pt-3">

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {saving
                  ? "Saving..."
                  : "Save Call Log"}
              </button>


              <button
                type="button"
                onClick={goBack}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                Cancel
              </button>


              {message && (
                <span
                  id="message"
                  className={`text-xs font-semibold ${message.isError
                    ? "text-red-600"
                    : "text-green-600"
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


export default function AddCallLogPage() {

  return (

    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-400">
          Loading...
        </div>
      }
    >

      <AddCallLogContent />

    </Suspense>

  );
}