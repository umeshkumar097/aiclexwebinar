'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type Invitation = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  invitedByEmail?: string;
  expiresAt?: string;
  resendCount?: number;
};

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:   { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
    accepted:  { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    expired:   { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
    cancelled: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  };
  const s = map[status] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.text }}>
      {status}
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

const TABS = ['All', 'Pending', 'Accepted', 'Expired', 'Cancelled'];
const LIMIT = 20;

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

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'viewer' });
  const [actionLoading, setActionLoading] = useState('');

  const fetchInvitations = () => {
    setLoading(true);
    adminApi.invitations
      .list({ page, limit: LIMIT, status: tab === 'All' ? undefined : tab.toLowerCase() })
      .then((d: { invitations?: Invitation[]; total?: number } | Invitation[]) => {
        if (Array.isArray(d)) {
          setInvitations(d);
          setTotal(d.length);
        } else {
          setInvitations((d as { invitations?: Invitation[] }).invitations ?? []);
          setTotal((d as { total?: number }).total ?? 0);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(fetchInvitations, [page, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async (id: string) => {
    setActionLoading(id + '_resend');
    try {
      await adminApi.invitations.resend(id);
      setSuccess('Invitation resent');
      fetchInvitations();
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(''); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this invitation?')) return;
    setActionLoading(id + '_cancel');
    try {
      await adminApi.invitations.cancel(id);
      setSuccess('Invitation cancelled');
      fetchInvitations();
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(''); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('send');
    try {
      await adminApi.invitations.create(form);
      setSuccess('Invitation sent!');
      setShowModal(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'viewer' });
      fetchInvitations();
    } catch (err) { setError((err as Error).message); }
    finally { setActionLoading(''); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 max-w-7xl">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Invitations</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}
        >
          + Send Invite
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-xs font-semibold transition-all"
            style={tab === t ? { background: '#1d6fe8', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">✉️</span>
            <p className="text-sm">No invitations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Email', 'Name', 'Role', 'Status', 'Invited By', 'Expires', 'Resends', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 text-sm text-white">{inv.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {[inv.firstName, inv.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(29,111,232,0.12)', color: '#60a5fa' }}>
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.invitedByEmail || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.resendCount ?? 0}</td>
                    <td className="px-4 py-3">
                      {inv.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={actionLoading === inv.id + '_resend'}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80"
                            style={{ background: 'rgba(29,111,232,0.15)', color: '#60a5fa' }}
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancel(inv.id)}
                            disabled={actionLoading === inv.id + '_cancel'}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                          >
                            Cancel
                          </button>
                        </div>
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Send Invitation" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="John" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Doe" style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="viewer">Viewer</option>
                <option value="host">Host</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
              <button type="submit" disabled={actionLoading === 'send'}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}>
                {actionLoading === 'send' ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
