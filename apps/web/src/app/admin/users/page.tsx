'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type User = {
  id: string;
  name?: string;
  email: string;
  status: string;
  phone?: string;
  createdAt: string;
  license?: { name: string } | null;
};

type License = {
  id: string;
  name: string;
};

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    pending:   { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
    suspended: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
    deleted:   { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
  };
  const s = map[status] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

function LicenseBadge({ hasLicense }: { hasLicense: boolean }) {
  return hasLicense ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
      🟢 Licensed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}>
      🔵 Basic
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 z-10" style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TABS = ['All', 'Active', 'Suspended', 'Deleted'];
const LICENSE_FILTERS = ['All', 'Licensed', 'Basic'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('All');
  const [licenseFilter, setLicenseFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [showAssign, setShowAssign] = useState<{ userId: string; userName: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'viewer' });
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const LIMIT = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, licenseFilter, debouncedSearch]);

  const fetchUsers = () => {
    setLoading(true);
    const statusMap: Record<string, string> = { Active: 'active', Suspended: 'suspended', Deleted: 'deleted' };
    const licMap: Record<string, string> = { Licensed: 'licensed', Basic: 'basic' };
    adminApi.users
      .list({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        status: statusMap[tab] || undefined,
        license: licMap[licenseFilter] || undefined,
      })
      .then((d: { users?: User[]; total?: number } | User[]) => {
        if (Array.isArray(d)) {
          setUsers(d);
          setTotal(d.length);
        } else {
          setUsers((d as { users?: User[]; total?: number }).users ?? []);
          setTotal((d as { users?: User[]; total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, [page, debouncedSearch, tab, licenseFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    adminApi.licenses.list().then((d: License[] | { licenses?: License[] }) => {
      setLicenses(Array.isArray(d) ? d : (d as { licenses?: License[] }).licenses ?? []);
    }).catch(() => {});
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading(userId + '_status');
    try {
      await adminApi.users.updateStatus(userId, newStatus);
      setSuccess(`User ${newStatus} successfully`);
      fetchUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setActionLoading(userId + '_delete');
    try {
      await adminApi.users.delete(userId);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('invite');
    try {
      await adminApi.invitations.create(inviteForm);
      setSuccess('Invitation sent successfully');
      setShowInvite(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'viewer' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssign || !selectedLicenseId) return;
    setActionLoading('assign');
    try {
      await adminApi.licenses.assign(showAssign.userId, selectedLicenseId);
      setSuccess('License assigned successfully');
      setShowAssign(null);
      setSelectedLicenseId('');
      fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'white',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Alert */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 hover:opacity-70">&times;</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-4 hover:opacity-70">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Users</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{total.toLocaleString()} total users</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}
        >
          + Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={tab === t
                ? { background: '#1d6fe8', color: 'white' }
                : { color: 'rgba(255,255,255,0.4)' }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* License filter */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {LICENSE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setLicenseFilter(f)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={licenseFilter === f
                ? { background: 'rgba(29,111,232,0.4)', color: '#60a5fa' }
                : { color: 'rgba(255,255,255,0.4)' }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, padding: '8px 14px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">👥</span>
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['User', 'Status', 'License', 'Phone', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#1d6fe8,#7c3aed)' }}
                        >
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.name || '—'}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge status={u.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <LicenseBadge hasLicense={!!u.license} />
                        {u.license && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{u.license.name}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!u.license && (
                          <button
                            onClick={() => setShowAssign({ userId: u.id, userName: u.name || u.email })}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-80"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                          >
                            Assign
                          </button>
                        )}
                        {u.status === 'suspended' ? (
                          <button
                            onClick={() => handleStatusChange(u.id, 'active')}
                            disabled={actionLoading === u.id + '_status'}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-80"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                          >
                            Activate
                          </button>
                        ) : u.status === 'active' ? (
                          <button
                            onClick={() => handleStatusChange(u.id, 'suspended')}
                            disabled={actionLoading === u.id + '_status'}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-80"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}
                          >
                            Suspend
                          </button>
                        ) : null}
                        {u.status !== 'deleted' && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={actionLoading === u.id + '_delete'}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-80"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                          >
                            Delete
                          </button>
                        )}
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
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <Modal title="Invite User" onClose={() => setShowInvite(false)}>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Email *</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
                style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                <input
                  type="text"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder="John"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                <input
                  type="text"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder="Doe"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="viewer">Viewer</option>
                <option value="host">Host</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'invite'}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}
              >
                {actionLoading === 'invite' ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign License Modal */}
      {showAssign && (
        <Modal title={`Assign License to ${showAssign.userName}`} onClose={() => setShowAssign(null)}>
          <form onSubmit={handleAssignLicense} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Select License *</label>
              <select
                required
                value={selectedLicenseId}
                onChange={(e) => setSelectedLicenseId(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="">Choose a license…</option>
                {licenses.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssign(null)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'assign' || !selectedLicenseId}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
              >
                {actionLoading === 'assign' ? 'Assigning…' : 'Assign License'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
