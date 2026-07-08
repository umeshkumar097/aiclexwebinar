'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type HistoryEntry = {
  id: string;
  userEmail: string;
  licenseName: string;
  action: string;
  actorEmail?: string;
  createdAt: string;
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  assigned:         { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  removed:          { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  transferred_in:   { bg: 'rgba(29,111,232,0.15)',  text: '#60a5fa' },
  transferred_out:  { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
};

function ActionBadge({ action }: { action: string }) {
  const s = ACTION_COLORS[action] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.text }}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

const LIMIT = 30;

export default function LicenseHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = () => {
    setLoading(true);
    adminApi.licenses
      .history({ page, limit: LIMIT })
      .then((d: HistoryEntry[] | { history?: HistoryEntry[]; total?: number }) => {
        if (Array.isArray(d)) {
          setHistory(d);
          setTotal(d.length);
        } else {
          setHistory((d as { history?: HistoryEntry[] }).history ?? []);
          setTotal((d as { total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchHistory, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 max-w-7xl">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">License History</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Audit trail of all license changes</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(ACTION_COLORS).map(([action, style]) => (
            <span key={action} className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: style.bg, color: style.text }}>
              {action.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">📋</span>
            <p className="text-sm">No history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Date', 'User Email', 'License', 'Action', 'Actor'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{entry.userEmail}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(29,111,232,0.12)', color: '#60a5fa' }}>
                        {entry.licenseName}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ActionBadge action={entry.action} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{entry.actorEmail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
