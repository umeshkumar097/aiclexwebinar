'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Video,
  Eye,
  Plus,
  ArrowRight,
  PlayCircle,
  Clock,
  BarChart3,
  Zap,
  Calendar,
  Radio,
} from 'lucide-react';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { webinarApi, type Webinar, type WebinarStats } from '@/lib/api';

const quickActions = [
  {
    id: 'action-create-webinar',
    label: 'Create Webinar',
    description: 'Launch a new semi-live webinar',
    icon: Video,
    href: '/dashboard/webinars/new',
    color: '#5271ff',
    bg: 'rgba(82, 113, 255, 0.1)',
  },
  {
    id: 'action-upload-recording',
    label: 'Upload Recording',
    description: 'Add pre-recorded video content',
    icon: PlayCircle,
    href: '/dashboard/webinars/new?step=recording',
    color: '#ff914d',
    bg: 'rgba(255, 145, 77, 0.1)',
  },
  {
    id: 'action-view-analytics',
    label: 'View Analytics',
    description: 'See your performance metrics',
    icon: BarChart3,
    href: '/dashboard/analytics',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function StatSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-100" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-16 rounded bg-slate-100" />
        <div className="h-3 w-28 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function WebinarRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-48 rounded bg-slate-100" />
        <div className="h-2.5 w-32 rounded bg-slate-100" />
      </div>
      <div className="h-5 w-16 rounded-full bg-slate-100" />
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  live:      { label: 'Live',      color: 'hsl(0 84% 70%)',    bg: 'hsl(0 84% 70% / 0.12)' },
  scheduled: { label: 'Scheduled', color: 'hsl(23 100% 65%)',   bg: 'rgba(255, 145, 77, 0.12)' },
  draft:     { label: 'Draft',     color: 'hsl(0 0% 55%)',     bg: 'hsl(0 0% 55% / 0.12)' },
  ended:     { label: 'Ended',     color: '#10b981',  bg: 'hsl(142 71% 45% / 0.12)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0 84% 60%)',    bg: 'hsl(0 84% 60% / 0.12)' },
};

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuthStore();
  const firstName = user?.email?.split('@')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [statsLoading, setStatsLoading] = useState(true);
  const [webinarsLoading, setWebinarsLoading] = useState(true);
  const [statsData, setStatsData] = useState<WebinarStats | null>(null);
  const [recentWebinars, setRecentWebinars] = useState<Webinar[]>([]);

  useEffect(() => {
    // Fetch stats
    webinarApi.stats()
      .then((data) => setStatsData(data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));

    // Fetch recent webinars
    webinarApi.list({ limit: 5 })
      .then((res) => setRecentWebinars(res.items))
      .catch(console.error)
      .finally(() => setWebinarsLoading(false));
  }, []);

  const stats = [
    {
      id: 'stat-total-webinars',
      label: 'Total Webinars',
      value: statsLoading ? null : String(statsData?.total ?? 0),
      change: null,
      icon: Video,
      color: '#5271ff',
      bg: 'rgba(82, 113, 255, 0.1)',
    },
    {
      id: 'stat-live-now',
      label: 'Live Now',
      value: statsLoading ? null : String(statsData?.live ?? 0),
      change: null,
      icon: Radio,
      color: 'hsl(0 84% 70%)',
      bg: 'hsl(0 84% 70% / 0.1)',
    },
    {
      id: 'stat-scheduled',
      label: 'Scheduled',
      value: statsLoading ? null : String(statsData?.scheduled ?? 0),
      change: null,
      icon: Calendar,
      color: '#ff914d',
      bg: 'rgba(255, 145, 77, 0.1)',
    },
    {
      id: 'stat-drafts',
      label: 'Drafts',
      value: statsLoading ? null : String(statsData?.draft ?? 0),
      change: null,
      icon: Eye,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Here&apos;s an overview of your webinar platform.
            </p>
          </div>

          <Link
            href="/dashboard/webinars/new"
            id="dashboard-create-webinar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white btn-glow flex-shrink-0 transition-all"
            style={{
              background: 'linear-gradient(135deg, #5271ff, #5271ff)',
            }}
          >
            <Plus className="w-4 h-4" />
            New Webinar
          </Link>
        </motion.div>

        {/* ─── Stats Grid ──────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {stats.map((stat) =>
            statsLoading ? (
              <StatSkeleton key={stat.id} />
            ) : (
              <div key={stat.id} id={stat.id} className="stat-card">
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: stat.bg }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  {stat.change !== null && (
                    <span
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: '#10b981' }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            )
          )}
        </motion.div>

        {/* ─── Main Content Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  id={action.id}
                  className="glass-card p-4 flex items-center gap-3 hover:border-primary/30 transition-all group"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: action.bg }}
                  >
                    <action.icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Webinars */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Webinars</h2>
              <Link
                href="/dashboard/webinars"
                id="view-all-webinars"
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass-card overflow-hidden">
              {webinarsLoading ? (
                <div className="divide-y divide-slate-200">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <WebinarRowSkeleton key={i} />
                  ))}
                </div>
              ) : recentWebinars.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(82, 113, 255, 0.1)' }}
                  >
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground">No webinars yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Create your first semi-live webinar and start reaching your audience.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/webinars/new"
                    id="empty-state-create-webinar"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-glow mt-2"
                    style={{
                      background: 'linear-gradient(135deg, #5271ff, #5271ff)',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create your first webinar
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {recentWebinars.map((w) => {
                    const st = STATUS_STYLES[w.status] ?? STATUS_STYLES.draft;
                    const scheduledLabel = w.scheduledAt
                      ? new Date(w.scheduledAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'No date set';
                    return (
                      <Link
                        key={w.id}
                        href={`/dashboard/webinars/${w.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                        style={{ textDecoration: 'none' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(82, 113, 255, 0.1)' }}
                        >
                          <Video className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {w.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {scheduledLabel}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── Onboarding Checklist ─────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div
            className="glass-card p-6"
            style={{
              background: '#ffffff',
              borderColor: 'rgba(82, 113, 255, 0.2)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(82, 113, 255, 0.1)' }}
              >
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Get started with Zonvo</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Complete these steps to set up your webinar platform.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Create your account', done: true, id: 'checklist-account' },
                    { label: 'Set up your organization', done: false, id: 'checklist-org' },
                    { label: 'Create your first webinar', done: (statsData?.total ?? 0) > 0, id: 'checklist-webinar' },
                    { label: 'Upload a recording', done: false, id: 'checklist-recording' },
                    { label: 'Go live for the first time', done: false, id: 'checklist-live' },
                    { label: 'Configure branding', done: false, id: 'checklist-branding' },
                  ].map((step) => (
                    <div
                      key={step.id}
                      id={step.id}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                        step.done ? 'opacity-60' : '',
                      )}
                      style={{ background: 'rgba(0,0,0,0.02)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: step.done
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(0,0,0,0.05)',
                          border: `1px solid ${step.done ? 'rgba(16, 185, 129, 0.5)' : 'rgba(0,0,0,0.1)'}`,
                        }}
                      >
                        {step.done && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="hsl(142 71% 55%)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={cn(
                          'font-medium',
                          step.done ? 'text-muted-foreground line-through' : 'text-foreground',
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
