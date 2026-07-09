'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import type { Transport, Consumer } from 'mediasoup-client/types';
import { ChatTab }              from './components/ChatTab';
import { QnATab }               from './components/QnATab';
import { PollsTab }             from './components/PollsTab';
import { CTAPopup }             from './components/CTAPopup';
import { NotesPanel }           from './components/NotesPanel';
import { MoreMenu }             from './components/MoreMenu';
import { EmojiReactionsOverlay } from './components/EmojiReactions';
import { NotificationToast, useToasts } from './components/NotificationToast';
import { webinarApi } from '@/lib/api';
import type { ChatMsg, QnAQuestion, Poll, CTAData, HostEvent } from './components/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type SidePanelTab = 'chat' | 'qna' | 'polls' | 'notes' | 'more' | null;

// ─── Network quality bars (simple 1-4 bar display) ────────────────────────────
function NetBars({ quality }: { quality: 'good' | 'poor' | null }) {
  if (!quality) return null;
  const bars = quality === 'good' ? 4 : 2;
  const color = quality === 'good' ? 'bg-emerald-400' : 'bg-amber-400';
  return (
    <div className="flex items-end gap-0.5 h-4" title={`Network: ${quality}`}>
      {[1,2,3,4].map((b) => (
        <div
          key={b}
          className={`w-1 rounded-sm ${b <= bars ? color : 'bg-white/20'}`}
          style={{ height: `${b * 4}px` }}
        />
      ))}
    </div>
  );
}

// ─── Panel nav items ──────────────────────────────────────────────────────────
const PANEL_TABS = [
  { id: 'chat'  as const, icon: '💬', label: 'Chat'  },
  { id: 'qna'   as const, icon: '🙋', label: 'Q&A'   },
  { id: 'polls' as const, icon: '📊', label: 'Polls' },
  { id: 'notes' as const, icon: '📝', label: 'Notes' },
  { id: 'more'  as const, icon: '⋯',  label: 'More'  },
];

