'use client';

import { useState, useEffect, use } from 'react';
import { webinarApi, type PublicWebinar } from '@/lib/api';

function ClientDate({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!iso) return;
    setLabel(new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }));
  }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}

type State = 'loading' | 'form' | 'submitting' | 'success' | 'not_found';

export default function RegisterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const normalCode = code.toUpperCase();
  const [state, setState] = useState<State>('loading');
  const [webinar, setWebinar] = useState<PublicWebinar | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    webinarApi.getByCode(normalCode)
      .then((w) => { setWebinar(w); setState('form'); })
      .catch(() => setState('not_found'));
  }, [normalCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) { setFormError('Please enter your name.'); return; }
    if (!email.trim() || !email.includes('@')) { setFormError('Please enter a valid email.'); return; }
    setState('submitting');
    try {
      await webinarApi.registerAttendee(normalCode, name.trim(), email.trim());
      setState('success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed. Try again.');
      setState('form');
    }
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.origin + '/join/' + normalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === 'loading') return (
    <Shell webinar={null}>
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-10 h-10 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading webinar details...</p>
      </div>
    </Shell>
  );

  if (state === 'not_found' || !webinar) return (
    <Shell webinar={null}>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-foreground font-bold text-xl">Webinar Not Found</h2>
        <p className="text-muted-foreground text-sm">This link may be invalid or expired.</p>
      </div>
    </Shell>
  );

  if (state === 'success') return (
    <Shell webinar={webinar}>
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-foreground font-bold text-2xl mb-1">You&apos;re Registered! 🎉</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
            You&apos;ve successfully reserved your spot for <span className="text-foreground font-semibold">{webinar.title}</span>. A confirmation email is on its way!
          </p>
        </div>

        {/* Date & Time */}
        {webinar.scheduledAt && (
          <div className="w-full rounded-2xl px-4 py-3 text-center border"
            style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderColor: '#93c5fd' }}>
            <p className="text-[#1d6fe8] text-xs font-semibold uppercase tracking-wide mb-1">📅 Session Date & Time</p>
            <p className="text-foreground font-bold text-sm"><ClientDate iso={webinar.scheduledAt} /></p>
          </div>
        )}

        {/* Duration */}
        <div className="flex gap-3 w-full">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-center">
            <p className="text-[#1d6fe8] font-bold text-lg">{webinar.durationMinutes}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Minutes</p>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-center">
            <p className="text-[#1d6fe8] font-bold text-lg capitalize">{webinar.mode === 'semi_live' ? 'Pre-recorded' : 'Live'}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Format</p>
          </div>
        </div>

        {/* Join link */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
          <p className="text-muted-foreground text-xs mb-2 font-medium">🔗 Your Join Link</p>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-[#1d6fe8] font-mono text-xs truncate flex-1" suppressHydrationWarning>
              {typeof window !== 'undefined' ? window.location.origin + '/join/' + normalCode : '/join/' + normalCode}
            </span>
            <button suppressHydrationWarning onClick={copyLink}
              className="flex-shrink-0 text-xs px-3 py-1 rounded-lg transition-all font-medium"
              style={{ background: copied ? '#dcfce7' : '#eff6ff', color: copied ? '#16a34a' : '#1d6fe8', border: `1px solid ${copied ? '#86efac' : '#93c5fd'}` }}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <a href={`/join/${normalCode}?name=${encodeURIComponent(name)}`}
          className="w-full py-4 rounded-2xl text-sm font-bold text-white text-center block shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 8px 25px rgba(29,111,232,0.35)' }}>
          🚀 Join Now →
        </a>
        <p className="text-muted-foreground text-xs">Bookmark this page to join later.</p>
      </div>
    </Shell>
  );

  return (
    <Shell webinar={webinar}>
      {/* Form header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-xs font-semibold"
          style={{ background: '#eff6ff', color: '#1d6fe8', border: '1px solid #bfdbfe' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1d6fe8] animate-pulse" />
          Free Registration
        </div>
        <h1 className="text-foreground font-bold text-xl mb-2 leading-tight">{webinar.title}</h1>
        {webinar.description && (
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto line-clamp-3">{webinar.description}</p>
        )}
      </div>

      {/* Session details pills */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {webinar.scheduledAt && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
            <span className="text-xs">📅</span>
            <span className="text-[#1d6fe8] text-xs font-medium"><ClientDate iso={webinar.scheduledAt} /></span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
          <span className="text-xs">⏱</span>
          <span className="text-foreground text-xs font-medium">{webinar.durationMinutes} min</span>
        </div>
        {webinar.mode === 'fully_live' && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-xs font-semibold">LIVE</span>
          </div>
        )}
      </div>

      {/* Registration form */}
      <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
        <div>
          <label className="block text-foreground text-xs font-semibold mb-1.5">Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name" autoComplete="name"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-foreground placeholder-slate-400 focus:outline-none transition-all text-sm"
            style={{ boxShadow: 'none' }}
            onFocus={(e) => { e.target.style.borderColor = '#1d6fe8'; e.target.style.boxShadow = '0 0 0 3px rgba(29,111,232,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
        </div>
        <div>
          <label className="block text-foreground text-xs font-semibold mb-1.5">Email Address *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-foreground placeholder-slate-400 focus:outline-none transition-all text-sm"
            style={{ boxShadow: 'none' }}
            onFocus={(e) => { e.target.style.borderColor = '#1d6fe8'; e.target.style.boxShadow = '0 0 0 3px rgba(29,111,232,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
        </div>
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{formError}</p>
          </div>
        )}
        <button type="submit" disabled={state === 'submitting'}
          className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 8px 25px rgba(29,111,232,0.3)' }}>
          {state === 'submitting'
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering…</span>
            : '🎟 Reserve My Free Spot →'}
        </button>
        <p className="text-center text-muted-foreground text-xs">✉️ Confirmation email will be sent. No spam.</p>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 text-center">
        <p className="text-muted-foreground text-xs mb-1.5">Already registered?</p>
        <a href={`/join/${normalCode}`} className="text-[#1d6fe8] text-xs font-semibold hover:underline transition-all">
          Join directly with code →
        </a>
      </div>
    </Shell>
  );
}

// ─── Shell with optional thumbnail hero ─────────────────────────────────────
function Shell({ children, webinar }: { children: React.ReactNode; webinar: PublicWebinar | null }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #f0f6ff 0%, #f8faff 50%, #f0f4ff 100%)' }}>

      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-40"
          style={{ background: '#1d6fe8' }} />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20"
          style={{ background: '#d4af37' }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-start px-4 py-6 sm:py-10">
        {/* Logo */}
        <a href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)' }}>Z</div>
          <span className="text-foreground font-bold text-base">Zonvo Webinars</span>
        </a>

        <div className="w-full max-w-md">
          {/* Thumbnail hero */}
          {webinar?.thumbnailUrl && (
            <div className="relative w-full rounded-2xl overflow-hidden mb-5 shadow-2xl"
              style={{ aspectRatio: '16/9' }}>
              <img
                src={webinar.thumbnailUrl}
                alt={webinar.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-base leading-tight line-clamp-2">{webinar.title}</p>
              </div>
              {/* Live badge */}
              {webinar.status === 'live' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-[10px] font-bold tracking-widest">LIVE NOW</span>
                </div>
              )}
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-3xl p-7 shadow-2xl border border-slate-100" style={{ backdropFilter: 'blur(20px)' }}>
            {children}
          </div>
        </div>

        {/* Footer */}
        <p className="relative mt-6 text-muted-foreground text-xs text-center">
          Powered by <span className="font-semibold text-[#1d6fe8]">Zonvo</span> — Professional Webinar Platform
        </p>
      </div>
    </div>
  );
}
