'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import {
  Room, RoomEvent, RemoteTrack, Track, ConnectionQuality,
} from 'livekit-client';
import { ChatTab }              from './components/ChatTab';
import { QnATab }               from './components/QnATab';
import { PollsTab }             from './components/PollsTab';
import { CTAPopup }             from './components/CTAPopup';
import { NotesPanel }           from './components/NotesPanel';
import { MoreMenu }             from './components/MoreMenu';
import { EmojiReactionsOverlay } from './components/EmojiReactions';
import { NotificationToast, useToasts } from './components/NotificationToast';
import type { ChatMsg, QnAQuestion, Poll, CTAData, HostEvent } from './components/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type SidePanelTab = 'chat' | 'qna' | 'polls' | 'notes' | 'more' | null;

// ─── Network bars ─────────────────────────────────────────────────────────────
function NetBars({ quality }: { quality: ConnectionQuality | null }) {
  if (!quality || quality === ConnectionQuality.Unknown) return null;
  const bars = quality === ConnectionQuality.Excellent ? 4
    : quality === ConnectionQuality.Good ? 3
    : quality === ConnectionQuality.Poor ? 2 : 1;
  const color = bars >= 3 ? 'bg-emerald-400' : bars === 2 ? 'bg-amber-400' : 'bg-red-400';
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
  searchParams: Promise<{ token?: string; name?: string; url?: string; title?: string; watermark?: string; chat?: string; polls?: string }>;
}) {
  const { code }                    = use(params);
  const { token, name, url, title, watermark, chat, polls: pollsOpt } = use(searchParams);

  const livekitUrl  = url ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? '';
  const displayName = name ?? 'Attendee';
  const webinarTitle = title ?? 'Live Webinar';

  // ── Refs ─────────────────────────────────────────────────────────────────
  const roomRef      = useRef<Room | null>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const audioRef     = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Connection state ──────────────────────────────────────────────────────
  const [connState, setConnState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'>('connecting');
  const [hostOnline, setHostOnline]         = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [elapsed, setElapsed]               = useState(0);
  const [netQuality, setNetQuality]         = useState<ConnectionQuality | null>(null);
  const [audioMuted, setAudioMuted]         = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidePanel, setSidePanel]         = useState<SidePanelTab>('chat');
  const [controlsVisible, setControls]    = useState(true);
  const [fullscreen, setFullscreen]       = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  // ── LiveKit connection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setConnState('error'); return; }
    let cancelled = false;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const syncCount = () => setParticipantCount(room.remoteParticipants.size);

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHostOnline(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      track.detach();
      if (track.kind === Track.Kind.Video) setHostOnline(false);
    });

    room.on(RoomEvent.ParticipantConnected, syncCount);
    room.on(RoomEvent.ParticipantDisconnected, syncCount);

    room.on(RoomEvent.Reconnecting, () => {
      if (!cancelled) {
        setConnState('reconnecting');
        addToast({ type: 'warning', message: 'Connection lost — reconnecting…' });
      }
    });

    room.on(RoomEvent.Reconnected, () => {
      if (!cancelled) {
        setConnState('connected');
        addToast({ type: 'success', message: 'Connection restored ✓' });
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setConnState('disconnected');
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (!participant || participant === room.localParticipant) setNetQuality(quality);
    });

    // ── Data channel ───────────────────────────────────────────────────────
    room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
      try {
        const ev = JSON.parse(new TextDecoder().decode(data)) as HostEvent;

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
          // F-036: Show banner for 8s
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
          // Host muted this participant's audio output
          if (audioRef.current && !audioRef.current.muted) {
            audioRef.current.muted = true;
            setAudioMuted(true);
            addToast({ type: 'warning', message: 'Host has muted your audio', icon: '🔇' });
          }
        }
      } catch { /* ignore */ }
    });

    room.connect(livekitUrl, token)
      .then(() => {
        if (cancelled) return;
        setConnState('connected');
        syncCount();
        // Attach existing tracks
        room.remoteParticipants.forEach((p) => {
          p.getTrackPublications().forEach((pub) => {
            if (pub.track?.kind === Track.Kind.Video && videoRef.current) {
              pub.track.attach(videoRef.current);
              setHostOnline(true);
            }
            if (pub.track?.kind === Track.Kind.Audio && audioRef.current) {
              pub.track.attach(audioRef.current);
            }
          });
        });
      })
      .catch(() => { if (!cancelled) setConnState('error'); });

    return () => {
      cancelled = true;
      void room.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, livekitUrl]);

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (connState !== 'connected') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [connState]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendChat = useCallback(async (msg: string) => {
    const m: ChatMsg = {
      id: `${Date.now()}-${Math.random()}`,
      user: displayName,
      message: msg,
      time: new Date(),
      isMe: true,
    };
    setMessages((p) => [...p.slice(-199), m]);
    if (roomRef.current) {
      const d = new TextEncoder().encode(JSON.stringify({ type: 'message', user: displayName, message: msg }));
      await roomRef.current.localParticipant.publishData(d, { reliable: true });
    }
  }, [displayName]);

  const sendReaction = useCallback(async (emoji: string) => {
    setIncomingRxn({ emoji, id: `${Date.now()}-${Math.random()}` });
    if (roomRef.current) {
      const d = new TextEncoder().encode(JSON.stringify({ type: 'reaction', emoji }));
      await roomRef.current.localParticipant.publishData(d, { reliable: false });
    }
  }, []);

  const sendQuestion = useCallback(async (q: string) => {
    const question: QnAQuestion = {
      id: `${Date.now()}-${Math.random()}`,
      user: displayName,
      question: q,
      time: new Date(),
      upvotes: 0,
    };
    setQuestions((p) => [...p, question]);
    if (roomRef.current) {
      const d = new TextEncoder().encode(JSON.stringify({ type: 'qna_question', user: displayName, question: q, id: question.id }));
      await roomRef.current.localParticipant.publishData(d, { reliable: true });
    }
  }, [displayName]);

  const upvoteQuestion = useCallback((id: string) => {
    setQuestions((p) => p.map((q) => q.id === id && !q.hasUpvoted ? { ...q, upvotes: q.upvotes + 1, hasUpvoted: true } : q));
  }, []);

  const votePoll = useCallback(async (pollId: string, optionId: string) => {
    setPolls((p) => p.map((poll) =>
      poll.id === pollId
        ? { ...poll, myVote: optionId, totalVotes: poll.totalVotes + 1,
            options: poll.options.map((o) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o) }
        : poll,
    ));
    if (roomRef.current) {
      const d = new TextEncoder().encode(JSON.stringify({ type: 'poll_vote', pollId, optionId, user: displayName }));
      await roomRef.current.localParticipant.publishData(d, { reliable: true });
    }
  }, [displayName]);

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
  const toggleRaiseHand = useCallback(async () => {
    const next = !handRaised;
    setHandRaised(next);
    if (roomRef.current) {
      const d = new TextEncoder().encode(
        JSON.stringify({ type: 'raise_hand', user: displayName, raised: next }),
      );
      await roomRef.current.localParticipant.publishData(d, { reliable: true });
    }
    // Auto-lower after 30 seconds
    if (handTimeoutRef.current) clearTimeout(handTimeoutRef.current);
    if (next) {
      handTimeoutRef.current = setTimeout(() => {
        setHandRaised(false);
        if (roomRef.current) {
          const d = new TextEncoder().encode(
            JSON.stringify({ type: 'raise_hand', user: displayName, raised: false }),
          );
          void roomRef.current.localParticipant.publishData(d, { reliable: true });
        }
      }, 30000);
    }
  }, [handRaised, displayName]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (handTimeoutRef.current) clearTimeout(handTimeoutRef.current);
      if (annTimerRef.current) clearTimeout(annTimerRef.current);
    };
  }, []);

  // ── Error screen ──────────────────────────────────────────────────────────
  if (!token || connState === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-foreground font-medium mb-1">Could not join the session</p>
          <p className="text-muted-foreground text-sm mb-5">Your link may have expired</p>
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
                  onClick={() => void sendReaction(emoji)}
                  className="text-xl hover:scale-125 active:scale-110 transition-transform hover:-translate-y-1 duration-150 select-none"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* F-032: Raise Hand */}
            <button
              onClick={() => void toggleRaiseHand()}
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
              {sidePanel === 'chat'  && <ChatTab  messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => void sendReaction(e)} displayName={displayName} pinnedId={pinnedId} />}
              {sidePanel === 'qna'   && <QnATab   questions={questions} onAsk={(q) => void sendQuestion(q)} onUpvote={upvoteQuestion} displayName={displayName} />}
              {sidePanel === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => void votePoll(pid, oid)} />}
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
            {sidePanel === 'chat'  && <ChatTab  messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => void sendReaction(e)} displayName={displayName} pinnedId={pinnedId} />}
            {sidePanel === 'qna'   && <QnATab   questions={questions} onAsk={(q) => void sendQuestion(q)} onUpvote={upvoteQuestion} displayName={displayName} />}
            {sidePanel === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => void votePoll(pid, oid)} />}
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
                onClick={() => {
                  void roomRef.current?.disconnect();
                  window.history.back();
                }}
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
