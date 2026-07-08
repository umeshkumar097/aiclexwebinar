'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
  pending: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
  suspended: 'bg-red-400/15 text-red-400 border-red-400/25',
  deleted: 'bg-slate-400/15 text-slate-400 border-slate-400/25',
  live: 'bg-red-400/15 text-red-400 border-red-400/25',
  draft: 'bg-slate-400/15 text-slate-400 border-slate-400/25',
  scheduled: 'bg-blue-400/15 text-blue-400 border-blue-400/25',
  ended: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>Live</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-white/40 text-xs">{label}</p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? 'bg-slate-400/10 text-slate-400 border-slate-400/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />}
      {status}
    </span>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-2xl">Platform Overview</h1>
        <p className="text-white/40 text-sm mt-1">Real-time snapshot of your Zonvo platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Active Users" value={stats?.totalUsers ?? 0} icon="👥" color="bg-emerald-400/15 text-emerald-400 border-emerald-400/25" />
        <StatCard label="Pending Verification" value={stats?.pendingUsers ?? 0} icon="⏳" color="bg-amber-400/15 text-amber-400 border-amber-400/25" />
        <StatCard label="Total Webinars" value={stats?.totalWebinars ?? 0} icon="🎬" color="bg-blue-400/15 text-blue-400 border-blue-400/25" />
        <StatCard label="Live Sessions" value={stats?.activeWebinars ?? 0} icon="🔴" color="bg-red-400/15 text-red-400 border-red-400/25" />
        <StatCard label="Today's Signups" value={stats?.todayRegistrations ?? 0} icon="✨" color="bg-violet-400/15 text-violet-400 border-violet-400/25" />
      </div>

      {/* Bottom split */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">👥 Recent Signups</h2>
            <a href="/admin/users" className="text-[#1d6fe8] text-xs hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-white/5">
            {(stats?.recentUsers ?? []).map((u: any) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1d6fe8, #7c3aed)' }}>
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{u.name || '—'}</p>
                    <p className="text-white/40 text-xs">{u.email}</p>
                  </div>
                </div>
                <Badge status={u.status} />
              </div>
            ))}
            {!stats?.recentUsers?.length && (
              <div className="px-5 py-8 text-center text-white/30 text-sm">No users yet</div>
            )}
          </div>
        </div>

        {/* Recent Webinars */}
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">🎬 Recent Webinars</h2>
            <a href="/admin/webinars" className="text-[#1d6fe8] text-xs hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-white/5">
            {(stats?.recentWebinars ?? []).map((w: any) => (
              <div key={w.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-white text-sm font-medium truncate">{w.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {w.mode === 'semi_live' ? '🎬 Pre-recorded' : '📡 Live'} · {w.registeredCount} registrants
                  </p>
                </div>
                <Badge status={w.status} />
              </div>
            ))}
            {!stats?.recentWebinars?.length && (
              <div className="px-5 py-8 text-center text-white/30 text-sm">No webinars yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
