'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';

const STATUS_OPTS = ['', 'draft', 'scheduled', 'live', 'ended'];

const STATUS_COLOR: Record<string, string> = {
  live: 'bg-red-400/15 text-red-400 border-red-400/25',
  draft: 'bg-slate-400/15 text-slate-400 border-slate-400/25',
  scheduled: 'bg-blue-400/15 text-blue-400 border-blue-400/25',
  ended: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

function Badge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? 'bg-slate-400/10 text-slate-400 border-slate-400/15';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${cls}`}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      {status}
    </span>
  );
}

export default function AdminWebinarsPage() {
  const [webinars, setWebinars] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const fetchWebinars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.webinars.list({ page, limit, search: search || undefined, status: statusFilter || undefined });
      setWebinars(res.webinars ?? []);
      setTotal(res.total ?? 0);
    } catch { setWebinars([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { void fetchWebinars(); }, [fetchWebinars]);

  const openWebinar = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const w = await adminApi.webinars.get(id);
      setSelected(w);
    } catch { } finally { setDetailLoading(false); }
  };

  const deleteWebinar = async (id: string) => {
    if (!confirm('Delete this webinar? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await adminApi.webinars.delete(id);
      setSelected(null);
      void fetchWebinars();
    } catch { } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white font-bold text-2xl">Webinars</h1>
          <p className="text-white/40 text-sm mt-0.5">{total} total sessions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <span className="text-white/30 text-sm">🔍</span>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title…"
            className="bg-transparent text-white text-sm placeholder-white/25 focus:outline-none flex-1" />
          {search && <button onClick={() => { setSearch(''); setPage(1); }} className="text-white/30 hover:text-white text-xs">✕</button>}
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none appearance-none cursor-pointer">
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s} className="bg-slate-900">{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : webinars.length === 0 ? (
          <div className="py-20 text-center text-white/30 text-sm">No webinars found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/8">
                  {['Webinar', 'Mode', 'Status', 'Registrants', 'Attendees', 'Join Code', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {webinars.map((w) => (
                  <tr key={w.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-white text-sm font-medium max-w-xs truncate">{w.title}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {w.scheduledAt ? new Date(w.scheduledAt).toLocaleDateString('en-IN') : 'No schedule'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-white/60 text-xs">{w.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Fully Live'}</span>
                    </td>
                    <td className="px-5 py-3.5"><Badge status={w.status} /></td>
                    <td className="px-5 py-3.5 text-white/70 text-sm font-semibold">{w.registeredCount ?? 0}</td>
                    <td className="px-5 py-3.5 text-emerald-400 text-sm font-semibold">{w.attendeeCount ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <code className="bg-white/8 px-2 py-0.5 rounded-lg text-white/70 text-xs font-mono">{w.joinCode}</code>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => void openWebinar(w.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#1d6fe8]/15 text-[#1d6fe8] text-xs font-medium hover:bg-[#1d6fe8]/25 transition-colors border border-[#1d6fe8]/25">
                          Details
                        </button>
                        <button onClick={() => void deleteWebinar(w.id)}
                          disabled={actionLoading === w.id}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <p className="text-white/30 text-xs">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs disabled:opacity-30 hover:bg-white/10 transition-colors">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs disabled:opacity-30 hover:bg-white/10 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Webinar detail panel */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-white font-semibold">Webinar Details</h3>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selected && (
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h2 className="text-white font-bold text-lg">{selected.title}</h2>
                      {selected.description && <p className="text-white/40 text-sm mt-1">{selected.description}</p>}
                    </div>
                    <Badge status={selected.status} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Registrants', val: selected.registeredCount ?? 0, color: 'text-blue-400' },
                    { label: 'Attendees', val: selected.attendeeCount ?? 0, color: 'text-emerald-400' },
                    { label: 'Duration (min)', val: selected.durationMinutes ?? 60, color: 'text-violet-400' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Mode', val: selected.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Fully Live' },
                    { label: 'Join Code', val: selected.joinCode },
                    { label: 'Scheduled', val: selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString('en-IN') : '—' },
                    { label: 'Created', val: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN') : '—' },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">{m.label}</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{m.val}</p>
                    </div>
                  ))}
                </div>

                {/* Host */}
                {selected.host && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Host</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1d6fe8, #7c3aed)' }}>
                        {(selected.host.name || selected.host.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{selected.host.name || '—'}</p>
                        <p className="text-white/40 text-xs">{selected.host.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Registrants list */}
                {(selected.registrants?.length > 0 || selected.attendees?.length > 0) && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Registrants ({selected.registrants?.length ?? 0})</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {(selected.registrants ?? []).slice(0, 20).map((r: any) => (
                        <div key={r.id ?? r.email} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-white text-xs font-medium">{r.name}</p>
                            <p className="text-white/40 text-[10px]">{r.email}</p>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {(selected.attendees ?? []).some((a: any) => a.email === r.email) ? '✓ Attended' : 'Registered'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete */}
                <div className="pt-2 border-t border-white/8">
                  <button onClick={() => void deleteWebinar(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    🗑 Delete This Webinar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
