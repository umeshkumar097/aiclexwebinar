'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminLoggedIn, clearAdminToken } from '@/lib/adminApi';

const NAV = [
  { href: '/admin', icon: '📊', label: 'Overview', exact: true },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/webinars', icon: '🎬', label: 'Webinars' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    if (!isAdminLoggedIn()) {
      router.push('/admin/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearAdminToken();
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-slate-950 text-white font-sans">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 border-r border-white/5 flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)' }}>Z</div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Zonvo</p>
              <p className="text-white/30 text-[10px]">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.href, item.exact)
                  ? 'bg-[#1d6fe8]/20 text-[#1d6fe8] border border-[#1d6fe8]/25'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-white/5">
            <div className="w-7 h-7 rounded-full bg-[#1d6fe8] flex items-center justify-center text-xs font-bold">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">Info@aiclex.in</p>
              <p className="text-[10px] text-white/30">Super Admin</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 bg-slate-900 border-r border-white/5 z-50">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)' }}>Z</div>
                <span className="text-white font-bold text-sm">Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.href, item.exact)
                      ? 'bg-[#1d6fe8]/20 text-[#1d6fe8]'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <span>{item.icon}</span>{item.label}
                </a>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-white/5">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-white font-semibold text-sm capitalize">
                {pathname === '/admin' ? 'Overview' : pathname.split('/').pop()}
              </p>
              <p className="text-white/30 text-xs">Zonvo Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/40 text-xs">System Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
