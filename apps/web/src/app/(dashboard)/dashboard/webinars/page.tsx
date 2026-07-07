'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { webinarApi, type Webinar, type WebinarStats } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ─── Status Config ─────────────────────────────────────────────────────────────
type WebinarStatus = Webinar['status'];

const STATUS_CONFIG: Record<WebinarStatus, { label: string; color: string; bg: string; dot: string; pulse?: boolean }> = {
  draft:     { label: 'Draft',     color: 'text-muted-foreground',   bg: 'bg-slate-100',        dot: 'bg-white/30' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400',   bg: 'bg-blue-500/10',    dot: 'bg-blue-400' },
  live:      { label: 'Live Now',  color: 'text-emerald-400',bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', pulse: true },
  ended:     { label: 'Ended',     color: 'text-muted-foreground',   bg: 'bg-slate-100',        dot: 'bg-white/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400',    bg: 'bg-red-500/10',     dot: 'bg-red-400' },
};

// ─── Date Formatting (client-only to avoid hydration mismatch) ─────────────────
function ClientDate({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!iso) { setLabel('—'); return; }
    setLabel(new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }));
  }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}

// ─── Webinar Card ──────────────────────────────────────────────────────────────
function WebinarCard({ webinar }: { webinar: Webinar }) {
  const s = STATUS_CONFIG[webinar.status];
  const attendees = webinar.status === 'ended' ? webinar.attendeeCount : webinar.registeredCount;
  const fillPct = webinar.maxAttendees > 0 ? Math.round((attendees / webinar.maxAttendees) * 100) : 0;

  return (
    <div className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-violet-500/30 hover:bg-slate-100 transition-all duration-200 cursor-pointer">
      {/* Mode badge */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {webinar.mode === 'semi_live' ? 'Semi-Live' : 'Fully Live'}
        </span>
        {webinar.status === 'live' && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-foreground font-semibold text-sm leading-snug mb-3 line-clamp-2">
        {webinar.title}
      </h3>

      {/* Status + Date */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${s.color} ${s.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
          {s.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {webinar.status === 'live' && 'Started '}
          <ClientDate iso={webinar.scheduledAt ?? webinar.createdAt} />
        </span>
      </div>

      {/* Attendee progress */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{webinar.status === 'ended' ? 'Total Attendees' : 'Registered'}</span>
          <span className="text-foreground font-medium">
            {attendees.toLocaleString()} / {webinar.maxAttendees.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              fillPct >= 90 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
              fillPct >= 60 ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
              'bg-gradient-to-r from-violet-600 to-violet-500'
            }`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{fillPct}% capacity</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {webinar.durationMinutes} min
        </div>
        <div className="flex items-center gap-2">
          {webinar.status === 'live' && (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              Join Live →
            </span>
          )}
          {webinar.status === 'draft' && (
            <span className="text-xs text-muted-foreground">Complete setup</span>
          )}
          <svg className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
      <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-slate-200 rounded mb-4" />
      <div className="h-1.5 bg-slate-200 rounded-full mb-4" />
      <div className="h-3 w-1/3 bg-slate-200 rounded" />
    </div>
  );
}

// ─── Filters ───────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'previous', label: 'Previous' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WebinarsPage() {
  const { isAuthenticated } = useAuthStore();
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [stats, setStats] = useState<WebinarStats>({ total: 0, live: 0, scheduled: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [listResult, statsResult] = await Promise.all([
        webinarApi.list({ search: search || undefined }), // Fetch all to filter client-side
        webinarApi.stats(),
      ]);
      setWebinars(listResult.items);
      setStats(statsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webinars');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Client-side filtering including soft-delete checks
  const displayedWebinars = webinars.filter((w) => {
    if (w.settings?.isDeleted) return false;

    if (filter === 'upcoming') {
      return w.status === 'scheduled' || w.status === 'live' || w.status === 'draft';
    }
    if (filter === 'previous') {
      return w.status === 'ended' || w.status === 'cancelled';
    }
    return true;
  });

  const statCards = [
    { label: 'Total Webinars', value: stats.total, icon: '📹', color: 'from-violet-500/10 to-indigo-500/10' },
    { label: 'Live Now',       value: stats.live,  icon: '🔴', color: 'from-emerald-500/10 to-teal-500/10' },
    { label: 'Upcoming',   value: stats.scheduled, icon: '📅', color: 'from-blue-500/10 to-cyan-500/10' },
    { label: 'Drafts',         value: stats.draft, icon: '📝', color: 'from-orange-500/10 to-amber-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webinars</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your semi-live and fully live webinars</p>
        </div>
        <Link
          href="/dashboard/webinars/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-foreground text-sm
            bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
            transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Webinar
        </Link>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border border-slate-200 rounded-2xl p-4`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                filter === f.key ? 'bg-slate-200 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search webinars…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder-white/30 focus:outline-none focus:border-violet-500/40 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => void loadData()} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayedWebinars.length === 0 ? (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-foreground font-medium mb-2">No webinars found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {filter !== 'upcoming' ? 'Try a different filter or' : 'Get started by'} creating a new webinar
            </p>
            <Link
              href="/dashboard/webinars/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first webinar
            </Link>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedWebinars.map((webinar) => (
            <Link key={webinar.id} href={`/dashboard/webinars/${webinar.id}`}>
              <WebinarCard webinar={webinar} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
