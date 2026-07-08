'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type User = {
  id: string;
  name?: string;
  email: string;
  license?: { name: string } | null;
};

function UserSelector({
  label,
  onSelect,
  selected,
}: {
  label: string;
  onSelect: (u: User | null) => void;
  selected: User | null;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      setLoading(true);
      adminApi.users.list({ search, limit: 8 })
        .then((d: User[] | { users?: User[] }) => {
          const list = Array.isArray(d) ? d : (d as { users?: User[] }).users ?? [];
          setResults(list);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelect = (u: User) => {
    onSelect(u);
    setSearch('');
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => { onSelect(null); setSearch(''); setResults([]); setOpen(false); };

  return (
    <div className="flex-1">
      <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</label>
      <div className="rounded-2xl p-4" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {selected ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1d6fe8,#7c3aed)' }}>
              {(selected.name || selected.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{selected.name || '—'}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.email}</p>
              {selected.license ? (
                <p className="text-xs mt-0.5" style={{ color: '#34d399' }}>🟢 {selected.license.name}</p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: '#60a5fa' }}>🔵 No license</p>
              )}
            </div>
            <button onClick={handleClear} className="text-xs hover:opacity-70" style={{ color: 'rgba(255,255,255,0.35)' }}>✕</button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', width: '100%', outline: 'none' }}
            />
            {loading && <span className="absolute right-3 top-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>…</span>}
            {open && results.length > 0 && (
              <div className="absolute top-full mt-1 w-full z-20 rounded-xl overflow-hidden" style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)' }}>
                {results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#1d6fe8' }}>
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white">{u.name || u.email}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.email}</p>
                    </div>
                    <div className="ml-auto">
                      {u.license
                        ? <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>Licensed</span>
                        : <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa' }}>Basic</span>
                      }
                    </div>
                  </button>
                ))}
              </div>
            )}
            {open && results.length === 0 && !loading && search && (
              <div className="absolute top-full mt-1 w-full z-20 rounded-xl px-4 py-3 text-sm" style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransferLicensePage() {
  const [fromUser, setFromUser] = useState<User | null>(null);
  const [toUser, setToUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canTransfer = fromUser && toUser && fromUser.id !== toUser.id && fromUser.license;

  const handleTransfer = async () => {
    if (!fromUser || !toUser) return;
    if (!confirm(`Transfer license "${fromUser.license?.name}" from ${fromUser.email} to ${toUser.email}?`)) return;
    setLoading(true);
    setError('');
    try {
      await adminApi.licenses.transfer(fromUser.id, toUser.id);
      setSuccess(`License successfully transferred to ${toUser.email}`);
      setFromUser(null);
      setToUser(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
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
        <h1 className="text-white font-black text-2xl">Transfer License</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Move a license from one user to another</p>
      </div>

      {/* Transfer Card */}
      <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-4 items-start">
          <UserSelector label="From User (has license)" onSelect={setFromUser} selected={fromUser} />

          {/* Arrow */}
          <div className="flex-shrink-0 mt-8 flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(29,111,232,0.1)', color: '#60a5fa', border: '1px solid rgba(29,111,232,0.2)' }}>
            →
          </div>

          <UserSelector label="To User (receives license)" onSelect={setToUser} selected={toUser} />
        </div>

        {/* Warning */}
        {fromUser && !fromUser.license && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
            ⚠️ The &quot;From&quot; user does not have a license to transfer.
          </div>
        )}

        {fromUser && toUser && fromUser.id === toUser.id && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            ✕ You cannot transfer a license to the same user.
          </div>
        )}

        <button
          onClick={handleTransfer}
          disabled={!canTransfer || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}
        >
          {loading ? 'Transferring…' : '🔄 Transfer License'}
        </button>

        {/* Instructions */}
        <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>How it works:</p>
          <ul className="space-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <li>1. Search and select the user who currently holds the license (From User)</li>
            <li>2. Search and select the user who should receive the license (To User)</li>
            <li>3. Click &quot;Transfer License&quot; to complete the transfer</li>
            <li>4. The From User loses their license; the To User receives it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
