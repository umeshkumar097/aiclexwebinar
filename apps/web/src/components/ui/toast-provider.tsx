'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Sparkles } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'upload';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/* ─── Context ────────────────────────────────────────────────────────────────── */
interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ─── Config per type ─────────────────────────────────────────────────────────── */
const CONFIG: Record<ToastType, {
  icon: React.ElementType;
  gradient: string;
  border: string;
  iconColor: string;
  badge: string;
}> = {
  success: {
    icon: CheckCircle2,
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)',
    border: 'rgba(16,185,129,0.35)',
    iconColor: '#10b981',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
  error: {
    icon: XCircle,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(185,28,28,0.06) 100%)',
    border: 'rgba(239,68,68,0.35)',
    iconColor: '#ef4444',
    badge: 'bg-red-500/20 text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(180,83,9,0.06) 100%)',
    border: 'rgba(245,158,11,0.35)',
    iconColor: '#f59e0b',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  info: {
    icon: Info,
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.06) 100%)',
    border: 'rgba(59,130,246,0.35)',
    iconColor: '#3b82f6',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  upload: {
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(202,138,4,0.06) 100%)',
    border: 'rgba(234,179,8,0.4)',
    iconColor: '#eab308',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
};

/* ─── Single Toast Item ──────────────────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 350);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const dur = toast.duration ?? 4500;
    const t = setTimeout(dismiss, dur);
    return () => clearTimeout(t);
  }, [dismiss, toast.duration]);

  return (
    <div
      style={{
        transform: visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: 'rgba(10, 12, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${cfg.border}`,
        borderRadius: '16px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow: 'hidden',
        marginBottom: '10px',
        minWidth: '320px',
        maxWidth: '400px',
        position: 'relative',
      }}
    >
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: cfg.gradient,
        borderRadius: '16px',
        pointerEvents: 'none',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${cfg.iconColor}, transparent)`,
        opacity: 0.7,
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
        {/* Icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${cfg.iconColor}22`,
          border: `1px solid ${cfg.iconColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={cfg.iconColor} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '14px', margin: 0, lineHeight: 1.4 }}>
            {toast.title}
          </p>
          {toast.message && (
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '3px 0 0', lineHeight: 1.5 }}>
              {toast.message}
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            width: '24px', height: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            color: '#64748b',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLElement).style.color = '#f8fafc';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLElement).style.color = '#64748b';
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'relative', height: '2px', background: 'rgba(255,255,255,0.05)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          background: `linear-gradient(90deg, ${cfg.iconColor}cc, ${cfg.iconColor})`,
          animation: `toast-progress ${toast.duration ?? 4500}ms linear forwards`,
          borderRadius: '0 0 16px 16px',
        }} />
      </div>

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ─── Provider ────────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-4), { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    toasts,
    toast: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
