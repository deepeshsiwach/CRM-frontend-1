
"use client";

// ============================================================
// DERIVION CRM - NOTIFICATION BELL COMPONENT
// Click notification -> Open related page -> Mark as read
// ============================================================

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

// Extract the related lead ID from a notification message.
function getNotificationUrl(
  notification: Notification
): string | null {
  const text = `${notification.title} ${notification.message}`;

  const match = text.match(/\bLead\s*#?\s*(\d+)\b/i);

  if (match) {
    return `/lead-details?id=${match[1]}`;
  }

  return null;
}

export default function NotificationBell() {
  const router = useRouter();

  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const token = getToken();

  // ============================================================
  // LOAD UNREAD COUNT
  // ============================================================

  const loadUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread/count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const count = await response.json();
      setUnreadCount(Number(count) || 0);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  }, [token]);

  // ============================================================
  // LOAD UNREAD NOTIFICATIONS
  // ============================================================

  const loadNotifications = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }

      const data: Notification[] = await response.json();

      setNotifications(data);
      await loadUnreadCount();
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token, loadUnreadCount]);

  // ============================================================
  // MARK ONE NOTIFICATION AS READ
  // ============================================================

  const markRead = async (id: number): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      return true;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  };

  // ============================================================
  // CLICK NOTIFICATION
  // Mark it as read, remove it from unread list, and navigate.
  // ============================================================

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    if (processingId !== null) return;

    setProcessingId(notification.id);

    const targetUrl = getNotificationUrl(notification);

    // Close the notification panel immediately.
    setPanelOpen(false);

    // Remove from the visible unread list immediately.
    setNotifications((previous) =>
      previous.filter((item) => item.id !== notification.id)
    );

    setUnreadCount((previous) => Math.max(0, previous - 1));

    const success = await markRead(notification.id);

    if (!success) {
      // Restore the notification if the server did not mark it read.
      await loadNotifications();
    } else {
      await loadUnreadCount();
    }

    setProcessingId(null);

    // Open the related lead even if marking it read failed.
    if (targetUrl) {
      router.push(targetUrl);
    } else {
      // No recognized destination: remain on the current page.
      if (!success) {
        setPanelOpen(true);
      }
    }
  };

  // ============================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================================

  const markAllRead = async () => {
    if (!token || markingAllRead) return;

    setMarkingAllRead(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      setNotifications([]);
      setUnreadCount(0);

      await loadUnreadCount();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      await loadNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  // ============================================================
  // INITIAL COUNT AND PERIODIC REFRESH
  // ============================================================

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUnreadCount();
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // ============================================================
  // CLOSE PANEL WHEN CLICKING OUTSIDE
  // ============================================================

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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ============================================================
  // BELL CLICK
  // ============================================================

  const handleBellClick = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();

    if (panelOpen) {
      setPanelOpen(false);
      return;
    }

    setPanelOpen(true);
    await loadNotifications();
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      id="crmNotificationContainer"
      className="relative inline-flex items-center justify-center mr-2"
    >
      {/* NOTIFICATION BELL */}

      <div
        id="crmNotificationBell"
        ref={bellRef}
        title="Notifications"
        role="button"
        tabIndex={0}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={panelOpen}
        onClick={handleBellClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setPanelOpen((previous) => !previous);

            if (!panelOpen) {
              void loadNotifications();
            }
          }
        }}
        className="relative inline-flex items-center justify-center
          w-10 h-10 cursor-pointer text-2xl rounded-xl
          hover:bg-gray-700 transition-colors duration-200"
      >
        🔔

        {unreadCount > 0 && (
          <span
            id="crmNotificationCount"
            className="absolute -top-1 -right-1 min-w-[19px]
              h-[19px] px-1 rounded-full bg-red-500 text-white
              text-[11px] font-bold flex items-center justify-center
              border-2 border-gray-800"
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
          className="fixed top-[72px] right-6 w-[400px]
            max-w-[calc(100vw-24px)] max-h-[520px]
            overflow-hidden bg-white border border-gray-200
            rounded-xl shadow-2xl z-[999999]"
        >
          {/* HEADER */}

          <div
            className="flex justify-between items-center px-4 py-3.5
              border-b border-gray-200 bg-white"
          >
            <span className="text-base font-bold text-gray-900">
              Notifications
            </span>

            <button
              id="crmMarkAllRead"
              type="button"
              disabled={markingAllRead || notifications.length === 0}
              onClick={(event) => {
                event.stopPropagation();
                void markAllRead();
              }}
              className="text-blue-600 text-xs font-semibold
                hover:text-blue-800 disabled:text-gray-400
                disabled:cursor-not-allowed bg-transparent
                border-none cursor-pointer p-0"
            >
              {markingAllRead ? "Please wait..." : "Mark all as read"}
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
                  disabled={processingId !== null}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleNotificationClick(notification);
                  }}
                  className="w-full text-left px-4 py-4
                    border-b border-gray-100 cursor-pointer
                    bg-indigo-50 hover:bg-indigo-100
                    disabled:opacity-60
                    transition-colors duration-150"
                >
                  <div className="flex gap-3 items-start">
                    <div className="text-xl w-8 min-w-[2rem] text-center">
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 mb-1 leading-snug">
                        {notification.title}
                      </div>

                      <div className="text-sm font-medium text-gray-700 leading-relaxed break-words">
                        {notification.message}
                      </div>

                      <div className="mt-2 text-[11px] font-medium text-gray-500">
                        {formatNotificationDate(notification.createdAt)}
                      </div>

                      {processingId === notification.id && (
                        <div className="mt-2 text-xs text-blue-600">
                          Opening...
                        </div>
                      )}

                      {getNotificationUrl(notification) && (
                        <div className="mt-2 text-xs font-semibold text-blue-600">
                          Click to open lead →
                        </div>
                      )}
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