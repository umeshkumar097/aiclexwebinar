'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-5 hover:scale-[1.01] transition-all" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: color }}>{icon}</div>
      <p className="text-3xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{sub}</p>}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    live:      { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
    pending:   { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
    suspended: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
    deleted:   { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
    draft:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
    scheduled: { bg: 'rgba(29,111,232,0.15)',  text: '#60a5fa' },
    ended:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
  };
  const style = map[status] ?? { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
      style={{ background: style.bg, color: style.text }}
    >
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />}
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats().then((d) => setStats(d as Record<string, unknown>)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = [
    { icon: '👥', label: 'Active Users',     value: (stats?.totalUsers as number) ?? 0,        sub: `+${(stats?.todayRegistrations as number) ?? 0} today`,   color: 'linear-gradient(135deg,#1d6fe8,#4338ca)' },
    { icon: '🟢', label: 'Licensed Users',   value: (stats?.licensedUsers as number) ?? 0,      sub: 'Can host webinars',                                       color: 'linear-gradient(135deg,#059669,#047857)' },
    { icon: '🔵', label: 'Basic Users',      value: (stats?.basicUsers as number) ?? 0,         sub: 'No webinar license',                                      color: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
    { icon: '✉️', label: 'Pending Invites',  value: (stats?.pendingInvitations as number) ?? 0, sub: 'Awaiting acceptance',                                     color: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { icon: '🔴', label: 'Suspended',        value: (stats?.suspendedUsers as number) ?? 0,     sub: 'Access revoked',                                          color: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
    { icon: '📦', label: 'Total Licenses',   value: (stats?.totalLicenses as number) ?? 0,      sub: `${(stats?.assignedLicenses as number) ?? 0} assigned`,   color: 'linear-gradient(135deg,#d97706,#b45309)' },
    { icon: '🎬', label: 'Total Webinars',   value: (stats?.totalWebinars as number) ?? 0,      sub: `${(stats?.activeWebinars as number) ?? 0} live now`,     color: 'linear-gradient(135deg,#0891b2,#0e7490)' },
    { icon: '✨', label: "Today\'s Signups", value: (stats?.todayRegistrations as number) ?? 0, sub: 'New registrations',                                       color: 'linear-gradient(135deg,#db2777,#be185d)' },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
      </div>
    );

  const recentUsers = ((stats?.recentUsers as unknown[]) ?? []) as Record<string, unknown>[];
  const recentWebinars = ((stats?.recentWebinars as unknown[]) ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Zonvo Admin Portal · Real-time overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="text-emerald-400 text-xs font-semibold">All Systems Operational</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Users */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 className="text-white font-bold text-sm">Recent Signups</h2>
            <a href="/admin/users" className="text-xs hover:underline" style={{ color: '#60a5fa' }}>View all →</a>
          </div>
          {recentUsers.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No users yet</div>
          ) : (
            <div>
              {recentUsers.map((u) => (
                <div key={String(u.id)} className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1d6fe8,#7c3aed)' }}>
                      {String(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{String(u.name) || '—'}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{String(u.email)}</p>
                    </div>
                  </div>
                  <Badge status={String(u.status)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Webinars */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 className="text-white font-bold text-sm">Recent Webinars</h2>
            <a href="/admin/webinars" className="text-xs hover:underline" style={{ color: '#60a5fa' }}>View all →</a>
          </div>
          {recentWebinars.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No webinars yet</div>
          ) : (
            <div>
              {recentWebinars.map((w) => (
                <div key={String(w.id)} className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-white truncate">{String(w.title)}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {w.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Live'} · {Number(w.registeredCount) ?? 0} registered
                    </p>
                  </div>
                  <Badge status={String(w.status)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
