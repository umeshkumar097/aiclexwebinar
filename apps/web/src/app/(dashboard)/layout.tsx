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
  { id: 'nav-dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'nav-webinars', label: 'Webinars', href: '/dashboard/webinars', icon: Video },
  { id: 'nav-recordings', label: 'Recordings', href: '/dashboard/recordings', icon: FolderOpen },
  { id: 'nav-audience', label: 'Audience', href: '/dashboard/audience', icon: Users },
  { id: 'nav-analytics', label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];


const bottomNavItems: NavItem[] = [
  { id: 'nav-notifications', label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { id: 'nav-billing', label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { id: 'nav-settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function Sidebar({ onClose }: { onClose?: () => void }): React.ReactElement {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const firstName = user?.email?.split('@')[0] ?? 'User';
  const email = user?.email ?? '';

  return (
    <nav
      className="flex flex-col h-full"
      style={{
        background: 'hsl(var(--sidebar-bg))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
        width: '256px',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-5 border-b border-border/50">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))' }}
        >
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="font-bold text-white text-[15px]">Zonvo</span>
        {onClose && (
          <button
            id="close-sidebar"
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Organization Selector */}
      <div className="p-3">
        <button
          id="org-selector"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'hsl(262 83% 50%)' }}
          >
            Z
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-foreground truncate">My Organization</p>
            <p className="text-[10px] text-muted-foreground">Free Plan</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Main Nav */}
      <div className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full"
                  style={{ background: 'hsl(262 83% 67%)', color: 'white' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="px-3 py-2 space-y-0.5 border-t border-border/50">
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
          Help & Docs
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(262 83% 50%), hsl(217 91% 45%))' }}
            aria-hidden="true"
          >
            {getInitials(firstName.charAt(0), firstName.charAt(1) || 'Z')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{firstName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{email}</p>
          </div>
          <button
            id="logout-btn"
            onClick={() => void logout()}
            className="text-muted-foreground hover:text-destructive transition-colors"
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

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center gap-4 px-6 h-14 border-b border-border/50 flex-shrink-0"
          style={{ background: 'hsl(0 0% 5%)' }}
        >
          <button
            id="mobile-menu-btn"
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
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
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
            </Link>

            <Link
              href="/dashboard/settings"
              id="header-settings"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
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
          style={{ background: 'hsl(var(--background))' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
