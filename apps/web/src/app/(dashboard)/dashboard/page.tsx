'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Video,
  Eye,
  Plus,
  ArrowRight,
  PlayCircle,
  Clock,
  BarChart3,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const stats = [
  {
    id: 'stat-total-webinars',
    label: 'Total Webinars',
    value: '0',
    change: null,
    icon: Video,
    color: 'hsl(262 83% 67%)',
    bg: 'hsl(262 83% 67% / 0.1)',
  },
  {
    id: 'stat-total-registrations',
    label: 'Total Registrations',
    value: '0',
    change: null,
    icon: Users,
    color: 'hsl(217 91% 60%)',
    bg: 'hsl(217 91% 60% / 0.1)',
  },
  {
    id: 'stat-avg-watch-rate',
    label: 'Avg. Watch Rate',
    value: '—',
    change: null,
    icon: Eye,
    color: 'hsl(142 71% 45%)',
    bg: 'hsl(142 71% 45% / 0.1)',
  },
  {
    id: 'stat-total-watch-time',
    label: 'Total Watch Time',
    value: '—',
    change: null,
    icon: Clock,
    color: 'hsl(38 92% 50%)',
    bg: 'hsl(38 92% 50% / 0.1)',
  },
];

const quickActions = [
  {
    id: 'action-create-webinar',
    label: 'Create Webinar',
    description: 'Launch a new semi-live webinar',
    icon: Video,
    href: '/dashboard/webinars/new',
    color: 'hsl(262 83% 67%)',
    bg: 'hsl(262 83% 67% / 0.1)',
  },
  {
    id: 'action-upload-recording',
    label: 'Upload Recording',
    description: 'Add pre-recorded video content',
    icon: PlayCircle,
    href: '/dashboard/webinars/new?step=recording',
    color: 'hsl(217 91% 60%)',
    bg: 'hsl(217 91% 60% / 0.1)',
  },
  {
    id: 'action-view-analytics',
    label: 'View Analytics',
    description: 'See your performance metrics',
    icon: BarChart3,
    href: '/dashboard/analytics',
    color: 'hsl(142 71% 45%)',
    bg: 'hsl(142 71% 45% / 0.1)',
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

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuthStore();
  const firstName = user?.email?.split('@')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
              background: 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))',
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
          {stats.map((stat) => (
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
                    style={{ color: 'hsl(142 71% 55%)' }}
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
          ))}
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

            {/* Empty State */}
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'hsl(262 83% 67% / 0.1)' }}
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
                  background: 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))',
                }}
              >
                <Plus className="w-4 h-4" />
                Create your first webinar
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ─── Onboarding Checklist ─────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div
            className="glass-card p-6"
            style={{
              background:
                'linear-gradient(135deg, hsl(262 83% 67% / 0.06) 0%, hsl(217 91% 60% / 0.04) 100%)',
              borderColor: 'hsl(262 83% 67% / 0.2)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(262 83% 67% / 0.15)' }}
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
                    { label: 'Create your first webinar', done: false, id: 'checklist-webinar' },
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
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: step.done
                            ? 'hsl(142 71% 45% / 0.2)'
                            : 'hsl(0 0% 20%)',
                          border: `1px solid ${step.done ? 'hsl(142 71% 45% / 0.5)' : 'hsl(0 0% 30%)'}`,
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
