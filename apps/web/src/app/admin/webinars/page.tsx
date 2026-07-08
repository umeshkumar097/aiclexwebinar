'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type Webinar = {
  id: string;
  title: string;
  status: string;
  mode: string;
  host?: { name?: string; email?: string };
  registeredCount?: number;
  attendeeCount?: number;
  createdAt: string;
};

type WebinarDetail = Webinar & {
  description?: string;
  scheduledAt?: string;
  endedAt?: string;
  registrants?: { email: string; name?: string; joinedAt?: string }[];
};

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    live:      { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
    draft:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
    scheduled: { bg: 'rgba(29,111,232,0.15)',  text: '#60a5fa' },
    ended:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
    deleted:   { bg: 'rgba(239,68,68,0.1)',    text: '#f87171' },
  };
  const s = map[status] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.text }}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />}
      {status}
    </span>
  );
}

function DetailModal({ webinarId, onClose }: { webinarId: string; onClose: () => void }) {
  const [webinar, setWebinar] = useState<WebinarDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.webinars.get(webinarId)
      .then((d) => setWebinar(d as WebinarDetail))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [webinarId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl z-10 overflow-hidden" style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-bold text-base">Webinar Details</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : !webinar ? (
          <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Failed to load</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-bold text-lg">{webinar.title}</p>
                {webinar.description && <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{webinar.description}</p>}
              </div>
              <Badge status={webinar.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mode', value: webinar.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Live' },
                { label: 'Host', value: webinar.host?.name || webinar.host?.email || '—' },
                { label: 'Registered', value: (webinar.registeredCount ?? 0).toLocaleString() },
                { label: 'Attended', value: (webinar.attendeeCount ?? 0).toLocaleString() },
                { label: 'Created', value: new Date(webinar.createdAt).toLocaleString() },
                { label: 'Scheduled', value: webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleString() : '—' },
                { label: 'Ended At', value: webinar.endedAt ? new Date(webinar.endedAt).toLocaleString() : '—' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
                  <p className="text-sm text-white">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Registrants */}
            {webinar.registrants && webinar.registrants.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Registrants ({webinar.registrants.length})
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  {webinar.registrants.slice(0, 15).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: i < Math.min(webinar.registrants!.length - 1, 14) ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#1d6fe8' }}>
                          {(r.name || r.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-white">{r.name || r.email}</p>
                          {r.name && <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{r.email}</p>}
                        </div>
                      </div>
                      {r.joinedAt && (
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(r.joinedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  ))}
                  {webinar.registrants.length > 15 && (
                    <div className="px-4 py-2 text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      +{webinar.registrants.length - 15} more registrants
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_FILTERS = ['All', 'Live', 'Scheduled', 'Ended', 'Draft'];
const LIMIT = 20;

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const fetchWebinars = () => {
    setLoading(true);
    adminApi.webinars
      .list({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        status: statusFilter === 'All' ? undefined : statusFilter.toLowerCase(),
      })
      .then((d: Webinar[] | { webinars?: Webinar[]; total?: number }) => {
        if (Array.isArray(d)) {
          setWebinars(d);
          setTotal(d.length);
        } else {
          setWebinars((d as { webinars?: Webinar[] }).webinars ?? []);
          setTotal((d as { total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchWebinars, [page, debouncedSearch, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete webinar "${title}"? This action cannot be undone.`)) return;
    setActionLoading(id);
    try {
      await adminApi.webinars.delete(id);
      setSuccess('Webinar deleted');
      fetchWebinars();
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(''); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 max-w-7xl">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <span>{error}</span><button onClick={() => setError('')}>&times;</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          <span>{success}</span><button onClick={() => setSuccess('')}>&times;</button>
        </div>
      )}

      <div>
        <h1 className="text-white font-black text-2xl">Webinars</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{total.toLocaleString()} total webinars</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-xl overflow-hidden w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={statusFilter === f ? { background: '#1d6fe8', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search webinars by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', outline: 'none', flex: 1 }}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : webinars.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">🎬</span>
            <p className="text-sm">No webinars found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Title', 'Host', 'Status', 'Mode', 'Registered', 'Attended', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {webinars.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => setDetailId(w.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white max-w-xs truncate">{w.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-white">{w.host?.name || '—'}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{w.host?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge status={w.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {w.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Live'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{(w.registeredCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{(w.attendeeCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailId(w.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80"
                          style={{ background: 'rgba(29,111,232,0.15)', color: '#60a5fa' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(w.id, w.title)}
                          disabled={actionLoading === w.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80 disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                        >
                          {actionLoading === w.id ? '…' : 'Delete'}
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

      {detailId && <DetailModal webinarId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
