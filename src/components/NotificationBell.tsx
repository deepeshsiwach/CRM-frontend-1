"use client";

// ============================================================
// DERIVION CRM - NOTIFICATION BELL COMPONENT
// Ported from notifications.js
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNotificationDate(date: string): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date;
  }
}

function getIcon(type: string): string {
  if (type === "FOLLOW_UP_REMINDER") return "⏰";
  if (type === "FOLLOW_UP_OVERDUE") return "🔴";
  return "🔔";
}

export default function NotificationBell() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const token = getToken();

  const loadUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread/count`,
        { headers: { Authorization: "Bearer " + token } }
      );
      if (!response.ok) return;
      const count = await response.json();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, [token]);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread`,
        { headers: { Authorization: "Bearer " + token } }
      );
      if (!response.ok) throw new Error("Failed");
      const data: Notification[] = await response.json();
      setNotifications(data);
      await loadUnreadCount();
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token, loadUnreadCount]);

  const markRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
      });
      await loadNotifications();
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
      });
      await loadNotifications();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadUnreadCount();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleBellClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!panelOpen) {
      setPanelOpen(true);
      await loadNotifications();
    } else {
      setPanelOpen(false);
    }
  };

  return (
    <div
      id="crmNotificationContainer"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginRight: "15px",
      }}
    >
      {/* BELL */}
      <div
        id="crmNotificationBell"
        ref={bellRef}
        title="Notifications"
        onClick={handleBellClick}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "42px",
          height: "42px",
          cursor: "pointer",
          fontSize: "24px",
          borderRadius: "10px",
          transition: "background 0.2s ease",
        }}
      >
        🔔
        {/* UNREAD COUNT */}
        {unreadCount > 0 && (
          <span
            id="crmNotificationCount"
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              minWidth: "19px",
              height: "19px",
              padding: "0 5px",
              borderRadius: "20px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: "19px",
              border: "2px solid #172554",
              boxSizing: "border-box",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* NOTIFICATION PANEL */}
      {panelOpen && (
        <div
          id="crmNotificationPanel"
          ref={panelRef}
          style={{
            display: "block",
            position: "fixed",
            top: "85px",
            right: "25px",
            width: "400px",
            maxWidth: "calc(100vw - 30px)",
            maxHeight: "520px",
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid #dbe3ef",
            borderRadius: "12px",
            boxShadow: "0 15px 40px rgba(15,23,42,0.22)",
            zIndex: 999999,
          }}
        >
          {/* PANEL HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "#ffffff",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              Notifications
            </div>
            <button
              id="crmMarkAllRead"
              type="button"
              onClick={(e) => { e.stopPropagation(); markAllRead(); }}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                padding: "4px 0",
              }}
            >
              Mark all as read
            </button>
          </div>

          {/* NOTIFICATION LIST */}
          <div
            id="crmNotificationList"
            style={{ maxHeight: "450px", overflowY: "auto", background: "#ffffff" }}
          >
            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280", background: "#ffffff" }}>
                <div style={{ fontSize: "30px", marginBottom: "10px" }}>🔕</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>No new notifications</div>
                <div style={{ marginTop: "5px", fontSize: "12px", color: "#9ca3af" }}>You&apos;re all caught up.</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={(e) => { e.stopPropagation(); markRead(notification.id); }}
                  style={{
                    padding: "16px 15px",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer",
                    background: "#eef2ff",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e7ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#eef2ff")}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "21px", width: "30px", minWidth: "30px", textAlign: "center" }}>
                      {getIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", marginBottom: "6px", lineHeight: 1.35 }}>
                        {escapeHtml(notification.title)}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151", lineHeight: 1.5 }}>
                        {escapeHtml(notification.message)}
                      </div>
                      <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 500, color: "#6b7280" }}>
                        {formatNotificationDate(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
