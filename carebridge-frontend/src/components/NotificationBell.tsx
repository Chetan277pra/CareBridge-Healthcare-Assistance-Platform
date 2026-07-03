import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  appointmentId: number | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  APPOINTMENT_REQUEST:   "📋",
  APPOINTMENT_ACCEPTED:  "✅",
  APPOINTMENT_REJECTED:  "❌",
  APPOINTMENT_CANCELLED: "🚫",
  APPOINTMENT_COMPLETED: "🎉",
  APPOINTMENT_REMINDER:  "⏰",
  SYSTEM:               "🔔",
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return "Just now";
}

interface NotificationBellProps {
  /** Called by parent when a new live event arrives (to re-fetch count) */
  liveEvent?: unknown;
}

export function NotificationBell({ liveEvent }: NotificationBellProps) {
  const navigate  = useNavigate();
  const token     = localStorage.getItem("token");
  const panelRef  = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open, setOpen] = useState(false);

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await axios.get<Notification[]>(`${API_BASE}/api/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.slice(0, 10));
      setUnreadCount(res.data.length);
    } catch {
      // ignore — e.g. user not logged in
    }
  };

  // Initial fetch and refresh on live events
  useEffect(() => { fetchUnread(); }, [token, liveEvent]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (notif: Notification) => {
    if (!token) return;
    if (!notif.isRead) {
      try {
        await axios.put(`${API_BASE}/api/notifications/${notif.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* ignore */ }
    }
    if (notif.appointmentId) {
      navigate(`/appointments/${notif.appointmentId}`);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await axios.put(`${API_BASE}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "50%",
          width: 42,
          height: 42,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backdropFilter: "blur(4px)",
          transition: "all 0.2s",
        }}
        title="Notifications"
        aria-label="Open notifications"
      >
        <span style={{ fontSize: 20 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "linear-gradient(135deg, #f43f5e, #e11d48)",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(244,63,94,0.5)",
            border: "2px solid rgba(255,255,255,0.2)",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id="notif-panel"
          style={{
            position: "absolute",
            right: 0,
            top: 52,
            width: 360,
            maxHeight: 480,
            overflowY: "auto",
            background: "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 16,
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            zIndex: 9999,
            animation: "fadeInDown 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div>
              <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: "rgba(99,102,241,0.25)",
                  color: "#818cf8",
                  borderRadius: 20,
                  padding: "2px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: "none",
                border: "none",
                color: "#6366f1",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <div style={{ fontSize: 14 }}>No notifications yet</div>
            </div>
          ) : (
            <div>
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "14px 20px",
                    cursor: notif.appointmentId ? "pointer" : "default",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: notif.isRead ? "transparent" : "rgba(99,102,241,0.06)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = notif.isRead ? "transparent" : "rgba(99,102,241,0.06)")}
                >
                  <div style={{
                    width: 36, height: 36, minWidth: 36,
                    background: "rgba(99,102,241,0.15)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {typeIcon[notif.type] ?? "🔔"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: notif.isRead ? 400 : 600 }}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#6366f1", display: "inline-block",
                        }} />
                      )}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>{notif.message}</div>
                    <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                      {timeAgo(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
