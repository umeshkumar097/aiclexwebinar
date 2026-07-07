'use client';
import { useState } from 'react';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'offer' | 'poll' | 'resource';
  message: string;
  icon?: string;
}

const TYPE_STYLES = {
  info:     { bg: 'bg-white/10 border-white/20',                 icon: 'ℹ️' },
  success:  { bg: 'bg-emerald-500/15 border-emerald-500/30',     icon: '✅' },
  warning:  { bg: 'bg-amber-500/15 border-amber-500/30',         icon: '⚠️' },
  offer:    { bg: 'bg-violet-500/15 border-violet-500/30',       icon: '🎁' },
  poll:     { bg: 'bg-blue-500/15 border-blue-500/30',           icon: '📊' },
  resource: { bg: 'bg-teal-500/15 border-teal-500/30',           icon: '📎' },
};

export function NotificationToast({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-md text-white text-sm font-medium shadow-xl pointer-events-auto ${s.bg}`}
          >
            <span>{t.icon ?? s.icon}</span>
            <span className="flex-1 text-xs">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="text-white/40 hover:text-white text-base leading-none">×</button>
          </div>
        );
      })}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (t: Omit<ToastItem, 'id'>, duration = 5000) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), duration);
  };

  const dismiss = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return { toasts, addToast, dismiss };
}
