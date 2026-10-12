
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
  leadId?: number;
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
  const router = useRouter();

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
        {
          headers: { Authorization: "Bearer " + token },
        }
      );

      if (!response.ok) return;

      const count = await response.json();
      setUnreadCount(count);
    } catch {
      // Keep the current count if the request fails.
    }
  }, [token]);

  const loadNotifications = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread`,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load notifications.");
      }

      const data: Notification[] = await response.json();
      setNotifications(data);

      await loadUnreadCount();
    } catch (error) {
      console.error("Unable to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token, loadUnreadCount]);

  // Explicitly mark one notification as read.
  const markRead = async (id: number) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: { Authorization: "Bearer " + token },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to mark notification as read.");
      }

      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  // Explicitly mark all notifications as read.
  const markAllRead = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PUT",
          headers: { Authorization: "Bearer " + token },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to mark notifications as read.");
      }

      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  // Clicking a notification navigates without marking it as read.
  const handleNotificationClick = (notification: Notification) => {
    const leadId =
      notification.leadId ??
      notification.message.match(/Lead\s+#?\s*(\d+)/i)?.[1] ??
      notification.title.match(/Lead\s+#?\s*(\d+)/i)?.[1];

    if (leadId) {
      router.push(`/lead-details?id=${leadId}`);
      return;
    }

    // Do not mark as read or remove the notification if no destination
    // can be identified from its available data.
    console.info(
      "No destination found for notification:",
      notification.id
    );
  };

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUnreadCount();
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(target) &&
        !bellRef.current.contains(target)
      ) {
        setPanelOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleBellClick = async (event: React.MouseEvent) => {
    event.stopPropagation();

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
      className="relative inline-flex items-center justify-center mr-2"
    >
      {/* BELL */}
      <div
        id="crmNotificationBell"
        ref={bellRef}
        title="Notifications"
        onClick={handleBellClick}
        className="relative inline-flex items-center justify-center w-10 h-10 cursor-pointer text-2xl rounded-xl hover:bg-gray-700 transition-colors duration-200"
      >
        🔔

        {unreadCount > 0 && (
          <span
            id="crmNotificationCount"
            className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-gray-800"
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
          className="fixed top-[72px] right-6 w-[400px] max-w-[calc(100vw-24px)] max-h-[520px] overflow-hidden bg-white border border-gray-200 rounded-xl shadow-2xl z-[999999]"
        >
          {/* HEADER */}
          <div className="flex justify-between items-center px-4 py-3.5 border-b border-gray-200 bg-white">
            <span className="text-base font-bold text-gray-900">
              Notifications
            </span>

            <button
              id="crmMarkAllRead"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                markAllRead();
              }}
              className="text-blue-600 text-xs font-semibold hover:text-blue-800 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Mark all as read
            </button>
          </div>

          {/* NOTIFICATION LIST */}
          <div
            id="crmNotificationList"
            className="max-h-[450px] overflow-y-auto bg-white"
          >
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-5 text-center bg-white">
                <div className="text-4xl mb-2">🔕</div>
                <div className="text-sm font-semibold text-gray-700">
                  No new notifications
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  You&apos;re all caught up.
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNotificationClick(notification);
                  }}
                  className="w-full text-left px-4 py-4 border-b border-gray-100 cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors duration-150"
                >
                  <div className="flex gap-3 items-start">
                    <div className="text-xl w-8 min-w-[2rem] text-center">
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-bold text-gray-900 mb-1 leading-snug"
                        dangerouslySetInnerHTML={{
                          __html: escapeHtml(notification.title),
                        }}
                      />

                      <div
                        className="text-sm font-medium text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: escapeHtml(notification.message),
                        }}
                      />

                      <div className="mt-2 text-[11px] font-medium text-gray-500">
                        {formatNotificationDate(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
