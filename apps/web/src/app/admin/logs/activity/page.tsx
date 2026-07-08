'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type ActivityLog = {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  actorEmail?: string;
  actorIp?: string;
  createdAt: string;
};

function getActionColor(action: string): { bg: string; text: string } {
  if (action.startsWith('user.'))    return { bg: 'rgba(29,111,232,0.15)',  text: '#60a5fa' };
  if (action.startsWith('webinar.')) return { bg: 'rgba(124,58,237,0.15)',  text: '#a78bfa' };
  if (action.startsWith('auth.'))    return { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' };
  if (action.startsWith('license.')) return { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' };
  if (action.startsWith('admin.'))   return { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' };
  return { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
}

const LIMIT = 30;

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const fetchLogs = () => {
    setLoading(true);
    adminApi.logs
      .activity({ page, limit: LIMIT, action: debouncedSearch || undefined })
      .then((d: ActivityLog[] | { logs?: ActivityLog[]; total?: number }) => {
        if (Array.isArray(d)) {
          setLogs(d);
          setTotal(d.length);
        } else {
          setLogs((d as { logs?: ActivityLog[] }).logs ?? []);
          setTotal((d as { total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchLogs, [page, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT);

  const legendItems = [
    { prefix: 'user.*',    ...getActionColor('user.x') },
    { prefix: 'webinar.*', ...getActionColor('webinar.x') },
    { prefix: 'auth.*',    ...getActionColor('auth.x') },
    { prefix: 'license.*', ...getActionColor('license.x') },
    { prefix: 'admin.*',   ...getActionColor('admin.x') },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Activity Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{total.toLocaleString()} events recorded</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {legendItems.map((l) => (
            <span key={l.prefix} className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: l.bg, color: l.text }}>
              {l.prefix}
            </span>
          ))}
        </div>
      </div>

      <input
        type="text"
        placeholder="Filter by action (e.g. user.login, webinar.created)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', outline: 'none', width: '100%', maxWidth: '480px' }}
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">📜</span>
            <p className="text-sm">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Actor Email', 'IP Address'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const color = getActionColor(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: color.bg, color: color.text }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.resourceType || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {log.resourceId ? log.resourceId.slice(0, 12) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.actorEmail || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{log.actorIp || '—'}</td>
                    </tr>
                  );
                })}
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
