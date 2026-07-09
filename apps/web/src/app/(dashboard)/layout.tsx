'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  HelpCircle,
  FolderOpen,
  CreditCard,
  Zap,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '@/store/auth.store';
import { cn, getInitials } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  id: string;
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard',       label: 'Dashboard',       href: '/dashboard',             icon: LayoutDashboard },
  { id: 'nav-webinars',        label: 'Webinars',        href: '/dashboard/webinars',    icon: Video },
  { id: 'nav-recordings',      label: 'Recordings',      href: '/dashboard/recordings',  icon: FolderOpen },
  { id: 'nav-audience',        label: 'Audience',        href: '/dashboard/audience',    icon: Users },
  { id: 'nav-analytics',       label: 'Analytics',       href: '/dashboard/analytics',   icon: BarChart3 },
  { id: 'nav-settings',        label: 'Settings',        href: '/dashboard/settings',    icon: Settings },
  { id: 'nav-billing',         label: 'Billing',         href: '/dashboard/billing',     icon: CreditCard },
];

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
function Sidebar({ onClose }: { onClose?: () => void }): React.ReactElement {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const firstName = user?.email?.split('@')[0] ?? 'User';
  const email = user?.email ?? '';

  return (
    <nav
      className="flex flex-col h-full"
      style={{
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        width: '220px',
        flexShrink: 0,
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-5 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#0B5CFF' }}
        >
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="font-bold text-[18px] tracking-tight" style={{ color: '#1F2937' }}>
          Zonvo
        </span>
        {onClose && (
          <button
            id="close-sidebar"
            onClick={onClose}
            className="ml-auto lg:hidden"
            style={{ color: '#6B7280' }}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <div className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              id={item.id}
              onClick={onClose}
              className={cn('zoom-nav-item', isActive && 'active')}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {item.badge !== undefined && (
                <span
                  className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white"
                  style={{ background: '#0B5CFF' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom — Help + User */}
      <div style={{ borderTop: '1px solid #E5E7EB' }}>
        <Link
          href="/docs"
          id="nav-help"
          className="zoom-nav-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          Help &amp; Docs
        </Link>

        {/* User profile row */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 mx-2 mb-2 rounded-lg"
          style={{ background: '#F3F4F6' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: '#0B5CFF' }}
            aria-hidden="true"
          >
            {getInitials(firstName.charAt(0), firstName.charAt(1) || 'Z')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#1F2937' }}>{firstName}</p>
            <p className="text-[10px] truncate" style={{ color: '#6B7280' }}>{email}</p>
          </div>
          <button
            id="logout-btn"
            onClick={() => void logout()}
            className="transition-colors p-1 rounded"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─── Layout ──────────────────────────────────────────────────────────────── */
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Derive page title from pathname
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/webinars/new')) return 'Schedule a Webinar';
    if (pathname.startsWith('/dashboard/webinars')) return 'Webinars';
    if (pathname.startsWith('/dashboard/recordings')) return 'Recordings';
    if (pathname.startsWith('/dashboard/audience')) return 'Audience';
    if (pathname.startsWith('/dashboard/analytics')) return 'Analytics';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    if (pathname.startsWith('/dashboard/billing')) return 'Billing';
    if (pathname.startsWith('/dashboard/notifications')) return 'Notifications';
    return 'Dashboard';
  };

  const { user } = useAuthStore();
  const firstName = user?.email?.split('@')[0] ?? 'User';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F7F8FA' }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.3)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex lg:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center gap-4 px-6 flex-shrink-0"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            height: '60px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <button
            id="mobile-menu-btn"
            className="lg:hidden"
            style={{ color: '#6B7280' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page Title */}
          <h1
            className="text-[15px] font-semibold"
            style={{ color: '#1F2937' }}
          >
            {getPageTitle()}
          </h1>

          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notifications"
              id="header-notifications"
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                (e.currentTarget as HTMLElement).style.color = '#1F2937';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#6B7280';
              }}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>

            {/* User Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer"
              style={{ background: '#0B5CFF' }}
              aria-label={`User: ${firstName}`}
            >
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          style={{ background: '#F7F8FA' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
