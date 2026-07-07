'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Users,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  ChevronDown,
  HelpCircle,
  FolderOpen,
  CreditCard,
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
  { id: 'nav-dashboard',  label: 'Dashboard',  href: '/dashboard',             icon: LayoutDashboard },
  { id: 'nav-webinars',   label: 'Webinars',   href: '/dashboard/webinars',    icon: Video },
  { id: 'nav-recordings', label: 'Recordings', href: '/dashboard/recordings',  icon: FolderOpen },
  { id: 'nav-audience',   label: 'Audience',   href: '/dashboard/audience',    icon: Users },
  { id: 'nav-analytics',  label: 'Analytics',  href: '/dashboard/analytics',   icon: BarChart3 },
];

const bottomNavItems: NavItem[] = [
  { id: 'nav-notifications', label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { id: 'nav-billing',       label: 'Billing',       href: '/dashboard/billing',       icon: CreditCard },
  { id: 'nav-settings',      label: 'Settings',      href: '/dashboard/settings',      icon: Settings },
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
        background: 'linear-gradient(180deg, #f0f6ff 0%, #f8faff 100%)',
        borderRight: '1px solid #1d6fe8',
        width: '256px',
        boxShadow: '2px 0 12px rgba(30, 64, 175, 0.06)',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-5" style={{ borderBottom: '1px solid #1d6fe8' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)' }}
        >
          <Zap className="w-4.5 h-4.5 text-white" fill="white" />
        </div>
        <div>
          <span className="font-bold text-[16px]" style={{ color: '#1e2433' }}>Zonvo</span>
          <p className="text-[10px]" style={{ color: '#64748b' }}>Webinar Platform</p>
        </div>
        {onClose && (
          <button
            id="close-sidebar"
            onClick={onClose}
            className="ml-auto lg:hidden transition-colors"
            style={{ color: '#94a3b8' }}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Organization */}
      <div className="p-3">
        <button
          id="org-selector"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
          style={{ background: 'rgba(30,64,175,0.05)', border: '1px solid #1d6fe8' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1d6fe8, #d4af37)' }}
          >
            Z
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold" style={{ color: '#1e2433' }}>My Organization</p>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>Free Plan</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
        </button>
      </div>

      {/* Main Nav */}
      <div className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Platform
        </p>

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
              className={cn('sidebar-item', isActive && 'active')}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {item.badge !== undefined && (
                <span
                  className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white"
                  style={{ background: '#1d6fe8' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="px-3 py-2 space-y-0.5" style={{ borderTop: '1px solid #1d6fe8' }}>
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              id={item.id}
              onClick={onClose}
              className={cn('sidebar-item', isActive && 'active')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/docs"
          id="nav-help"
          className="sidebar-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          Help &amp; Docs
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-3" style={{ borderTop: '1px solid #1d6fe8' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(30,64,175,0.04)', border: '1px solid #1d6fe8' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1d6fe8, #d4af37)' }}
            aria-hidden="true"
          >
            {getInitials(firstName.charAt(0), firstName.charAt(1) || 'Z')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#1e2433' }}>{firstName}</p>
            <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{email}</p>
          </div>
          <button
            id="logout-btn"
            onClick={() => void logout()}
            className="transition-colors p-1.5 rounded-lg hover:bg-red-50"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7ff' }}>
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
              style={{ background: 'rgba(30,64,175,0.2)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
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
          className="flex items-center gap-4 px-6 h-14 flex-shrink-0"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #1d6fe8',
            boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          }}
        >
          <button
            id="mobile-menu-btn"
            className="lg:hidden transition-colors"
            style={{ color: '#94a3b8' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              id="header-notifications"
              className="relative p-2 rounded-xl transition-all duration-200"
              style={{ color: '#64748b' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#d4af37';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 145, 77, 0.10)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#64748b';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
            </Link>

            <Link
              href="/dashboard/settings"
              id="header-settings"
              className="p-2 rounded-xl transition-all duration-200"
              style={{ color: '#64748b' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#1d6fe8';
                (e.currentTarget as HTMLElement).style.background = 'rgba(29, 111, 232, 0.10)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#64748b';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              aria-label="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          style={{ background: '#f4f7ff' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
