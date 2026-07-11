'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { webinarApi, type PublicWebinar } from '@/lib/api';

// Default waiting room thumbnail
const DEFAULT_WAITING_THUMBNAIL = 'data:image/svg+xml,' + encodeURIComponent(`
<svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1d6fe8;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#1d6fe8;stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <ellipse cx="400" cy="225" rx="300" ry="200" fill="url(#glow)"/>
  <circle cx="400" cy="180" r="50" fill="none" stroke="#1d6fe8" stroke-width="2" opacity="0.5"/>
  <circle cx="400" cy="180" r="35" fill="none" stroke="#1d6fe8" stroke-width="1.5" opacity="0.7"/>
  <circle cx="400" cy="180" r="20" fill="#1d6fe8" opacity="0.8"/>
  <text x="400" y="270" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#0f172a" text-anchor="middle" opacity="0.9">Starting Soon</text>
  <text x="400" y="300" font-family="system-ui, sans-serif" font-size="14" fill="#0f172a" text-anchor="middle" opacity="0.4">The session is about to begin. Please wait.</text>
</svg>`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ClientDate({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!iso) return;
    setLabel(
      new Date(iso).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    );
  }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}

function Dots() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v % 3) + 1), 600);
    return () => clearInterval(t);
  }, []);
  return <span>{'.'.repeat(n)}</span>;
}

// ─── Page states ───────────────────────────────────────────────────────────────
type PageState =
  | 'loading'
  | 'not_found'
  | 'waiting'           // not live yet
  | 'waiting_room'      // live but waiting room ON — waiting for host approval
  | 'join_form'         // live, no waiting room — show join form
  | 'joining'
  | 'admitted'
  | 'rejected'
  | 'ended';

