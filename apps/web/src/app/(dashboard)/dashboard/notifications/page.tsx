'use client';

import { useState, useEffect, useCallback } from 'react';
import { Film, FileText, CheckCircle2, UserPlus, Bell, Loader2 } from 'lucide-react';
import { request } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_STYLES: Record<string, { icon: React.ElementType; color: string }> = {
  registration: { icon: UserPlus,      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  recording:    { icon: Film,           color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  analytics:    { icon: FileText,       color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  system:       { icon: CheckCircle2,   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

function getTypeStyle(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.system;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await request<Notification[]>('/notifications?page=1&limit=20');
      setNotifications(data ?? []);
    } catch {
      // Fallback to empty list if endpoint not yet available
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await request<void>(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await request<void>('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently fail
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-600 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm mt-1">Stay updated with registrations, recording status, and server alerts.</p>
        </div>

        {unreadCount > 0 && (
          <button
            id="mark-all-read"
            onClick={() => void markAllAsRead()}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="border border-white/[0.06] rounded-2xl bg-[#0d0d14]/60 overflow-hidden divide-y divide-white/[0.04]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 items-start animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 rounded bg-white/5" />
                <div className="h-2.5 w-full max-w-xs rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center bg-[#0d0d14]/40">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-white/20" />
          </div>
          <h3 className="font-semibold text-white/60 text-sm">No notifications yet</h3>
          <p className="text-white/30 text-xs mt-1 max-w-xs mx-auto">
            You&apos;ll see registration alerts, recording updates, and system messages here.
          </p>
        </div>
      ) : (
        <div className="border border-white/[0.06] rounded-2xl bg-[#0d0d14]/60 overflow-hidden divide-y divide-white/[0.04]">
          {notifications.map((item) => {
            const { icon: Icon, color } = getTypeStyle(item.type);
            return (
              <button
                key={item.id}
                onClick={() => { if (!item.read) void markAsRead(item.id); }}
                className={`w-full text-left p-4 flex gap-4 hover:bg-white/[0.02] transition-colors items-start ${!item.read ? 'bg-violet-500/[0.03]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-white flex items-center gap-2">
                      {item.title}
                      {!item.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                      )}
                    </p>
                    <span className="text-[10px] text-white/30 font-medium flex-shrink-0">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">{item.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
