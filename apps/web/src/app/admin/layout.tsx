'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminLoggedIn, clearAdminToken } from '@/lib/adminApi';

const NAV = [
  { section: null, items: [{ href: '/admin', label: 'Dashboard', icon: '📊', exact: true }] },
  {
    section: 'Users',
    items: [
      { href: '/admin/users', label: 'All Users', icon: '👥', exact: true },
      { href: '/admin/invitations', label: 'Invitations', icon: '✉️', exact: true },
    ],
  },
  {
    section: 'Licenses',
    items: [
      { href: '/admin/licenses', label: 'Inventory', icon: '🎫', exact: true },
      { href: '/admin/licenses/assigned', label: 'Assigned', icon: '✅', exact: true },
      { href: '/admin/licenses/history', label: 'History', icon: '📋', exact: true },
      { href: '/admin/licenses/transfer', label: 'Transfer', icon: '🔄', exact: true },
    ],
  },
  {
    section: 'Management',
    items: [
      { href: '/admin/webinars', label: 'Webinars', icon: '🎬', exact: true },
      { href: '/admin/roles', label: 'Roles & Perms', icon: '🛡️', exact: true },
    ],
  },
  {
    section: 'Logs',
    items: [
      { href: '/admin/logs/activity', label: 'Activity Logs', icon: '📜', exact: true },
      { href: '/admin/logs/email', label: 'Email Logs', icon: '📧', exact: true },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    if (!isAdminLoggedIn()) router.push('/admin/login');
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0a0b12', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-base" style={{ background: 'linear-gradient(135deg,#1d6fe8,#7c3aed)' }}>Z</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Zonvo Admin</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Enterprise Portal</p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV.map((section, si) => (
          <div key={si}>
            {section.section && (
              <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.18)' }}>
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive(item.href, item.exact)
                      ? 'text-white'
                      : 'hover:text-white/70'
                  }`}
                  style={isActive(item.href, item.exact) ? {
                    background: 'rgba(29,111,232,0.12)',
                    color: '#60a5fa',
                    border: '1px solid rgba(29,111,232,0.2)',
                  } : { color: 'rgba(255,255,255,0.35)' }}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#1d6fe8' }}>A</div>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>Info@aiclex.in</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>Super Admin</p>
          </div>
        </div>
        <button
          onClick={() => { clearAdminToken(); router.push('/admin/login'); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors"
          style={{ color: 'rgba(239,68,68,0.6)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#080910', color: 'white' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-52 flex-shrink-0 fixed top-0 bottom-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 z-50"><SidebarContent /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-52 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3"
          style={{ background: 'rgba(8,9,16,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {pathname.replace('/admin', '').replace(/\//g, ' › ').trim() || 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Live</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
