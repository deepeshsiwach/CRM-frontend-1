"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserRole } from "@/lib/auth";

interface AgentCallRow {
  agentId: number;
  agentName: string;
  totalCalls: number;
  answeredCalls: number;
  enrolledCallOutcomes: number;
  totalCallDurationSeconds: number;
}

interface AttendanceRow {
  id: number;
  agentId: number;
  agentName: string;
  attendanceDate: string;
  loginTime: string | null;
  logoutTime: string | null;
  workingSeconds: number;
  normalBreakSeconds: number;
  exceptionBreakSeconds: number;
  onBreak: boolean;
  activeBreakType: string | null;
  activeBreakStartTime: string | null;
}

interface ReportData {
  from: string;
  to: string;
  agentId: number | null;
  attendance: AttendanceRow[];
  calls: {
    totalCalls: number;
    answeredCalls: number;
    enrolledCallOutcomes: number;
    totalCallDurationSeconds: number;
  };
  callsByAgent: AgentCallRow[];
  followUps: Record<string, number>;
}

function getTodayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatShortDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${total % 60}s`;
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const timePart = value.includes("T") ? value.split("T")[1] : value;
  const [hoursText, minutesText] = timePart.split(":");
  const hours = Number(hoursText);
  const minutes = (minutesText ?? "00").slice(0, 2);
  if (!Number.isFinite(hours)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

const colors = {
  navy: "#111827",
  muted: "#64748b",
  border: "#e2e8f0",
  blue: "#2563eb",
  page: "#f4f7fb",
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: "9px",
  padding: "10px 12px",
  minWidth: "160px",
  background: "#ffffff",
  color: colors.navy,
  outlineColor: colors.blue,
};

const cellStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
  fontSize: "13px",
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.025)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: 750, color: colors.navy }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: colors.muted, fontSize: "12px", marginTop: "5px" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  hint,
  accent = colors.blue,
}: {
  title: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "13px",
        padding: "18px",
        minWidth: 0,
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.025)",
      }}
    >
      <p style={{ color: colors.muted, fontSize: "12px", fontWeight: 600 }}>{title}</p>
      <p style={{ color: accent, fontSize: "27px", lineHeight: 1.25, fontWeight: 800, marginTop: "10px" }}>
        {value}
      </p>
      {hint && <p style={{ color: colors.muted, fontSize: "11px", marginTop: "7px" }}>{hint}</p>}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" | "slate" | "red" }) {
  const palette = {
    green: { color: "#166534", background: "#dcfce7" },
    amber: { color: "#92400e", background: "#fef3c7" },
    slate: { color: "#475569", background: "#f1f5f9" },
    red: { color: "#991b1b", background: "#fee2e2" },
  }[tone];
  return (
    <span style={{ display: "inline-block", borderRadius: "999px", padding: "5px 9px", fontSize: "11px", fontWeight: 700, color: palette.color, background: palette.background }}>
      {label}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [today, setToday] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [agentId, setAgentId] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentDate = getTodayString();
    setToday(currentDate);
    setFrom(`${currentDate.slice(0, 7)}-01`);
    setTo(currentDate);
  }, []);

  const loadReport = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const role = getUserRole();
    if (role !== "ADMIN" && role !== "MANAGER") {
      router.replace("/dashboard");
      return;
    }
    if (!from || !to || !today) return;
    if (from > to) {
      setError("The From Date must be on or before the To Date.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (agentId) params.set("agentId", agentId);
      const response = await fetch(`${API_BASE_URL}/api/dashboard/reports?${params.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Unable to load reports (HTTP ${response.status}).`);
      }
      setReport(data as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to, today, agentId, router]);

  useEffect(() => {
    if (from && to && today) void loadReport();
  }, [from, to, today, agentId, loadReport]);

  const attendanceByAgent = useMemo(() => {
    const sessions = (report?.attendance ?? []).filter((item) => item.attendanceDate === report?.to);
    const combined = new Map<number, AttendanceRow>();
    for (const item of sessions) {
      const existing = combined.get(item.agentId);
      if (!existing) {
        combined.set(item.agentId, { ...item });
        continue;
      }
      if (item.loginTime && (!existing.loginTime || item.loginTime < existing.loginTime)) existing.loginTime = item.loginTime;
      if (!item.logoutTime || !existing.logoutTime) existing.logoutTime = null;
      else if (item.logoutTime > existing.logoutTime) existing.logoutTime = item.logoutTime;
      existing.workingSeconds += item.workingSeconds;
      existing.normalBreakSeconds += item.normalBreakSeconds;
      existing.exceptionBreakSeconds += item.exceptionBreakSeconds;
      existing.onBreak = existing.onBreak || item.onBreak;
      if (item.activeBreakType) {
        existing.activeBreakType = item.activeBreakType;
        existing.activeBreakStartTime = item.activeBreakStartTime;
      }
    }
    return [...combined.values()].sort((a, b) => a.agentName.localeCompare(b.agentName));
  }, [report]);

  const attendanceById = useMemo(() => new Map(attendanceByAgent.map((item) => [item.agentId, item])), [attendanceByAgent]);
  const teamRows = useMemo(() => {
    const agents = report?.callsByAgent ?? [];
    return agents.map((agent) => {
      const attendance = attendanceById.get(agent.agentId);
      const connectRate = agent.totalCalls > 0 ? Math.round((agent.answeredCalls / agent.totalCalls) * 100) : 0;
      const loginMinutes = attendance?.loginTime ? (() => {
        const timePart = attendance.loginTime!.includes("T") ? attendance.loginTime!.split("T")[1] : attendance.loginTime!;
        const [hour, minute] = timePart.split(":").map(Number);
        return hour * 60 + minute;
      })() : null;
      const loginCheck = loginMinutes == null ? "No record" : loginMinutes <= 600 ? "On time" : "Late";
      const liveStatus = !attendance ? "No record" : attendance.onBreak || attendance.activeBreakType ? "On break" : !attendance.logoutTime ? "Logged in" : "Logged out";
      return { ...agent, attendance, connectRate, loginCheck, liveStatus };
    });
  }, [report, attendanceById]);

  const answeredRate = report && report.calls.totalCalls > 0
    ? Math.round((report.calls.answeredCalls / report.calls.totalCalls) * 100)
    : 0;
  const pendingFollowUps = report?.followUps.pendingFollowUps ?? 0;
  const totalBreakSeconds = attendanceByAgent.reduce((sum, row) => sum + row.normalBreakSeconds + row.exceptionBreakSeconds, 0);

  return (
    <DashboardLayout>
      <main style={{ padding: "clamp(16px, 2.5vw, 30px)", background: colors.page, minHeight: "100vh", color: colors.navy }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
          <div>
            <p style={{ color: colors.blue, fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "7px" }}>Sales operations</p>
            <h1 style={{ fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 800, letterSpacing: "-0.7px" }}>CRM Command Center</h1>
            <p style={{ color: colors.muted, marginTop: "7px", fontSize: "13px" }}>Team activity, call performance, attendance and follow-up overview</p>
          </div>
          <button onClick={() => void loadReport()} disabled={loading || !from || !to} style={{ background: colors.blue, color: "#fff", border: 0, borderRadius: "9px", padding: "11px 17px", fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Refreshing…" : "↻ Refresh Report"}
          </button>
        </header>

        <section style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "14px", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: "13px", padding: "16px", marginBottom: "18px" }}>
          <label style={{ display: "grid", gap: "7px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
            From date
            <input type="date" value={from} max={to || today || undefined} onChange={(event) => setFrom(event.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: "7px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
            To date
            <input type="date" value={to} min={from || undefined} max={today || undefined} onChange={(event) => setTo(event.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: "7px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
            Agent
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} style={inputStyle}>
              <option value="">All Agents</option>
              {(report?.callsByAgent ?? []).map((agent) => <option key={agent.agentId} value={agent.agentId}>{agent.agentName}</option>)}
            </select>
          </label>
          <div style={{ marginLeft: "auto", color: colors.muted, fontSize: "12px", paddingBottom: "10px" }}>Period: <strong style={{ color: colors.navy }}>{formatDate(from)} – {formatDate(to)}</strong></div>
        </section>

        {error && <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "13px 15px", borderRadius: "9px", marginBottom: "18px" }}>{error}</div>}
        {loading && !report && <p style={{ color: colors.muted, padding: "20px 0" }}>Loading report data…</p>}

        {report && <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            <MetricCard title="Total Calls" value={report.calls.totalCalls} hint="Selected date range" />
            <MetricCard title="Connected Calls" value={report.calls.answeredCalls} hint={`${answeredRate}% connection rate`} accent="#0f766e" />
            <MetricCard title="Enrolled Outcomes" value={report.calls.enrolledCallOutcomes} hint="Recorded on call logs" accent="#7c3aed" />
            <MetricCard title="Pending Follow-ups" value={pendingFollowUps} hint="In selected date range" accent="#d97706" />
            <MetricCard title="Call Duration" value={formatShortDuration(report.calls.totalCallDurationSeconds)} hint={formatDuration(report.calls.totalCallDurationSeconds)} accent="#0f766e" />
            <MetricCard title="Team Break Time" value={formatShortDuration(totalBreakSeconds)} hint={`For ${formatDate(report.to)}`} accent="#64748b" />
          </section>

          <SectionCard title="Today's Team Board" subtitle={`Attendance and call activity for ${formatDate(report.to)}. Login target: 10:00 AM. Metrics shown are based on data already provided by the CRM API.`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc" }}><tr>{["Agent", "Calls", "Connected", "Connect %", "Login Time", "Login Check", "Working Time", "Break Total", "Live Status"].map((heading) => <th key={heading} style={{ ...cellStyle, color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{heading}</th>)}</tr></thead>
                <tbody>
                  {teamRows.length === 0 ? <tr><td colSpan={9} style={cellStyle}>No agent data available for this selection.</td></tr> : teamRows.map((agent) => {
                    const breakSeconds = (agent.attendance?.normalBreakSeconds ?? 0) + (agent.attendance?.exceptionBreakSeconds ?? 0);
                    const loginTone = agent.loginCheck === "On time" ? "green" : agent.loginCheck === "Late" ? "amber" : "slate";
                    const statusTone = agent.liveStatus === "Logged in" || agent.liveStatus === "On break" ? "green" : agent.liveStatus === "No record" ? "red" : "slate";
                    return <tr key={agent.agentId}>
                      <td style={{ ...cellStyle, fontWeight: 700 }}>{agent.agentName}</td>
                      <td style={cellStyle}>{agent.totalCalls}</td>
                      <td style={cellStyle}>{agent.answeredCalls}</td>
                      <td style={cellStyle}><span style={{ color: agent.connectRate > 0 ? "#0f766e" : colors.muted, fontWeight: 700 }}>{agent.connectRate}%</span></td>
                      <td style={cellStyle}>{agent.attendance ? formatTime(agent.attendance.loginTime) : "—"}</td>
                      <td style={cellStyle}><StatusPill label={agent.loginCheck} tone={loginTone} /></td>
                      <td style={cellStyle}>{agent.attendance ? formatShortDuration(agent.attendance.workingSeconds) : "—"}</td>
                      <td style={cellStyle}>{formatShortDuration(breakSeconds)}</td>
                      <td style={cellStyle}><StatusPill label={agent.liveStatus} tone={statusTone} /></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ color: colors.muted, fontSize: "11px", marginTop: "12px" }}>“No record” means no attendance row was returned for that agent and date; it is not a confirmed absence. Lead-added and per-agent follow-up counts are not available in the current API response and are intentionally not estimated.</p>
          </SectionCard>

          <SectionCard title="Agent Call Performance" subtitle="Compare call volume, connections, enrolment outcomes and duration for the selected period.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc" }}><tr>{["Agent", "Total Calls", "Connected Calls", "Connect Rate", "Enrolled Outcomes", "Call Duration"].map((heading) => <th key={heading} style={{ ...cellStyle, color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{heading}</th>)}</tr></thead>
                <tbody>
                  {report.callsByAgent.length === 0 ? <tr><td colSpan={6} style={cellStyle}>No agent records found for this period.</td></tr> : report.callsByAgent.map((agent) => {
                    const rate = agent.totalCalls > 0 ? Math.round((agent.answeredCalls / agent.totalCalls) * 100) : 0;
                    return <tr key={agent.agentId}><td style={{ ...cellStyle, fontWeight: 700 }}>{agent.agentName}</td><td style={cellStyle}>{agent.totalCalls}</td><td style={cellStyle}>{agent.answeredCalls}</td><td style={cellStyle}>{rate}%</td><td style={cellStyle}>{agent.enrolledCallOutcomes}</td><td style={cellStyle}>{formatDuration(agent.totalCallDurationSeconds)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Follow-up Summary" subtitle="Follow-up counts returned for the selected report period.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "12px" }}>
              {Object.entries(report.followUps).map(([status, count]) => <div key={status} style={{ background: "#f8fafc", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "15px" }}><p style={{ color: colors.muted, fontSize: "12px", fontWeight: 600 }}>{formatLabel(status)}</p><p style={{ color: colors.blue, fontSize: "25px", fontWeight: 800, marginTop: "8px" }}>{count}</p></div>)}
            </div>
          </SectionCard>

          <SectionCard title="Attendance & Breaks" subtitle={`Attendance sessions on ${formatDate(report.to)} are combined into one row per agent.`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc" }}><tr>{["Agent", "Login Time", "Logout Time", "Working Time", "Normal Breaks", "Exception Breaks", "Live Status"].map((heading) => <th key={heading} style={{ ...cellStyle, color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{heading}</th>)}</tr></thead>
                <tbody>
                  {attendanceByAgent.length === 0 ? <tr><td colSpan={7} style={cellStyle}>No attendance records found for {formatDate(report.to)}.</td></tr> : attendanceByAgent.map((agent) => {
                    const status = agent.onBreak || agent.activeBreakType ? "On break" : !agent.logoutTime ? "Logged in" : "Logged out";
                    const tone = status === "On break" || status === "Logged in" ? "green" : "slate";
                    return <tr key={`${agent.agentId}-${agent.attendanceDate}`}><td style={{ ...cellStyle, fontWeight: 700 }}>{agent.agentName}</td><td style={cellStyle}>{formatTime(agent.loginTime)}</td><td style={cellStyle}>{formatTime(agent.logoutTime)}</td><td style={cellStyle}>{formatDuration(agent.workingSeconds)}</td><td style={cellStyle}>{formatDuration(agent.normalBreakSeconds)}</td><td style={cellStyle}>{formatDuration(agent.exceptionBreakSeconds)}</td><td style={cellStyle}><StatusPill label={status} tone={tone} /></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>}
        <footer style={{ color: colors.muted, fontSize: "11px", textAlign: "center", padding: "4px 0 18px" }}>CRM Command Center · Report data from your existing CRM API</footer>
      </main>
    </DashboardLayout>
  );
}
