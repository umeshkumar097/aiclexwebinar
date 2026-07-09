'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { webinarApi, type Webinar, type WebinarStats } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ─── Status Config ─────────────────────────────────────────────────────────────
type WebinarStatus = Webinar['status'];

const STATUS_CONFIG: Record<WebinarStatus, { label: string; color: string; bg: string; dot: string; pulse?: boolean }> = {
  draft:     { label: 'Draft',     color: '#6B7280',   bg: '#F3F4F6',        dot: '#D1D5DB' },
  scheduled: { label: 'Scheduled', color: '#0B5CFF',   bg: '#EFF4FF',        dot: '#0B5CFF' },
  live:      { label: 'Live Now',  color: '#059669',   bg: '#ECFDF5',        dot: '#10B981', pulse: true },
  ended:     { label: 'Ended',     color: '#6B7280',   bg: '#F3F4F6',        dot: '#D1D5DB' },
  cancelled: { label: 'Cancelled', color: '#DC2626',   bg: '#FEF2F2',        dot: '#EF4444' },
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

// ─── Webinar Row (Zoom table-row style) ────────────────────────────────────────
function WebinarRow({ webinar }: { webinar: Webinar }) {
  const s = STATUS_CONFIG[webinar.status];
  const attendees = webinar.status === 'ended' ? webinar.attendeeCount : webinar.registeredCount;

  return (
    <Link href={`/dashboard/webinars/${webinar.id}`} className="block">
      <div
        className="flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer"
        style={{ borderBottom: '1px solid #E5E7EB' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Title + mode */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1F2937' }}>
            {webinar.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {webinar.mode === 'semi_live' ? 'Semi-Live' : 'Fully Live'} &middot;{' '}
            {webinar.durationMinutes} min
          </p>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ color: s.color, background: s.bg }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${s.pulse ? 'animate-pulse' : ''}`}
              style={{ background: s.dot }}
            />
            {s.label}
          </span>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-sm w-40 text-right" style={{ color: '#6B7280' }}>
          <ClientDate iso={webinar.scheduledAt ?? webinar.createdAt} />
        </div>

        {/* Registrations */}
        <div className="flex-shrink-0 text-sm w-24 text-right" style={{ color: '#1F2937' }}>
          {attendees.toLocaleString()}
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            &nbsp;/ {webinar.maxAttendees.toLocaleString()}
          </span>
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#D1D5DB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ─── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse" style={{ borderBottom: '1px solid #E5E7EB' }}>
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded" style={{ background: '#E5E7EB' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#F3F4F6' }} />
      </div>
      <div className="h-6 w-20 rounded-full" style={{ background: '#F3F4F6' }} />
      <div className="h-3 w-32 rounded" style={{ background: '#F3F4F6' }} />
      <div className="h-3 w-16 rounded" style={{ background: '#F3F4F6' }} />
    </div>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'upcoming',   label: 'Upcoming' },
  { key: 'previous',  label: 'Previous' },
  { key: 'templates', label: 'Webinar Templates' },
  { key: 'polls',     label: 'Polls/Quizzes' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WebinarsPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
        webinarApi.list({ search: search || undefined }),
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

  // Client-side filtering
  const displayedWebinars = webinars.filter((w) => {
    if (w.settings?.isDeleted) return false;
    if (tab === 'upcoming') {
      return w.status === 'scheduled' || w.status === 'live' || w.status === 'draft';
    }
    if (tab === 'previous') {
      return w.status === 'ended' || w.status === 'cancelled';
    }
    return false; // templates / polls tabs — no real data yet
  });

  const isSpecialTab = tab === 'templates' || tab === 'polls';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold" style={{ color: '#1F2937' }}>
          Webinars
        </h1>
        <Link
          href="/dashboard/webinars/new"
          id="schedule-webinar-btn"
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white transition-all duration-150"
          style={{ background: '#0B5CFF' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#0A51E0')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0B5CFF')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule a Webinar
        </Link>
      </div>

      {/* ── White card wrapper ── */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>

        {/* ── Tabs ── */}
        <div
          className="flex items-end gap-0 px-5 overflow-x-auto"
          style={{ borderBottom: '1px solid #E5E7EB' }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: tab === t.key ? '#0B5CFF' : '#374151',
                borderBottom: tab === t.key ? '2px solid #0B5CFF' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Date filter row ── */}
        {!isSpecialTab && (
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{ borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}
          >
            <span className="text-sm" style={{ color: '#6B7280' }}>Time range:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              aria-label="Start date"
              className="text-sm px-3 py-1.5 rounded border transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                background: '#FFFFFF',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0B5CFF')}
              onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
            />
            <span className="text-sm" style={{ color: '#9CA3AF' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              aria-label="End date"
              className="text-sm px-3 py-1.5 rounded border transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                background: '#FFFFFF',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0B5CFF')}
              onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
            />

            {/* Search */}
            <div className="relative ml-auto">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: '#9CA3AF' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search webinars…"
                aria-label="Search webinars"
                className="text-sm pl-9 pr-4 py-1.5 rounded border w-52 transition-all"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#1F2937',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#0B5CFF')}
                onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
              />
            </div>
          </div>
        )}

        {/* ── Table Header ── */}
        {!isSpecialTab && (
          <div
            className="flex items-center gap-4 px-5 py-2.5"
            style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}
          >
            <div className="flex-1 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Topic</div>
            <div className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide w-24" style={{ color: '#6B7280' }}>Status</div>
            <div className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide w-40 text-right" style={{ color: '#6B7280' }}>Start Time</div>
            <div className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide w-24 text-right" style={{ color: '#6B7280' }}>Registrants</div>
            <div className="w-4" />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 text-sm" style={{ color: '#DC2626', background: '#FEF2F2' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => void loadData()} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* ── Content ── */}
        {isSpecialTab ? (
          <div className="py-20 text-center">
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {tab === 'templates' ? 'No webinar templates found.' : 'No polls or quizzes found.'}
            </p>
          </div>
        ) : loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : displayedWebinars.length === 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-20 px-6 text-center"
            >
              <svg className="w-12 h-12 mx-auto mb-4" style={{ color: '#D1D5DB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-sm mb-1" style={{ color: '#374151' }}>
                You do not have any {tab === 'upcoming' ? 'upcoming' : 'previous'} webinars.
              </p>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                To schedule a new webinar click{' '}
                <Link href="/dashboard/webinars/new" className="underline" style={{ color: '#0B5CFF' }}>
                  Schedule a Webinar
                </Link>
                .
              </p>
              <Link
                href="/dashboard/webinars/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white"
                style={{ background: '#0B5CFF' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#0A51E0')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0B5CFF')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule a Webinar
              </Link>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div>
            {displayedWebinars.map((webinar) => (
              <WebinarRow key={webinar.id} webinar={webinar} />
            ))}
          </div>
        )}
      </div>

      {/* ── Stats strip (below table) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Total Webinars', value: stats.total },
          { label: 'Live Now',       value: stats.live },
          { label: 'Scheduled',      value: stats.scheduled },
          { label: 'Drafts',         value: stats.draft },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-4"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#1F2937' }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
