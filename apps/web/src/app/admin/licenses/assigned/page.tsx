'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type Assignment = {
  id: string;
  user: { id: string; name?: string; email: string };
  license: { id: string; name: string };
  assignedByEmail?: string;
  assignedAt: string;
  expiresAt?: string;
  status: string;
};

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:  { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    expired: { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
    revoked: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  };
  const s = map[status] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

const LIMIT = 20;

export default function AssignedLicensesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const fetchData = () => {
    setLoading(true);
    adminApi.licenses
      .assignments({ page, limit: LIMIT, search: debouncedSearch || undefined })
      .then((d: Assignment[] | { assignments?: Assignment[]; total?: number }) => {
        if (Array.isArray(d)) {
          setAssignments(d);
          setTotal(d.length);
        } else {
          setAssignments((d as { assignments?: Assignment[] }).assignments ?? []);
          setTotal((d as { total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Remove license from ${userName}? They will lose hosting access.`)) return;
    setActionLoading(userId);
    try {
      await adminApi.licenses.remove(userId);
      setSuccess('License removed successfully');
      fetchData();
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Assigned Licenses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{total.toLocaleString()} assignments</p>
        </div>
        <a href="/admin/licenses" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ← Back to Inventory
        </a>
      </div>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', outline: 'none', width: '100%', maxWidth: '380px' }}
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">✅</span>
            <p className="text-sm">No assignments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['User', 'License', 'Assigned By', 'Assigned On', 'Expires', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1d6fe8,#7c3aed)' }}>
                          {(a.user.name || a.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{a.user.name || '—'}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(29,111,232,0.12)', color: '#60a5fa' }}>
                        {a.license.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.assignedByEmail || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(a.assignedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3"><Badge status={a.status} /></td>
                    <td className="px-4 py-3">
                      {a.status === 'active' && (
                        <button
                          onClick={() => handleRemove(a.user.id, a.user.name || a.user.email)}
                          disabled={actionLoading === a.user.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80 disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                        >
                          {actionLoading === a.user.id ? '…' : 'Remove'}
                        </button>
                      )}
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
    </div>
  );
}
