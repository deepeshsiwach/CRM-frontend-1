"use client";



import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/DashboardLayout";

import { API_BASE_URL } from "@/lib/config";

import { getToken, getUserRole } from "@/lib/auth";



interface AttendanceRow {

    id: number;

    agentId: number;

    agentName: string;

    attendanceDate: string;

    loginTime: string;

    logoutTime: string | null;

    workingSeconds: number;

    normalBreakSeconds: number;

    exceptionBreakSeconds: number;

}



interface BreakRow {

    id: number;

    breakType: "NORMAL" | "EXCEPTION";

    startTime: string;

    endTime: string | null;

    durationSeconds: number;

    reason: string | null;

}



interface AttendanceDetails extends AttendanceRow {

    grossWorkingSeconds: number;

    breaks: BreakRow[];

}



function formatDuration(totalSeconds: number): string {

    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));

    const hours = Math.floor(safe / 3600);

    const minutes = Math.floor((safe % 3600) / 60);

    const seconds = safe % 60;



    return [

        String(hours).padStart(2, "0"),

        String(minutes).padStart(2, "0"),

        String(seconds).padStart(2, "0"),

    ].join(":");

}



function formatTime(value: string | null): string {

    if (!value) return "Still Logged In";



    const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);



    if (!match) return value;



    const hour = Number(match[1]);

    const minute = match[2];

    const second = match[3] ?? "00";



    const suffix = hour >= 12 ? "PM" : "AM";

    const displayHour = hour % 12 || 12;



    return `${displayHour}:${minute}:${second} ${suffix}`;

}



function formatDate(value: string): string {

    if (!value) return "-";



    const [year, month, day] = value.split("-");



    if (!year || !month || !day) return value;



    return `${day}-${month}-${year}`;

}



