'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';

const STATUS_OPTS = ['', 'active', 'pending', 'suspended', 'deleted'];

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
  pending: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
  suspended: 'bg-red-400/15 text-red-400 border-red-400/25',
  deleted: 'bg-slate-400/15 text-slate-400 border-slate-400/25',
};

function Badge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? 'bg-slate-400/10 text-slate-400';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.users.list({ page, limit, search: search || undefined, status: statusFilter || undefined });
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const openUser = async (id: string) => {
    setDetailLoading(true);
    setSelectedUser(null);
    try {
      const u = await adminApi.users.get(id);
      setSelectedUser(u);
    } catch { } finally { setDetailLoading(false); }
  };

  const changeStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      await adminApi.users.updateStatus(id, status);
      void fetchUsers();
      if (selectedUser?.id === id) {
        setSelectedUser((u: any) => u ? { ...u, status } : u);
      }
    } catch { } finally { setActionLoading(null); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    setActionLoading(id + 'delete');
    try {
      await adminApi.users.delete(id);
      setSelectedUser(null);
      void fetchUsers();
    } catch { } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white font-bold text-2xl">Users</h1>
          <p className="text-white/40 text-sm mt-0.5">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <span className="text-white/30 text-sm">🔍</span>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
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
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-white/30 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/8">
                  {['User', 'Email', 'Status', 'Verified', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1d6fe8, #7c3aed)' }}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{u.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/60 text-sm">{u.email}</td>
                    <td className="px-5 py-3.5"><Badge status={u.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold ${u.emailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {u.emailVerified ? '✓ Yes' : '✕ No'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white/40 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => void openUser(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#1d6fe8]/15 text-[#1d6fe8] text-xs font-medium hover:bg-[#1d6fe8]/25 transition-colors border border-[#1d6fe8]/25">
                          Details
                        </button>
                        {u.status === 'active' ? (
                          <button onClick={() => void changeStatus(u.id, 'suspended')}
                            disabled={actionLoading === u.id + 'suspended'}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50">
                            Suspend
                          </button>
                        ) : u.status === 'suspended' ? (
                          <button onClick={() => void changeStatus(u.id, 'active')}
                            disabled={actionLoading === u.id + 'active'}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 disabled:opacity-50">
                            Activate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <p className="text-white/30 text-xs">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs disabled:opacity-30 hover:bg-white/10 transition-colors">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs disabled:opacity-30 hover:bg-white/10 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* User detail panel */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-white font-semibold">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedUser && (
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Avatar + basic */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1d6fe8, #7c3aed)' }}>
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{selectedUser.name || '—'}</p>
                    <p className="text-white/40 text-sm">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={selectedUser.status} />
                      {selectedUser.emailVerified
                        ? <span className="text-emerald-400 text-xs">✓ Email verified</span>
                        : <span className="text-amber-400 text-xs">⚠ Not verified</span>}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Phone', val: selectedUser.phone ?? '—' },
                    { label: 'Timezone', val: selectedUser.timezone ?? '—' },
                    { label: 'Webinars Hosted', val: selectedUser.webinarCount ?? 0 },
                    { label: 'Joined', val: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN') : '—' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">{item.label}</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{String(item.val)}</p>
                    </div>
                  ))}
                </div>

                {/* Their webinars */}
                {selectedUser.webinars?.length > 0 && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Recent Webinars</p>
                    <div className="space-y-1.5">
                      {selectedUser.webinars.slice(0, 5).map((w: any) => (
                        <div key={w.id} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
                          <p className="text-white text-xs font-medium truncate flex-1 pr-2">{w.title}</p>
                          <Badge status={w.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-white/8">
                  <p className="text-white/30 text-xs uppercase tracking-wider">Actions</p>
                  <div className="flex gap-2">
                    {selectedUser.status === 'active' ? (
                      <button onClick={() => void changeStatus(selectedUser.id, 'suspended')}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                        🔒 Suspend User
                      </button>
                    ) : selectedUser.status === 'suspended' ? (
                      <button onClick={() => void changeStatus(selectedUser.id, 'active')}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                        ✅ Activate User
                      </button>
                    ) : null}
                    {selectedUser.status !== 'deleted' && (
                      <button onClick={() => void deleteUser(selectedUser.id)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        🗑 Delete User
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