const REACTIONS = ['👍','❤️','😂','😮','👏','🔥'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendeeRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    name?: string;
    title?: string;
    watermark?: string;
    chat?: string;
    polls?: string;
    // MediaSoup params
    roomId?: string;
    peerId?: string;
    serverUrl?: string;
    secret?: string;
  }>;
}) {
  const { code }                    = use(params);
  const { name, title, watermark, chat, polls: pollsOpt, roomId, peerId, serverUrl, secret } = use(searchParams);

  const displayName  = name ?? 'Attendee';
  const webinarTitle = title ?? 'Live Webinar';

  // ── Refs ─────────────────────────────────────────────────────────────────
  const deviceRef    = useRef<Device | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const videoRef     = useRef<HTMLVideoElement>(null);
  const audioRef     = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollProducersRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef   = useRef<EventSource | null>(null);

  // ── Connection state ──────────────────────────────────────────────────────
  const [connState, setConnState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'>('connecting');
  const [hostOnline, setHostOnline]         = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [elapsed, setElapsed]               = useState(0);
  const [netQuality, setNetQuality]         = useState<'good' | 'poor' | null>(null);
  const [audioMuted, setAudioMuted]         = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidePanel, setSidePanel]         = useState<SidePanelTab>('chat');
  const [controlsVisible, setControls]    = useState(true);
  const [fullscreen, setFullscreen]       = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [sessionEnded, setSessionEnded]   = useState(false);

  // ── Features state ────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<ChatMsg[]>([]);
  const [pinnedId, setPinnedId]   = useState<string | undefined>();
  const [questions, setQuestions] = useState<QnAQuestion[]>([]);
  const [polls, setPolls]         = useState<Poll[]>([]);
  const [activeCTA, setActiveCTA] = useState<CTAData | null>(null);
  const [incomingRxn, setIncomingRxn] = useState<{ emoji: string; id: string } | null>(null);

  // ── Unread badges ─────────────────────────────────────────────────────────
  const [unread, setUnread] = useState({ chat: 0, qna: 0, polls: 0 });
  const prevLen = useRef(0);

  // ── Raise hand (F-032) ────────────────────────────────────────────────────
  const [handRaised, setHandRaised] = useState(false);
  const handTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Host announcement banner (F-036) ─────────────────────────────────────
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const annTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sidePanel !== 'chat' && messages.length > prevLen.current)
      setUnread((u) => ({ ...u, chat: u.chat + messages.length - prevLen.current }));
    prevLen.current = messages.length;
  }, [messages, sidePanel]);

  useEffect(() => {
    if (sidePanel === 'chat')  setUnread((u) => ({ ...u, chat: 0 }));
    if (sidePanel === 'qna')   setUnread((u) => ({ ...u, qna: 0 }));
    if (sidePanel === 'polls') setUnread((u) => ({ ...u, polls: 0 }));
  }, [sidePanel]);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const { toasts, addToast, dismiss } = useToasts();

  // ── Auto-hide controls ────────────────────────────────────────────────────
  const bumpControls = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3500);
  }, []);

  useEffect(() => {
    bumpControls();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [bumpControls]);

  // ── Fullscreen change ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── SSE host event stream ─────────────────────────────────────────────────
  useEffect(() => {
    if (!code || !displayName) return;

    const es = webinarApi.openEventStream(code, displayName);
    eventSourceRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const ev = JSON.parse(e.data as string) as HostEvent;

        if (ev.type === 'message') {
          setMessages((p) => [...p.slice(-199), {
            id: `${Date.now()}-${Math.random()}`,
            user: ev.user,
            message: ev.message,
            time: new Date(),
            isHost: ev.isHost,
          }]);
        } else if (ev.type === 'announcement') {
          const msg: ChatMsg = {
            id: `${Date.now()}-ann`,
            user: 'Host',
            message: `📢 ${ev.text}`,
            time: new Date(),
            isHost: true,
          };
          setMessages((p) => [...p.slice(-199), msg]);
          addToast({ type: 'info', message: `Announcement: ${ev.text}` });
          setAnnouncement(ev.text);
          if (annTimerRef.current) clearTimeout(annTimerRef.current);
          annTimerRef.current = setTimeout(() => setAnnouncement(null), 8000);
        } else if (ev.type === 'pin_message') {
          setPinnedId(ev.messageId);
        } else if (ev.type === 'reaction') {
          setIncomingRxn({ emoji: ev.emoji, id: `${Date.now()}-${Math.random()}` });
        } else if (ev.type === 'poll_start') {
          setPolls((p) => p.find((x) => x.id === ev.poll.id) ? p : [ev.poll, ...p]);
          setUnread((u) => ({ ...u, polls: u.polls + 1 }));
          addToast({ type: 'poll', message: `New poll: ${ev.poll.question}`, icon: '📊' });
        } else if (ev.type === 'poll_end') {
          setPolls((p) => p.map((x) => x.id === ev.pollId ? { ...x, closed: true } : x));
        } else if (ev.type === 'cta_show') {
          setActiveCTA(ev.cta);
          addToast({ type: 'offer', message: ev.cta.title, icon: '🎁' });
        } else if (ev.type === 'cta_hide') {
          setActiveCTA(null);
        } else if (ev.type === 'resource_add') {
          addToast({ type: 'resource', message: `New resource: ${ev.resource.name}`, icon: '📎' });
        } else if (ev.type === 'host_mute') {
          if (audioRef.current && !audioRef.current.muted) {
            audioRef.current.muted = true;
            setAudioMuted(true);
            addToast({ type: 'warning', message: 'Host has muted your audio', icon: '🔇' });
          }
        } else if (ev.type === 'session_end') {
          setSessionEnded(true);
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // SSE will auto-reconnect; no state change needed unless it's persistent
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, displayName]);

  // ── MediaSoup connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !peerId || !serverUrl || !secret) {
      setConnState('error');
      return;
    }

    let cancelled = false;
    const baseUrl = serverUrl.replace(/\/$/, '');

    const headers = { 'x-mediasoup-secret': secret };

    const connectMediaSoup = async () => {
      try {
        // ── Step 1: Get RTP capabilities ───────────────────────────────────
        const capRes = await fetch(`${baseUrl}/api/rooms/${roomId}/rtp-capabilities`, { headers });
        if (!capRes.ok) throw new Error(`RTP cap fetch failed: ${capRes.status}`);
        const { rtpCapabilities } = await capRes.json() as { rtpCapabilities: unknown };

        if (cancelled) return;

        // ── Step 2: Load device ────────────────────────────────────────────
        const device = new Device();
        deviceRef.current = device;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await device.load({ routerRtpCapabilities: rtpCapabilities as any });

        if (cancelled) return;

        // ── Step 3: Create recv transport ──────────────────────────────────
        const tRes = await fetch(`${baseUrl}/api/rooms/${roomId}/transports`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId, direction: 'recv', role: 'attendee' }),
        });
        if (!tRes.ok) throw new Error(`Transport create failed: ${tRes.status}`);
        const transportData = await tRes.json() as {
          id: string;
          iceParameters: unknown;
          iceCandidates: unknown;
          dtlsParameters: unknown;
          iceServers?: RTCIceServer[];
        };

        if (cancelled) return;

        // ── Step 4: Create recv transport in device ────────────────────────
        const transport = device.createRecvTransport({
          id: transportData.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          iceParameters: transportData.iceParameters as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          iceCandidates: transportData.iceCandidates as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dtlsParameters: transportData.dtlsParameters as any,
          iceServers: transportData.iceServers,
        });
        transportRef.current = transport;

        transport.on('connect', ({ dtlsParameters: dtls }, callback, errback) => {
          fetch(`${baseUrl}/api/rooms/${roomId}/transports/${transportData.id}/connect`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ dtlsParameters: dtls }),
          })
            .then(() => callback())
            .catch((err: Error) => errback(err));
        });

        transport.on('connectionstatechange', (state) => {
          if (cancelled) return;
          if (state === 'connected') {
            setNetQuality('good');
          } else if (state === 'failed' || state === 'disconnected') {
            setNetQuality('poor');
            addToast({ type: 'warning', message: 'Connection unstable — reconnecting…' });
          }
        });

        if (cancelled) return;
        setConnState('connected');

        // ── Step 5 & 6: Consume producers ──────────────────────────────────
        const consumeProducers = async () => {
          if (cancelled) return;
          try {
            const pRes = await fetch(`${baseUrl}/api/rooms/${roomId}/producers`, { headers });
            if (!pRes.ok) return;
            const { producers } = await pRes.json() as {
              producers: { id: string; kind: 'audio' | 'video'; appData?: Record<string, unknown> }[];
            };

            setParticipantCount(producers.length > 0 ? 1 : 0);

            for (const producer of producers) {
              if (consumersRef.current.has(producer.id)) continue; // already consuming

              const cRes = await fetch(
                `${baseUrl}/api/rooms/${roomId}/transports/${transportData.id}/consume`,
                {
                  method: 'POST',
                  headers: { ...headers, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    peerId,
                    producerId: producer.id,
                    rtpCapabilities: device.rtpCapabilities,
                  }),
                },
              );
              if (!cRes.ok) continue;

              const consumerData = await cRes.json() as {
                id: string;
                kind: 'audio' | 'video';
                rtpParameters: unknown;
                producerId: string;
              };

              if (cancelled) return;

              const consumer = await transport.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rtpParameters: consumerData.rtpParameters as any,
              });

              consumersRef.current.set(producer.id, consumer);

              // Resume the consumer on the server
              await fetch(
                `${baseUrl}/api/rooms/${roomId}/consumers/${consumer.id}/resume`,
                { method: 'POST', headers },
              ).catch(() => {/* best-effort */});

              // Attach track
              if (consumer.kind === 'video' && videoRef.current) {
                const stream = videoRef.current.srcObject instanceof MediaStream
                  ? videoRef.current.srcObject
                  : new MediaStream();
                stream.addTrack(consumer.track);
                videoRef.current.srcObject = stream;
                setHostOnline(true);
              } else if (consumer.kind === 'audio' && audioRef.current) {
                const stream = audioRef.current.srcObject instanceof MediaStream
                  ? audioRef.current.srcObject
                  : new MediaStream();
                stream.addTrack(consumer.track);
                audioRef.current.srcObject = stream;
              }

              consumer.on('trackended', () => {
                if (consumer.kind === 'video') setHostOnline(false);
                consumersRef.current.delete(producer.id);
              });
            }

            // Mark host as offline if no video producers
            const hasVideo = producers.some((p) => p.kind === 'video');
            if (!hasVideo) setHostOnline(false);

          } catch { /* ignore poll errors */ }
        };

        // Initial consume
        await consumeProducers();

        // Poll every 3 seconds to detect new producers / host joining late
        pollProducersRef.current = setInterval(() => {
          void consumeProducers();
        }, 3000);

      } catch (err) {
        if (!cancelled) {
          console.error('[MediaSoup] Connection error:', err);
          setConnState('error');
        }
      }
    };

    void connectMediaSoup();

    return () => {
      cancelled = true;
      if (pollProducersRef.current) clearInterval(pollProducersRef.current);
      // Close all consumers
      consumersRef.current.forEach((c) => { try { c.close(); } catch { /* ignore */ } });
      consumersRef.current.clear();
      // Close transport
      try { transportRef.current?.close(); } catch { /* ignore */ }
      transportRef.current = null;
      deviceRef.current = null;
      setHostOnline(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, peerId, serverUrl, secret]);

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (connState !== 'connected') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [connState]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Send chat via backend broadcast API (SSE fan-out) */
  const sendChat = useCallback(async (msg: string) => {
    const m: ChatMsg = {
      id: `${Date.now()}-${Math.random()}`,
      user: displayName,
      message: msg,
      time: new Date(),
      isMe: true,
    };
    setMessages((p) => [...p.slice(-199), m]);
    try {
      await webinarApi.sendChat(code, displayName, msg);
    } catch { /* fire-and-forget */ }
  }, [displayName, code]);

  const sendReaction = useCallback((emoji: string) => {
    setIncomingRxn({ emoji, id: `${Date.now()}-${Math.random()}` });
  }, []);

  const sendQuestion = useCallback((q: string) => {
    const question: QnAQuestion = {
      id: `${Date.now()}-${Math.random()}`,
      user: displayName,
      question: q,
      time: new Date(),
      upvotes: 0,
    };
    setQuestions((p) => [...p, question]);
  }, [displayName]);

  const upvoteQuestion = useCallback((id: string) => {
    setQuestions((p) => p.map((q) => q.id === id && !q.hasUpvoted ? { ...q, upvotes: q.upvotes + 1, hasUpvoted: true } : q));
  }, []);

  const votePoll = useCallback((pollId: string, optionId: string) => {
    setPolls((p) => p.map((poll) =>
      poll.id === pollId
        ? { ...poll, myVote: optionId, totalVotes: poll.totalVotes + 1,
            options: poll.options.map((o) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o) }
        : poll,
    ));
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await videoRef.current.requestPictureInPicture().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  }, []);

  const togglePanel = useCallback((tab: SidePanelTab) => {
    setSidePanel((prev) => (prev === tab ? null : tab));
  }, []);

  const handleMoreAction = useCallback((action: string) => {
    if (action === 'notes') { setSidePanel('notes'); return; }
    if (action === 'leave') { window.history.back(); }
  }, []);

  // F-032: Raise / lower hand
  const toggleRaiseHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    // Auto-lower after 30 seconds
    if (handTimeoutRef.current) clearTimeout(handTimeoutRef.current);
    if (next) {
      handTimeoutRef.current = setTimeout(() => setHandRaised(false), 30000);
    }
  }, [handRaised]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (handTimeoutRef.current) clearTimeout(handTimeoutRef.current);
      if (annTimerRef.current) clearTimeout(annTimerRef.current);
    };
  }, []);

  // ── Leave handler ─────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    if (pollProducersRef.current) clearInterval(pollProducersRef.current);
    consumersRef.current.forEach((c) => { try { c.close(); } catch { /* ignore */ } });
    consumersRef.current.clear();
    try { transportRef.current?.close(); } catch { /* ignore */ }
    eventSourceRef.current?.close();
    window.history.back();
  }, []);

  // ── Session ended overlay (host ended the webinar) ───────────────────────
  if (sessionEnded) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0a0a14 0%, #08080f 100%)' }}>
        <div className="flex flex-col items-center gap-5 px-6 text-center max-w-sm w-full">
          <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-3xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 0 60px rgba(29,111,232,0.4)' }}>
            {webinarTitle.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Presented by</p>
            <h2 className="text-white font-bold text-2xl mb-1">{webinarTitle}</h2>
            <p className="text-white/60 text-sm">The session has ended. Thank you for attending!</p>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center w-full">
            <p className="text-white/40 text-xs mb-1">Session duration</p>
            <p className="text-white font-bold font-mono text-2xl">{fmt(elapsed)}</p>
          </div>
          <a href={`/join/${code}`}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white text-center transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 8px 30px rgba(29,111,232,0.4)' }}>
            ← Back to Session Page
          </a>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (!roomId || connState === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-foreground font-medium mb-1">Could not join the session</p>
          <p className="text-muted-foreground text-sm mb-5">Your link may have expired or the server is unavailable</p>
          <a href={`/join/${code}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1d6fe8] hover:bg-[#1d6fe8] transition-colors">
            ← Rejoin
          </a>
        </div>
      </div>
    );
  }

  const panelOpen = sidePanel !== null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col overflow-hidden select-none"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
      onClick={bumpControls}
    >
      {/* Hidden audio */}
      <audio ref={audioRef} autoPlay className="hidden" muted={audioMuted} />

      {/* Dynamic Watermark */}
      {watermark === '1' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 select-none z-50">
          <div className="absolute top-1/4 left-1/4 rotate-[-30deg] transform">
            <p className="text-3xl font-bold text-muted-foreground tracking-widest">{displayName}</p>
            <p className="text-sm font-mono text-muted-foreground">{new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="absolute bottom-1/4 right-1/4 rotate-[-30deg] transform">
            <p className="text-3xl font-bold text-muted-foreground tracking-widest">{displayName}</p>
            <p className="text-sm font-mono text-muted-foreground">{new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismiss} />

      {/* ── Main row ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ VIDEO STAGE ════ */}
        <div className="flex-1 relative bg-black overflow-hidden flex flex-col">

          {/* F-036: Host Announcement Banner */}
          {announcement && (
            <div className="flex-shrink-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 backdrop-blur-sm border-b border-blue-200 px-4 py-2.5 flex items-center gap-3 z-40">
              <span className="text-xl flex-shrink-0">📢</span>
              <p className="text-foreground text-sm font-medium flex-1 leading-snug">{announcement}</p>
              <button
                onClick={() => setAnnouncement(null)}
                className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0 transition-colors"
              >✕</button>
            </div>
          )}

          {/* Video area (fills remaining space) */}
          <div className="flex-1 relative overflow-hidden">

          {/* Emoji float layer */}
          <EmojiReactionsOverlay incoming={incomingRxn} />

          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${hostOnline ? 'opacity-100' : 'opacity-0 absolute'}`}
          />

          {/* Waiting for host */}
          {!hostOnline && connState === 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
              <div className="relative w-24 h-24 mb-5">
                <div className="absolute inset-0 rounded-full bg-blue-50 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="relative w-full h-full rounded-full bg-white border border-blue-200 flex items-center justify-center text-4xl">🎙</div>
              </div>
              <p className="text-muted-foreground font-semibold">{webinarTitle}</p>
              <p className="text-muted-foreground text-sm mt-1">Waiting for host to start camera…</p>
            </div>
          )}

          {/* Connecting */}
          {connState === 'connecting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
              <div className="w-10 h-10 border-2 border-[#1d6fe8] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground text-sm">Joining live session…</p>
            </div>
          )}

          {/* Reconnecting dim */}
          {connState === 'reconnecting' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-amber-400 text-sm font-medium">Reconnecting…</p>
              </div>
            </div>
          )}

          {/* ── ALWAYS-VISIBLE: Leave button ── */}
          <div className="absolute top-3 left-3 z-30 pointer-events-auto">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm border border-slate-200 text-foreground hover:text-foreground hover:bg-red-500/20 hover:border-red-500/30 transition-all text-xs font-medium"
            >
              <span>←</span>
              <span>Leave</span>
            </button>
          </div>

          {/* ── Controls overlay (auto-hide) ── */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Top gradient bar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/75 via-black/30 to-transparent pt-3 pb-12 px-4 pointer-events-auto">
              <div className="flex items-center justify-between">
                {/* Left: Network */}
                <div className="flex items-center gap-2">
                  <NetBars quality={netQuality} />
                  {connState === 'reconnecting' && (
                    <span className="text-amber-400 text-xs font-medium animate-pulse">⚡ Reconnecting</span>
                  )}
                </div>

                {/* Right: Live badge + count */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-xl px-2.5 py-1 border border-slate-200">
                    <span className="text-xs">👥</span>
                    <span className="text-white text-xs font-semibold">{participantCount + 1}</span>
                  </div>
                  {connState === 'connected' && (
                    <div className="flex items-center gap-1.5 bg-red-600/80 backdrop-blur-sm rounded-xl px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-[10px] font-bold tracking-wide">LIVE</span>
                      <span className="text-white/80 text-[10px] font-mono">{fmt(elapsed)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom gradient controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-16 pb-4 px-4 pointer-events-auto">
              <div className="flex items-center justify-between">
                {/* Audio toggle */}
                <button
                  onClick={() => { if (audioRef.current) { audioRef.current.muted = !audioRef.current.muted; setAudioMuted((v) => !v); } }}
                  className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  title={audioMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {audioMuted ? '🔇' : '🔊'}
                </button>

                {/* Title */}
                <p className="text-foreground text-xs font-medium truncate max-w-[38%] text-center">{webinarTitle}</p>

                {/* PiP + Fullscreen */}
                <div className="flex items-center gap-1.5">
                  {'pictureInPictureEnabled' in document && hostOnline && (
                    <button
                      onClick={() => void togglePiP()}
                      className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-foreground hover:bg-white/10 transition-colors text-sm"
                      title="Picture-in-Picture"
                    >⧉</button>
                  )}
                  <button
                    onClick={() => void toggleFullscreen()}
                    className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-foreground hover:bg-white/10 transition-colors text-sm"
                    title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {fullscreen ? '⛶' : '⛶'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>{/* end video area */}

          {/* ── F-031 + F-032: Reactions + Raise Hand bottom bar ── */}
          <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-2.5 flex items-center gap-2 z-20">
            {/* Emoji reactions (F-031) */}
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mr-1">React</span>
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-xl hover:scale-125 active:scale-110 transition-transform hover:-translate-y-1 duration-150 select-none"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* F-032: Raise Hand */}
            <button
              onClick={toggleRaiseHand}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                handRaised
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                  : 'bg-white border-slate-200 text-muted-foreground hover:text-foreground hover:bg-white/[0.08]'
              }`}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <span className="text-base">✋</span>
              <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>
          </div>
        </div>

        {/* ════ DESKTOP SIDE PANEL ════ */}
        {panelOpen && (
          <div className="hidden md:flex w-[300px] xl:w-80 border-l border-slate-200 bg-white flex-col flex-shrink-0 overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-slate-200 flex-shrink-0">
              {PANEL_TABS.map((t) => {
                if (t.id === 'chat' && chat === '0') return null;
                if (t.id === 'polls' && pollsOpt === '0') return null;

                const count = t.id === 'chat' ? unread.chat : t.id === 'qna' ? unread.qna : t.id === 'polls' ? unread.polls : 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => togglePanel(t.id)}
                    className={`relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                      sidePanel === t.id ? 'text-[#1d6fe8] border-b-2 border-[#1d6fe8]' : 'text-muted-foreground hover:text-muted-foreground'
                    }`}
                  >
                    <span className="text-sm">{t.icon}</span>
                    <span>{t.label}</span>
                    {count > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-foreground text-[8px] flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {sidePanel === 'chat'  && <ChatTab  messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => sendReaction(e)} displayName={displayName} pinnedId={pinnedId} />}
              {sidePanel === 'qna'   && <QnATab   questions={questions} onAsk={(q) => sendQuestion(q)} onUpvote={upvoteQuestion} displayName={displayName} />}
              {sidePanel === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => votePoll(pid, oid)} />}
              {sidePanel === 'notes' && <NotesPanel webinarCode={code} />}
              {sidePanel === 'more'  && <MoreMenu onSelect={handleMoreAction} />}
            </div>
          </div>
        )}
      </div>

      {/* ════ MOBILE BOTTOM NAV ════ */}
      <div className="md:hidden flex items-stretch border-t border-slate-200 bg-white flex-shrink-0 safe-area-inset-bottom">
        {PANEL_TABS.map((t) => {
          if (t.id === 'chat' && chat === '0') return null;
          if (t.id === 'polls' && pollsOpt === '0') return null;

          const count = t.id === 'chat' ? unread.chat : t.id === 'qna' ? unread.qna : t.id === 'polls' ? unread.polls : 0;
          return (
            <button
              key={t.id}
              onClick={() => togglePanel(t.id)}
              className={`relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                sidePanel === t.id ? 'text-[#1d6fe8]' : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 rounded-full text-foreground text-[8px] flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════ MOBILE BOTTOM SHEET ════ */}
      {panelOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-14 h-[58vh] bg-white border-t border-slate-200 rounded-t-2xl overflow-hidden z-30 flex flex-col shadow-2xl">
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {sidePanel === 'chat'  && <ChatTab  messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => sendReaction(e)} displayName={displayName} pinnedId={pinnedId} />}
            {sidePanel === 'qna'   && <QnATab   questions={questions} onAsk={(q) => sendQuestion(q)} onUpvote={upvoteQuestion} displayName={displayName} />}
            {sidePanel === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => votePoll(pid, oid)} />}
            {sidePanel === 'notes' && <NotesPanel webinarCode={code} />}
            {sidePanel === 'more'  && <MoreMenu onSelect={handleMoreAction} />}
          </div>
        </div>
      )}

      {/* ════ LEAVE CONFIRM MODAL ════ */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-[280px] shadow-2xl">
            <p className="text-foreground font-bold text-base text-center mb-1">Leave Webinar?</p>
            <p className="text-muted-foreground text-xs text-center mb-5">You can rejoin using the same link.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLeave}
                className="w-full py-3 rounded-xl text-sm font-bold text-foreground bg-red-600 hover:bg-red-500 transition-colors"
              >
                Leave Session
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full py-3 rounded-xl text-sm font-medium text-muted-foreground bg-white hover:bg-white/[0.08] border border-slate-200 transition-colors"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ CTA POPUP ════ */}
      <CTAPopup cta={activeCTA} onDismiss={() => setActiveCTA(null)} />
    </div>
  );
}