export default function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { code } = use(params);
  const { name: prefilledName } = use(searchParams);
  const normalCode = code.toUpperCase();
  const router = useRouter();
  const autoJoinDone = useRef(false);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [webinar, setWebinar] = useState<PublicWebinar | null>(null);

  const [displayName, setDisplayName] = useState(prefilledName ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [autoJoining, setAutoJoining] = useState(false);

  // Waiting Room state
  const [, setWaitingId] = useState<string | null>(null);
  const [waitingSubmitted, setWaitingSubmitted] = useState(false);
  const waitingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Do the actual room navigation ─────────────────────────────────────────
  const doJoin = useCallback(async (name: string, pw?: string) => {
    const result = await webinarApi.getAttendeeToken(normalCode, name, pw);
    const s = result.settings ?? {};

    if (result.mode === 'semi_live') {
      const watchUrl = new URL(`/join/${normalCode}/watch`, window.location.origin);
      watchUrl.searchParams.set('name', name);
      watchUrl.searchParams.set('videoUrl', result.videoUrl);
      watchUrl.searchParams.set('pos', String(result.currentPositionSeconds));
      watchUrl.searchParams.set('title', result.webinarTitle);
      watchUrl.searchParams.set('wid', result.webinarId);
      watchUrl.searchParams.set('host', result.webinarTitle); // host name for end screen
      watchUrl.searchParams.set('watermark', s.enableWatermark ? '1' : '0');
      watchUrl.searchParams.set('chat', s.enableChat !== false ? '1' : '0');
      watchUrl.searchParams.set('polls', s.enablePolls !== false ? '1' : '0');
      router.push(watchUrl.pathname + watchUrl.search);
    } else {
      // fully_live mode — pass MediaSoup credentials to room page
      const roomUrl = new URL(`/join/${normalCode}/room`, window.location.origin);
      roomUrl.searchParams.set('roomId', result.roomId);
      roomUrl.searchParams.set('peerId', result.peerId);
      roomUrl.searchParams.set('serverUrl', result.mediasoupServerUrl);
      roomUrl.searchParams.set('secret', result.mediasoupSecret);
      roomUrl.searchParams.set('name', name);
      if (result.webinarTitle) roomUrl.searchParams.set('title', result.webinarTitle);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hostName = (result as any).hostName;
      if (hostName) roomUrl.searchParams.set('hostName', hostName);
      roomUrl.searchParams.set('watermark', s.enableWatermark ? '1' : '0');
      roomUrl.searchParams.set('chat', s.enableChat !== false ? '1' : '0');
      roomUrl.searchParams.set('polls', s.enablePolls !== false ? '1' : '0');
      router.push(roomUrl.pathname + roomUrl.search);
    }
  }, [normalCode, router]);

  // ── Poll waiting room approval status ────────────────────────────────────
  const startWaitingPoll = useCallback((wid: string) => {
    if (waitingPollRef.current) clearInterval(waitingPollRef.current);
    waitingPollRef.current = setInterval(async () => {
      try {
        const res = await webinarApi.checkWaitingStatus(normalCode, wid);
        if (res.status === 'admitted') {
          clearInterval(waitingPollRef.current!);
          await doJoin(displayName, password || undefined);
        } else if (res.status === 'rejected') {
          clearInterval(waitingPollRef.current!);
          setPageState('rejected');
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [normalCode, displayName, password, doJoin]);

  // ── Fetch webinar status ──────────────────────────────────────────────────
  const fetchStatus = useCallback(async (silent = false) => {
    try {
      const w = await webinarApi.getByCode(normalCode);
      setWebinar(w);

      if (w.status === 'live') {
        if (pollRef.current) clearInterval(pollRef.current);

        // Check waiting room setting
        if (w.settings?.waitingRoom && !waitingSubmitted) {
          setPageState('waiting_room');
          return;
        }

        setPageState('join_form');

        // Auto-join if name was pre-filled from registration
        if (prefilledName && !autoJoinDone.current && !w.settings?.waitingRoom) {
          autoJoinDone.current = true;
          setAutoJoining(true);
          try {
            await doJoin(prefilledName.trim());
          } catch {
            setAutoJoining(false);
          }
        }
      } else if (w.status === 'ended' || w.status === 'cancelled') {
        if (pollRef.current) clearInterval(pollRef.current);
        setPageState('ended');
      } else {
        if (!silent) setPageState('waiting');
      }
    } catch {
      if (!silent) setPageState('not_found');
    }
  }, [normalCode, prefilledName, waitingSubmitted, doJoin]);

  useEffect(() => {
    void fetchStatus(false);
    pollRef.current = setInterval(() => void fetchStatus(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (waitingPollRef.current) clearInterval(waitingPollRef.current);
    };
  }, [fetchStatus]);

  // ── Join handler ──────────────────────────────────────────────────────────
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setFormError(null);
    setPageState('joining');

    try {
      await doJoin(displayName.trim(), password || undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join';
      if (msg.toLowerCase().includes('password')) {
        setFormError('Incorrect password. Please try again.');
      } else if (msg.toLowerCase().includes('not currently live')) {
        setFormError('Session not started yet. Please wait…');
        setPageState('waiting');
        if (!pollRef.current) {
          pollRef.current = setInterval(() => void fetchStatus(true), 5000);
        }
      } else {
        setFormError(msg);
        setPageState('join_form');
      }
    }
  };

  // ── Waiting Room submit ───────────────────────────────────────────────────
  const handleWaitingRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setFormError(null);

    try {
      const res = await webinarApi.joinWaitingRoom(normalCode, displayName.trim(), email || undefined);
      if (res.admitted) {
        // No waiting room enforced — proceed to join directly
        setPageState('joining');
        await doJoin(displayName.trim(), password || undefined);
      } else {
        setWaitingId(res.waitingId ?? null);
        setWaitingSubmitted(true);
        if (res.waitingId) startWaitingPoll(res.waitingId);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to request admission');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const thumbnailUrl = webinar?.settings?.waitingThumbnailUrl ?? webinar?.thumbnailUrl ?? DEFAULT_WAITING_THUMBNAIL;

  if (pageState === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-10 h-10 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Looking up webinar<Dots /></p>
        </div>
      </Shell>
    );
  }

  if (pageState === 'not_found') {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Webinar Not Found</h2>
          <p className="text-muted-foreground text-sm">
            Code <span className="font-mono font-bold text-foreground">{normalCode}</span> doesn&apos;t match any webinar.
          </p>
        </div>
      </Shell>
    );
  }

  if (pageState === 'ended') {
    return (
      <Shell webinar={webinar}>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">⏹</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Session Ended</h2>
          <p className="text-muted-foreground text-sm">This webinar has already ended. A replay may be available soon.</p>
        </div>
      </Shell>
    );
  }

  if (pageState === 'rejected') {
    return (
      <Shell webinar={webinar}>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">The host has not admitted you to this session.</p>
        </div>
      </Shell>
    );
  }

  // ── Waiting Room (live, host approval needed) ──
  if (pageState === 'waiting_room') {
    return (
      <Shell webinar={webinar} fullWidth>
        {/* Thumbnail banner */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 bg-slate-50 border border-slate-200">
          <img
            src={thumbnailUrl}
            alt="Waiting room"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_WAITING_THUMBNAIL; }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-xs font-semibold tracking-widest uppercase">Waiting Room</span>
            </div>
            <p className="text-white font-bold text-lg text-center">{webinar?.title}</p>
          </div>
        </div>

        {waitingSubmitted ? (
          // Submitted — polling
          <div className="text-center py-4">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-[#1d6fe8]/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-full h-full rounded-full bg-white border border-[#1d6fe8]/20 flex items-center justify-center text-2xl">⏳</div>
            </div>
            <h2 className="text-foreground font-bold text-base mb-1">Waiting for Host Approval</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Hi <span className="text-foreground">{displayName}</span>, the host will admit you shortly<Dots />
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse inline-block" />
              Checking every 3 seconds
            </div>
          </div>
        ) : (
          // Form
          <form onSubmit={(e) => void handleWaitingRoomSubmit(e)} className="space-y-3">
            <h2 className="text-foreground font-semibold text-center mb-1">Request to Join</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">The host uses a Waiting Room — fill in your details</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name *"
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional)"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all"
            />
            {webinar?.hasPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Webinar password 🔒"
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all"
              />
            )}
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                ⚠️ {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#1d6fe8] to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 text-white"
            >
              🚪 Request Admission
            </button>
          </form>
        )}
      </Shell>
    );
  }

  // ── Not-live waiting ──
  if (pageState === 'waiting') {
    return (
      <Shell webinar={webinar} fullWidth>
        {/* Thumbnail banner for "not started yet" */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 bg-slate-50 border border-slate-200">
          <img
            src={thumbnailUrl}
            alt="Starting soon"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_WAITING_THUMBNAIL; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-semibold tracking-widest uppercase">
                {webinar?.status === 'scheduled' ? 'Scheduled' : 'Not started yet'}
              </span>
            </div>
            <p className="text-white font-bold text-lg text-center">{webinar?.title}</p>
          </div>
        </div>

        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-[#1d6fe8]/10 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full bg-[#1d6fe8]/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            <div className="relative w-full h-full rounded-full bg-white border border-[#1d6fe8]/20 flex items-center justify-center text-3xl">⏳</div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">Waiting for Host</h2>
          <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
            The host hasn&apos;t started the session yet.<br />
            This page will automatically update when the webinar goes live.
          </p>

          {webinar?.scheduledAt && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-3 mb-5 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Scheduled for</p>
              <p className="text-foreground"><ClientDate iso={webinar.scheduledAt} /></p>
            </div>
          )}

          <p className="text-muted-foreground text-xs mb-2 text-center">Enter your name now so you&apos;re ready to join instantly</p>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all text-center"
          />
          {webinar?.hasPassword && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Webinar password 🔒"
              className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all text-center"
            />
          )}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse inline-block" />
            Checking every 5 seconds<Dots />
          </div>
        </div>
      </Shell>
    );
  }

  // ── Join Form (webinar is LIVE, no waiting room) ──
  return (
    <Shell webinar={webinar}>
      {autoJoining ? (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-foreground font-bold text-lg">Joining as {prefilledName}</p>
            <p className="text-muted-foreground text-sm mt-1">Connecting you to the live session…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold tracking-wide">SESSION IS LIVE</span>
            </div>
          </div>

          <h2 className="text-center text-foreground font-semibold mb-1">
            {pageState === 'joining' ? 'Joining…' : 'Join Live Session'}
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-5">
            {prefilledName ? `Welcome back, ${prefilledName}! Click below to join.` : 'Enter your name to join now'}
          </p>

          <form onSubmit={(e) => void handleJoin(e)} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name *"
              required
              disabled={pageState === 'joining'}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all disabled:opacity-50"
            />

            {webinar?.hasPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Webinar password 🔒"
                required
                disabled={pageState === 'joining'}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]/50 transition-all disabled:opacity-50"
              />
            )}

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                ⚠️ {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={pageState === 'joining' || !displayName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 text-white"
            >
              {pageState === 'joining' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining<Dots />
                </span>
              ) : (
                '🎙 Join Now'
              )}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

// ─── Shell wrapper ─────────────────────────────────────────────────────────────
function Shell({ children, webinar, fullWidth }: { children: React.ReactNode; webinar?: PublicWebinar | null; fullWidth?: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1d6fe8]/10 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full ${fullWidth ? 'max-w-lg' : 'max-w-md'}`}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#1d6fe8] flex items-center justify-center">
            <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-foreground font-bold text-lg">Zonvo</span>
        </div>

        {/* Webinar info header */}
        {webinar && !fullWidth && (
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 mb-4">
            <p className="text-muted-foreground text-xs mb-1 font-mono">#{webinar.joinCode}</p>
            <h1 className="text-foreground font-bold text-base leading-tight">{webinar.title}</h1>
            {webinar.description && (
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{webinar.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>⏱ {webinar.durationMinutes} min</span>
              <span>👥 {webinar.maxAttendees.toLocaleString()} max</span>
              {webinar.hasPassword && <span>🔒 Password protected</span>}
              {webinar.settings?.waitingRoom && <span>🚪 Waiting Room</span>}
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
          {children}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-4">
          Powered by <span className="text-blue-600/60">Zonvo</span>
        </p>
      </div>
    </div>
  );
}
