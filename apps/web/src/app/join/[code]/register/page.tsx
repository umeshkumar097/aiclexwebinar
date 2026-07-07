'use client';

import { useState, useEffect, use } from 'react';
import { webinarApi, type PublicWebinar } from '@/lib/api';

function ClientDate({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!iso) return;
    setLabel(new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
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
    <Shell>
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading...</p>
      </div>
    </Shell>
  );

  if (state === 'not_found' || !webinar) return (
    <Shell>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-white font-bold text-xl">Webinar Not Found</h2>
        <p className="text-white/40 text-sm">This link may be invalid or expired.</p>
      </div>
    </Shell>
  );

  if (state === 'success') return (
    <Shell>
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl">✅</div>
        <div>
          <h2 className="text-white font-bold text-2xl mb-2">You&apos;re Registered!</h2>
          <p className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
            Successfully registered for <span className="text-white font-semibold">{webinar.title}</span>.
          </p>
        </div>
        {webinar.scheduledAt && (
          <div className="w-full bg-violet-500/10 border border-violet-500/20 rounded-2xl px-5 py-4 text-center">
            <p className="text-violet-400/70 text-xs mb-1">Scheduled for</p>
            <p className="text-white font-semibold text-sm"><ClientDate iso={webinar.scheduledAt} /></p>
          </div>
        )}
        <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4">
          <p className="text-white/40 text-xs mb-3">Use this link to join when it starts:</p>
          <div className="flex items-center gap-2 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2">
            <span className="text-violet-300 font-mono text-xs truncate flex-1" suppressHydrationWarning>
              {typeof window !== 'undefined' ? window.location.origin + '/join/' + normalCode : '/join/' + normalCode}
            </span>
            <button suppressHydrationWarning onClick={copyLink}
              className="flex-shrink-0 text-xs px-3 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-all font-medium">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <a href={`/join/${normalCode}?name=${encodeURIComponent(name)}`}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all text-center block shadow-lg shadow-violet-500/20">
          Join Now →
        </a>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-violet-400 text-xs font-semibold tracking-wide uppercase">Register for Free</span>
        </div>
        <h1 className="text-white font-bold text-xl mb-2 leading-tight">{webinar.title}</h1>
        {webinar.description && <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">{webinar.description}</p>}
        {webinar.scheduledAt && <p className="text-violet-400 text-xs mt-3 font-medium">📅 <ClientDate iso={webinar.scheduledAt} /></p>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg">{webinar.registeredCount.toLocaleString()}</p>
          <p className="text-white/40 text-xs mt-0.5">Registered</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg">{webinar.durationMinutes}<span className="text-sm font-normal text-white/50"> min</span></p>
          <p className="text-white/40 text-xs mt-0.5">Duration</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
        <div>
          <label className="block text-white/60 text-xs font-medium mb-1.5">Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name" autoComplete="name"
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all text-sm" />
        </div>
        <div>
          <label className="block text-white/60 text-xs font-medium mb-1.5">Email Address *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all text-sm" />
        </div>
        {formError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}
        <button type="submit" disabled={state === 'submitting'}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]">
          {state === 'submitting'
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering…</span>
            : '🎟 Reserve My Spot →'}
        </button>
        <p className="text-center text-white/20 text-xs">No spam. Reminder only.</p>
      </form>

      <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
        <p className="text-white/30 text-xs mb-2">Already have the code?</p>
        <a href={`/join/${normalCode}`} className="text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors">Join directly →</a>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-violet-600/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-indigo-600/6 rounded-full blur-[100px]" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <a href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/30">Z</div>
            <span className="text-white/60 font-semibold text-sm">Zonvo Webinars</span>
          </a>
        </div>
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