export default function AttendancePage() {

    const router = useRouter();



    const [rows, setRows] = useState<AttendanceRow[]>([]);

    const [searchTerm, setSearchTerm] = useState("");

    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState("");

    const [selected, setSelected] =

        useState<AttendanceDetails | null>(null);

    const [detailsLoading, setDetailsLoading] = useState(false);



    useEffect(() => {

        const token = getToken();



        if (!token) {

            router.replace("/");

            return;

        }



        const role = getUserRole();

        if (role !== "ADMIN" && role !== "AGENT") {
            router.replace("/dashboard");
            return;
        }

        if (role === "ADMIN") {
            loadAttendance();
        } else {
            loadMyAttendance();
        }

    }, [router]);



    async function loadAttendance() {

        try {

            setLoading(true);

            setMessage("");



            const token = getToken();



            const response = await fetch(

                `${API_BASE_URL}/api/admin/attendance`,

                {

                    method: "GET",

                    headers: {

                        Authorization: `Bearer ${token}`,

                    },

                }

            );



            const data = await response.json().catch(() => null);



            if (!response.ok) {

                throw new Error(

                    data?.message || "Unable to load attendance."

                );

            }



            setRows(Array.isArray(data) ? data : []);

        } catch (error) {

            console.error("Attendance load error:", error);



            setMessage(

                error instanceof Error

                    ? error.message

                    : "Unable to load attendance."

            );

        } finally {

            setLoading(false);

        }

    }



    async function loadMyAttendance() {
        try {
            setLoading(true);
            setMessage("");

            const token = getToken();
            const userId = localStorage.getItem("userId");

            if (!token || !userId) {
                router.replace("/");
                return;
            }

            const agentId = Number(userId);
            if (!Number.isFinite(agentId) || agentId <= 0) {
                setMessage("Invalid agent session. Please log in again.");
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const [attendanceResponse, breakResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/attendance/today?agentId=${agentId}`, {
                    method: "GET",
                    headers,
                }),
                fetch(`${API_BASE_URL}/api/attendance/break/summary?agentId=${agentId}`, {
                    method: "GET",
                    headers,
                }),
            ]);

            const data = await attendanceResponse.json().catch(() => null);
            const breakSummary = await breakResponse.json().catch(() => null);

            if (!attendanceResponse.ok) {
                throw new Error(data?.message || data?.error || "Unable to load your attendance.");
            }
            if (!breakResponse.ok) {
                throw new Error(breakSummary?.message || breakSummary?.error || "Unable to load your break summary.");
            }

            if (data) {
                const normalBreakSeconds = Math.max(0, Number(breakSummary?.normalUsedSeconds) || 0);
                const exceptionBreakSeconds = Math.max(0, Number(breakSummary?.exceptionUsedSeconds) || 0);
                const loginMilliseconds = data.loginTime ? new Date(data.loginTime).getTime() : Date.now();
                const endMilliseconds = data.logoutTime ? new Date(data.logoutTime).getTime() : Date.now();
                const grossWorkingSeconds = Math.max(0, Math.floor((endMilliseconds - loginMilliseconds) / 1000));

                setRows([{
                    id: Number(data.id) || 0,
                    agentId: Number(data.agentId) || agentId,
                    agentName: "My Attendance",
                    attendanceDate: data.attendanceDate || "",
                    loginTime: data.loginTime || "",
                    logoutTime: data.logoutTime ?? null,
                    workingSeconds: Math.max(0, grossWorkingSeconds - normalBreakSeconds - exceptionBreakSeconds),
                    normalBreakSeconds,
                    exceptionBreakSeconds,
                }]);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error("My attendance load error:", error);
            setMessage(error instanceof Error ? error.message : "Unable to load your attendance.");
        } finally {
            setLoading(false);
        }
    }


    async function openDetails(id: number) {

        try {

            setDetailsLoading(true);

            setMessage("");



            const token = getToken();



            const response = await fetch(

                `${API_BASE_URL}/api/admin/attendance/${id}`,

                {

                    method: "GET",

                    headers: {

                        Authorization: `Bearer ${token}`,

                    },

                }

            );



            const data = await response.json().catch(() => null);



            if (!response.ok) {

                throw new Error(

                    data?.message || "Unable to load attendance details."

                );

            }



            setSelected(data);

        } catch (error) {

            console.error("Attendance details error:", error);



            setMessage(

                error instanceof Error

                    ? error.message

                    : "Unable to load attendance details."

            );

        } finally {

            setDetailsLoading(false);

        }

    }



    const filteredRows = useMemo(() => {

        const search = searchTerm.trim().toLowerCase();



        if (!search) return rows;



        return rows.filter((row) =>

            [

                row.agentName,

                row.agentId,

                row.attendanceDate,

                row.loginTime,

                row.logoutTime,

            ]

                .map((value) => String(value ?? "").toLowerCase())

                .some((value) => value.includes(search))

        );

    }, [rows, searchTerm]);



    return (

        <DashboardLayout activeMenu="attendance">

            <div className="space-y-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <h1 className="text-2xl font-bold text-gray-900">

                            Agent Attendance

                        </h1>

                        <p className="mt-0.5 text-sm text-gray-500">

                            Monitor agent login, logout, working time and breaks.

                        </p>

                    </div>



                    <div className="flex gap-3">

                        <button

                            type="button"

                            onClick={() => router.push("/dashboard")}

                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"

                        >

                            ← Dashboard

                        </button>



                        <button

                            type="button"

                            onClick={getUserRole() === "ADMIN" ? loadAttendance : loadMyAttendance}

                            disabled={loading}

                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"

                        >

                            {loading ? "Refreshing..." : "Refresh"}

                        </button>

                    </div>

                </div>



                {message && (

                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">

                        {message}

                    </div>

                )}



                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

                    <input

                        type="text"

                        value={searchTerm}

                        onChange={(event) =>

                            setSearchTerm(event.target.value)

                        }

                        placeholder="Search agent, ID or date..."

                        className="w-full max-w-md rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                    />

                </div>



                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="w-full border-collapse text-left">

                            <thead>

                                <tr className="bg-gray-900 text-xs uppercase tracking-wider text-white">

                                    <th className="px-4 py-3">Agent</th>

                                    <th className="px-4 py-3">Date</th>

                                    <th className="px-4 py-3">Login</th>

                                    <th className="px-4 py-3">Logout</th>

                                    <th className="px-4 py-3">Working Time</th>

                                    <th className="px-4 py-3">Normal Break</th>

                                    <th className="px-4 py-3">Exception / Meeting</th>

                                    <th className="px-4 py-3 text-center">Action</th>

                                </tr>

                            </thead>



                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">

                                {filteredRows.length === 0 ? (

                                    <tr>

                                        <td

                                            colSpan={8}

                                            className="px-4 py-10 text-center text-gray-400"

                                        >

                                            {loading

                                                ? "Loading attendance..."

                                                : "No attendance records found."}

                                        </td>

                                    </tr>

                                ) : (

                                    filteredRows.map((row) => (

                                        <tr

                                            key={row.id}

                                            className="transition-colors hover:bg-gray-50"

                                        >

                                            <td className="px-4 py-4">

                                                <div className="font-semibold text-gray-900">

                                                    {row.agentName}

                                                </div>

                                                <div className="text-xs text-gray-400">

                                                    Agent ID: {row.agentId}

                                                </div>

                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4">

                                                {formatDate(row.attendanceDate)}

                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4">

                                                {formatTime(row.loginTime)}

                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4">

                                                <span

                                                    className={

                                                        row.logoutTime

                                                            ? "text-gray-700"

                                                            : "font-semibold text-green-600"

                                                    }

                                                >

                                                    {formatTime(row.logoutTime)}

                                                </span>

                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-700">



                                                {formatDuration(

                                                    row.logoutTime && row.loginTime

                                                        ? Math.max(

                                                            0,

                                                            Math.floor(

                                                                (new Date(row.logoutTime).getTime() -

                                                                    new Date(row.loginTime).getTime()) /

                                                                1000

                                                            ) -

                                                            (Number(row.normalBreakSeconds) || 0) -

                                                            (Number(row.exceptionBreakSeconds) || 0)

                                                        )

                                                        : Number(row.workingSeconds) || 0

                                                )}









                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-orange-600">

                                                {formatDuration(row.normalBreakSeconds)}

                                            </td>



                                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-600">

                                                {formatDuration(row.exceptionBreakSeconds)}

                                            </td>



                                            <td className="px-4 py-4 text-center">

                                                <button

                                                    type="button"

                                                    onClick={() => openDetails(row.id)}

                                                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"

                                                >

                                                    View

                                                </button>

                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>



                {selected && (

                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">

                            <div className="flex items-start justify-between gap-4">

                                <div>

                                    <h2 className="text-xl font-bold text-gray-900">

                                        {selected.agentName}

                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">

                                        {formatDate(selected.attendanceDate)} · Agent ID{" "}

                                        {selected.agentId}

                                    </p>

                                </div>



                                <button

                                    type="button"

                                    onClick={() => setSelected(null)}

                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"

                                >

                                    ✕

                                </button>

                            </div>



                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                                <div className="rounded-xl bg-gray-50 p-4">

                                    <div className="text-xs font-semibold uppercase text-gray-500">

                                        Login

                                    </div>

                                    <div className="mt-1 font-bold text-gray-900">

                                        {formatTime(selected.loginTime)}

                                    </div>

                                </div>



                                <div className="rounded-xl bg-gray-50 p-4">

                                    <div className="text-xs font-semibold uppercase text-gray-500">

                                        Logout

                                    </div>

                                    <div className="mt-1 font-bold text-gray-900">

                                        {formatTime(selected.logoutTime)}

                                    </div>

                                </div>



                                <div className="rounded-xl bg-blue-50 p-4">

                                    <div className="text-xs font-semibold uppercase text-blue-600">

                                        Working Time

                                    </div>

                                    <div className="mt-1 font-bold text-blue-800">

                                        {formatDuration(selected.workingSeconds)}

                                    </div>

                                </div>



                                <div className="rounded-xl bg-gray-50 p-4">

                                    <div className="text-xs font-semibold uppercase text-gray-500">

                                        Gross Time

                                    </div>

                                    <div className="mt-1 font-bold text-gray-900">

                                        {formatDuration(selected.grossWorkingSeconds)}

                                    </div>

                                </div>

                            </div>



                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">

                                    <div className="text-sm font-bold text-orange-700">

                                        ☕ Normal Break Total

                                    </div>

                                    <div className="mt-2 text-3xl font-black text-orange-800">

                                        {formatDuration(

                                            selected.normalBreakSeconds

                                        )}

                                    </div>

                                    <div className="mt-1 text-xs text-orange-700">

                                        Daily limit: 01:00:00

                                    </div>

                                </div>



                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                                    <div className="text-sm font-bold text-blue-700">

                                        ⚠ Exception / Meeting Total

                                    </div>

                                    <div className="mt-2 text-3xl font-black text-blue-800">

                                        {formatDuration(

                                            selected.exceptionBreakSeconds

                                        )}

                                    </div>

                                    <div className="mt-1 text-xs text-blue-700">

                                        Does not count toward the normal break limit.

                                    </div>

                                </div>

                            </div>



                            <div className="mt-6">

                                <h3 className="text-base font-bold text-gray-900">

                                    Break History

                                </h3>



                                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">

                                    <div className="overflow-x-auto">

                                        <table className="w-full border-collapse text-left text-sm">

                                            <thead>

                                                <tr className="bg-gray-900 text-xs uppercase text-white">

                                                    <th className="px-4 py-3">Type</th>

                                                    <th className="px-4 py-3">Start</th>

                                                    <th className="px-4 py-3">End</th>

                                                    <th className="px-4 py-3">Duration</th>

                                                    <th className="px-4 py-3">Reason</th>

                                                </tr>

                                            </thead>



                                            <tbody className="divide-y divide-gray-100">

                                                {selected.breaks.length === 0 ? (

                                                    <tr>

                                                        <td

                                                            colSpan={5}

                                                            className="px-4 py-6 text-center text-gray-400"

                                                        >

                                                            No breaks recorded.

                                                        </td>

                                                    </tr>

                                                ) : (

                                                    selected.breaks.map((item) => (

                                                        <tr key={item.id}>

                                                            <td className="px-4 py-3">

                                                                <span

                                                                    className={

                                                                        item.breakType === "NORMAL"

                                                                            ? "rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700"

                                                                            : "rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700"

                                                                    }

                                                                >

                                                                    {item.breakType === "NORMAL"

                                                                        ? "Normal"

                                                                        : "Exception / Meeting"}

                                                                </span>

                                                            </td>



                                                            <td className="whitespace-nowrap px-4 py-3">

                                                                {formatTime(item.startTime)}

                                                            </td>



                                                            <td className="whitespace-nowrap px-4 py-3">

                                                                {formatTime(item.endTime)}

                                                            </td>



                                                            <td className="whitespace-nowrap px-4 py-3 font-semibold">

                                                                {formatDuration(

                                                                    item.durationSeconds

                                                                )}

                                                            </td>



                                                            <td className="px-4 py-3 text-gray-600">

                                                                {item.reason || "-"}

                                                            </td>

                                                        </tr>

                                                    ))

                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            </div>



                            <div className="mt-6 flex justify-end">

                                <button

                                    type="button"

                                    onClick={() => setSelected(null)}

                                    className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"

                                >

                                    Close

                                </button>

                            </div>

                        </div>

                    </div>

                )}



                {detailsLoading && (

                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">

                        <div className="rounded-lg bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-xl">

                            Loading attendance details...

                        </div>

                    </div>

                )}

            </div>

        </DashboardLayout>

    );

}
