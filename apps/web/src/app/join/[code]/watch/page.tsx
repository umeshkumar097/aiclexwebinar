'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { webinarApi } from '@/lib/api';
import { Room, RoomEvent, Track } from 'livekit-client';
import { ChatTab } from '../room/components/ChatTab';
import { PollsTab } from '../room/components/PollsTab';
import { CTAPopup } from '../room/components/CTAPopup';
import { NotificationToast, useToasts } from '../room/components/NotificationToast';
import { EmojiReactionsOverlay } from '../room/components/EmojiReactions';
import type { ChatMsg, Poll, CTAData } from '../room/components/types';

function fmt(s: number) {
  const clamped = Math.max(0, Math.floor(s));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

type Tab = 'chat' | 'polls' | null;

// F-044: Replay behavior options
type ReplayBehavior = 'loop' | 'stop' | 'auto_live';

const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🔥'];

const PANEL_TABS: { id: 'chat' | 'polls'; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'polls', label: 'Polls', icon: '📊' },
];

export default function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string; videoUrl?: string; pos?: string; title?: string; wid?: string; replay?: string; watermark?: string; chat?: string; polls?: string; host?: string }>;
}) {
  const { code } = use(params);
  const { name, videoUrl, pos, title, replay, watermark, chat, polls: pollsOpt, host } = use(searchParams);

  const displayName   = name  ?? 'Viewer';
  const startPos      = Number(pos ?? 0);
  const webinarTitle  = title ?? 'Live Webinar';
  const hostName      = host  ?? webinarTitle;
  const replayBehavior: ReplayBehavior = (replay as ReplayBehavior) ?? 'stop';


  const videoRef        = useRef<HTMLVideoElement>(null);
  const liveVideoRef    = useRef<HTMLVideoElement>(null);
  const hideTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef           = useRef<EventSource | null>(null);
  const takeoverRoomRef = useRef<Room | null>(null);
  const syncEpochRef    = useRef<number>(Date.now() - startPos * 1000);
  const lastSyncRef     = useRef<number>(Date.now());
  const handTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [elapsed, setElapsed]             = useState(startPos);
  const [isMuted, setIsMuted]             = useState(true);
  const [isTakenOver, setIsTakenOver]     = useState(false);
  const [takingOver, setTakingOver]       = useState(false);
  const [sessionEnded, setSessionEnded]   = useState(false);
  const [videoError, setVideoError]       = useState(false);
  const [sseStatus, setSseStatus]         = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [controlsOn, setControls]         = useState(true);
  const [showLeave, setShowLeave]         = useState(false);
  const [activeTab, setActiveTab]         = useState<Tab>('chat');
  const [messages, setMessages]           = useState<ChatMsg[]>([]);
  const [polls, setPolls]                 = useState<Poll[]>([]);
  const [activeCTA, setActiveCTA]         = useState<CTAData | null>(null);
  const [incomingRxn, setIncomingRxn]     = useState<{ emoji: string; id: string } | null>(null);
  const [unread, setUnread]               = useState({ chat: 0, polls: 0 });
  const [announcement, setAnnouncement]   = useState<string | null>(null);
  const annTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handRaised, setHandRaised]       = useState(false);

  const [showReplayModal, setShowReplayModal] = useState(false);
  const [looping, setLooping]                 = useState(replayBehavior === 'loop');

  const { toasts, addToast, dismiss } = useToasts();

  const isYouTube = videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be');

  const bumpControls = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3500);
  }, []);
  useEffect(() => { bumpControls(); }, [bumpControls]);

  useEffect(() => {
    if (!videoRef.current || isYouTube) return;
    const v = videoRef.current;

    const onLoad = () => {
      const correctPos = (Date.now() - syncEpochRef.current) / 1000;
      const seekTo = Math.max(0, Math.min(correctPos, v.duration || Infinity));
      if (Math.abs(v.currentTime - seekTo) > 1) {
        v.currentTime = seekTo;
      }
      if (isMuted) {
        v.muted = true;
      }
      void v.play().catch(() => {});
    };

    if (v.readyState >= 1) {
      onLoad();
    } else {
      v.addEventListener('loadedmetadata', onLoad, { once: true });
    }
  }, [isYouTube]);

  const applySyncCorrection = useCallback((serverEpochMs: number) => {
    syncEpochRef.current = serverEpochMs;
    lastSyncRef.current = Date.now();
    const correctPos = (Date.now() - serverEpochMs) / 1000;
    setElapsed(Math.max(0, correctPos));

    if (videoRef.current && !isTakenOver) {
      const v = videoRef.current;
      const drift = Math.abs(v.currentTime - correctPos);
      if (drift > 2) {
        v.currentTime = Math.max(0, Math.min(correctPos, v.duration || Infinity));
      } else if (drift > 0.5) {
        v.playbackRate = correctPos > v.currentTime ? 1.1 : 0.9;
        setTimeout(() => { if (videoRef.current) videoRef.current.playbackRate = 1.0; }, 3000);
      }
      if (v.paused && (isNaN(v.duration) || correctPos < v.duration)) {
        void v.play().catch(() => {});
      }
    }
  }, [isTakenOver]);

  useEffect(() => {
    const t = setInterval(() => {
      const pos = (Date.now() - syncEpochRef.current) / 1000;
      setElapsed(Math.max(0, pos));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      void takeoverRoomRef.current?.disconnect();
      if (handTimerRef.current) clearTimeout(handTimerRef.current);
      if (annTimerRef.current) clearTimeout(annTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'chat')  setUnread((u) => ({ ...u, chat: 0 }));
    if (activeTab === 'polls') setUnread((u) => ({ ...u, polls: 0 }));
  }, [activeTab]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    addToast({ type: 'warning', message: 'Video unavailable — attempting live fallback…', icon: '⚠️' });

    webinarApi.getAttendeeToken(code, displayName)
      .then((data) => {
        if (data.mode === 'fully_live') {
          // MediaSoup takeover: redirect to room page
          const roomUrl = new URL(`/join/${code}/room`, window.location.origin);
          roomUrl.searchParams.set('roomId', data.roomId);
          roomUrl.searchParams.set('peerId', data.peerId);
          roomUrl.searchParams.set('serverUrl', data.mediasoupServerUrl);
          roomUrl.searchParams.set('secret', data.mediasoupSecret);
          roomUrl.searchParams.set('name', displayName);
          window.location.href = roomUrl.pathname + roomUrl.search;
        }
      })
      .catch(() => {});
  }, [code, displayName, addToast]);

  const handleVideoEnded = useCallback(() => {
    if (looping && videoRef.current) {
      videoRef.current.currentTime = 0;
      syncEpochRef.current = Date.now();
      void videoRef.current.play().catch(() => {});
      return;
    }
    if (replayBehavior === 'auto_live') {
      setTakingOver(true);
      webinarApi.getAttendeeToken(code, displayName)
        .then((data) => {
          if (data.mode === 'fully_live') {
            // MediaSoup takeover: redirect to room page
            const roomUrl = new URL(`/join/${code}/room`, window.location.origin);
            roomUrl.searchParams.set('roomId', data.roomId);
            roomUrl.searchParams.set('peerId', data.peerId);
            roomUrl.searchParams.set('serverUrl', data.mediasoupServerUrl);
            roomUrl.searchParams.set('secret', data.mediasoupSecret);
            roomUrl.searchParams.set('name', displayName);
            window.location.href = roomUrl.pathname + roomUrl.search;
          }
          setSessionEnded(true);
        })
        .catch(() => setSessionEnded(true));
      return;
    }
    // Participants always see the "ended" screen — no replay/loop modal
    setSessionEnded(true);
  }, [looping, replayBehavior, code, displayName]);


  useEffect(() => {
    const es = webinarApi.openEventStream(code, displayName);
    esRef.current = es;

    es.addEventListener('connected', () => setSseStatus('connected'));

    es.addEventListener('chat', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { user: string; message: string; time: string };
      setMessages((p) => [...p.slice(-199), {
        id: `${Date.now()}-${Math.random()}`, user: d.user,
        message: d.message, time: new Date(d.time), isHost: false,
      }]);
      if (activeTab !== 'chat') setUnread((u) => ({ ...u, chat: u.chat + 1 }));
    });

    es.addEventListener('announcement', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { text: string };
      setMessages((p) => [...p.slice(-199), {
        id: `${Date.now()}-ann`, user: 'Host',
        message: `📢 ${d.text}`, time: new Date(), isHost: true,
      }]);
      addToast({ type: 'info', message: d.text });
      setAnnouncement(d.text);
      if (annTimerRef.current) clearTimeout(annTimerRef.current);
      annTimerRef.current = setTimeout(() => setAnnouncement(null), 8000);
    });

    es.addEventListener('poll_start', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as Poll;
      setPolls((p) => p.find((x) => x.id === d.id) ? p : [d, ...p]);
      setUnread((u) => ({ ...u, polls: u.polls + 1 }));
      addToast({ type: 'poll', message: `New poll: ${d.question}`, icon: '📊' });
    });

    es.addEventListener('poll_end', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { pollId: string };
      setPolls((p) => p.map((x) => x.id === d.pollId ? { ...x, closed: true } : x));
    });

    es.addEventListener('reaction', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { emoji: string };
      setIncomingRxn({ emoji: d.emoji, id: `${Date.now()}-${Math.random()}` });
    });

    es.addEventListener('cta_show', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as CTAData;
      setActiveCTA(d);
      addToast({ type: 'offer', message: d.title, icon: '🎁' });
    });

    es.addEventListener('cta_hide', () => setActiveCTA(null));

    es.addEventListener('video_sync', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { epochMs: number; paused?: boolean };
      applySyncCorrection(d.epochMs);
      if (d.paused && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    });

    es.addEventListener('video_pause', () => {
      if (videoRef.current) videoRef.current.pause();
    });
    es.addEventListener('video_resume', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { epochMs: number };
      applySyncCorrection(d.epochMs);
      if (videoRef.current) void videoRef.current.play().catch(() => {});
    });

    es.addEventListener('session_ended', () => {
      setSessionEnded(true);
      setShowReplayModal(false);
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
      void takeoverRoomRef.current?.disconnect();
    });

    es.addEventListener('takeover_start', (e: MessageEvent) => {
      JSON.parse(e.data); // parse but not needed for MediaSoup redirect
      setTakingOver(true);
      setShowReplayModal(false);

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }

      const room = new Room({ adaptiveStream: true });
      takeoverRoomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && liveVideoRef.current) {
          track.attach(liveVideoRef.current);
          liveVideoRef.current.play().catch(() => {});
        }
        if (track.kind === Track.Kind.Audio && liveVideoRef.current) {
          track.attach(liveVideoRef.current);
        }
      });

      room.on(RoomEvent.Connected, () => {
        setIsTakenOver(true);
        setTakingOver(false);
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.track?.kind === Track.Kind.Video && liveVideoRef.current) {
              pub.track.attach(liveVideoRef.current);
              liveVideoRef.current.play().catch(() => {});
            }
          });
        });
      });

      webinarApi.getAttendeeToken(code, displayName)
        .then((data) => {
          if (data.mode === 'fully_live') {
            // MediaSoup: redirect to room page for takeover
            const roomUrl = new URL(`/join/${code}/room`, window.location.origin);
            roomUrl.searchParams.set('roomId', data.roomId);
            roomUrl.searchParams.set('peerId', data.peerId);
            roomUrl.searchParams.set('serverUrl', data.mediasoupServerUrl);
            roomUrl.searchParams.set('secret', data.mediasoupSecret);
            roomUrl.searchParams.set('name', displayName);
            window.location.href = roomUrl.pathname + roomUrl.search;
          }
        })
        .catch(() => setTakingOver(false));
    });

    es.addEventListener('takeover_end', (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { epochMs: number; videoUrl: string };
      void takeoverRoomRef.current?.disconnect();
      setIsTakenOver(false);
      setTakingOver(false);
      applySyncCorrection(d.epochMs);
      if (videoRef.current) {
        const correctPos = (Date.now() - d.epochMs) / 1000;
        videoRef.current.src = d.videoUrl;
        videoRef.current.currentTime = Math.max(0, correctPos);
        void videoRef.current.play().catch(() => {});
      }
    });

    es.onerror = () => setSseStatus('error');

    return () => { es.close(); esRef.current = null; };
  }, [code, displayName, applySyncCorrection, activeTab, addToast]);

  const sendChat = useCallback(async (msg: string) => {
    setMessages((p) => [...p.slice(-199), {
      id: `${Date.now()}-me`, user: displayName,
      message: msg, time: new Date(), isMe: true,
    }]);
    await webinarApi.sendChat(code, displayName, msg).catch(() => {});
  }, [code, displayName]);

  const sendReaction = useCallback(async (emoji: string) => {
    setIncomingRxn({ emoji, id: `${Date.now()}-${Math.random()}` });
    await webinarApi.sendChat(code, displayName, `__reaction__${emoji}`).catch(() => {});
  }, [code, displayName]);

  const votePoll = useCallback(async (pollId: string, optionId: string) => {
    setPolls((p) => p.map((poll) =>
      poll.id === pollId
        ? { ...poll, myVote: optionId, totalVotes: poll.totalVotes + 1,
            options: poll.options.map((o) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o) }
        : poll,
    ));
    await webinarApi.sendChat(code, displayName, `__vote__${JSON.stringify({ pollId, optionId })}`).catch(() => {});
  }, [code, displayName]);

  const toggleRaiseHand = useCallback(async () => {
    const next = !handRaised;
    setHandRaised(next);
    await webinarApi.sendChat(code, displayName, `__raise_hand__${next}`).catch(() => {});
    if (handTimerRef.current) clearTimeout(handTimerRef.current);
    if (next) {
      handTimerRef.current = setTimeout(() => setHandRaised(false), 30000);
    }
  }, [handRaised, code, displayName]);

  const ytEmbedUrl = (() => {
    if (!videoUrl || !isYouTube) return '';
    let vid = '';
    try {
      const u = new URL(videoUrl);
      vid = u.searchParams.get('v') ?? u.pathname.replace('/', '');
    } catch { vid = videoUrl.split('/').pop() ?? ''; }
    return `https://www.youtube.com/embed/${vid}?autoplay=1&start=${startPos}&controls=0&modestbranding=1&rel=0`;
  })();

  const panelOpen = activeTab !== null;

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col overflow-hidden select-none"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
    >
      <NotificationToast toasts={toasts} onDismiss={dismiss} />

      <div className="flex flex-1 overflow-hidden min-h-0">

        <div className="relative flex-1 bg-black overflow-hidden flex flex-col">

          {announcement && (
            <div className="flex-shrink-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 backdrop-blur-sm border-b border-blue-200 px-4 py-2.5 flex items-center gap-3 z-40">
              <span className="text-xl flex-shrink-0">📢</span>
              <p className="text-foreground text-sm font-medium flex-1 leading-snug">{announcement}</p>
              <button onClick={() => setAnnouncement(null)} className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0">✕</button>
            </div>
          )}

          <div className="flex-1 relative overflow-hidden">
            <EmojiReactionsOverlay incoming={incomingRxn} />

            {takingOver && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-30">
                <div className="w-12 h-12 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-foreground font-bold text-base">Host is going live!</p>
                  <p className="text-muted-foreground text-sm mt-1">Switching to live camera…</p>
                </div>
              </div>
            )}

            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isTakenOver ? 'block' : 'hidden'}`}
            />

            {videoError && !isTakenOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-foreground font-semibold mb-2">Video unavailable</p>
                <p className="text-muted-foreground text-sm mb-6">Attempting to connect to live stream…</p>
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isYouTube && videoUrl && !isTakenOver && !sessionEnded && !videoError && (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted={isMuted}
                  loop={looping}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  onContextMenu={(e) => e.preventDefault()}
                />
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
                {isMuted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[3px] z-20 pointer-events-none">
                    <button
                      onClick={() => {
                        setIsMuted(false);
                        if (videoRef.current) {
                          videoRef.current.muted = false;
                          void videoRef.current.play().catch(() => {});
                        }
                      }}
                      className="pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#1d6fe8] hover:bg-[#1d6fe8] text-foreground font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                      🔊 Tap to Unmute / Play
                    </button>
                  </div>
                )}
              </>
            )}

            {isYouTube && videoUrl && !isTakenOver && !sessionEnded && (
              <iframe
                src={ytEmbedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}

            {!videoUrl && !isTakenOver && !sessionEnded && !videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-muted-foreground text-sm">Video not configured</p>
              </div>
            )}

            {showReplayModal && !sessionEnded && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 w-[300px] shadow-2xl text-center">
                  <div className="text-4xl mb-3">🏁</div>
                  <h3 className="text-foreground font-bold text-lg mb-1">Presentation Complete</h3>
                  <p className="text-muted-foreground text-xs mb-5">What would you like to do?</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setShowReplayModal(false);
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          syncEpochRef.current = Date.now();
                          void videoRef.current.play().catch(() => {});
                        }
                      }}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#1d6fe8] hover:bg-[#1d6fe8] transition-colors"
                    >
                      🔄 Watch Again
                    </button>
                    <button
                      onClick={() => {
                        setShowReplayModal(false);
                        setLooping(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-[#1d6fe8] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      🔁 Loop Playback
                    </button>
                    <button
                      onClick={() => {
                        setShowReplayModal(false);
                        setSessionEnded(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-white hover:bg-white/[0.08] border border-slate-200 transition-colors"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sessionEnded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
                style={{ background: 'linear-gradient(160deg, #0a0a14 0%, #08080f 100%)' }}>
                <div className="flex flex-col items-center gap-5 px-6 text-center max-w-sm w-full">
                  {/* Host name / branding */}
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 0 60px rgba(29,111,232,0.4)' }}>
                    {hostName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Presented by</p>
                    <h2 className="text-white font-bold text-2xl mb-1">{hostName}</h2>
                    <p className="text-white/60 text-sm">Thank you for attending this webinar!</p>
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center w-full">
                    <p className="text-white/40 text-xs mb-1">You watched for</p>
                    <p className="text-white font-bold font-mono text-2xl">{fmt(elapsed)}</p>
                  </div>
                  <button
                    onClick={() => window.history.back()}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #1d6fe8, #2563eb)', boxShadow: '0 8px 30px rgba(29,111,232,0.4)' }}
                  >
                    ← Back to Home
                  </button>
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
              <button
                onClick={() => setShowLeave(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm border border-slate-200 text-foreground hover:text-foreground hover:bg-red-500/20 hover:border-red-500/30 transition-all text-xs font-medium"
              >← Leave</button>
              {sseStatus === 'error' && (
                <span className="text-amber-400 text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded-xl border border-amber-500/20 animate-pulse">
                  ⚡ Reconnecting…
                </span>
              )}
            </div>

            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${controlsOn ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/75 to-transparent pt-3 pb-12 px-4 pointer-events-auto">
                <div className="flex items-center justify-end gap-2">
                  {isTakenOver && (
                    <div className="flex items-center gap-1.5 bg-red-600/80 backdrop-blur-sm rounded-xl px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-[10px] font-bold tracking-wide">LIVE</span>
                    </div>
                  )}
                  {!isTakenOver && (
                    <div className="flex items-center gap-1.5 bg-red-500/80 backdrop-blur-sm rounded-xl px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-[10px] font-bold tracking-wide">LIVE</span>
                      <span className="text-white/80 text-[10px] font-mono">{fmt(elapsed)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-16 pb-4 px-4 pointer-events-auto">
                <p className="text-muted-foreground text-xs font-medium truncate">{webinarTitle}</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-2.5 flex items-center gap-2 z-20">
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

        {panelOpen && (
          <div className="hidden md:flex w-[300px] xl:w-80 border-l border-slate-200 bg-white flex-col flex-shrink-0 overflow-hidden">
            <div className="flex border-b border-slate-200 flex-shrink-0">
              {PANEL_TABS.map((t) => {
                if (t.id === 'chat' && chat === '0') return null;
                if (t.id === 'polls' && pollsOpt === '0') return null;

                const count = t.id === 'chat' ? unread.chat : unread.polls;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setUnread((p) => ({ ...p, [t.id]: 0 })); }}
                    className={`relative flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${activeTab === t.id ? 'text-[#1d6fe8] border-b-2 border-[#1d6fe8]' : 'text-muted-foreground hover:text-muted-foreground'}`}
                  >
                    <span className="text-sm">{t.icon}</span>
                    <span className="capitalize">{t.label}</span>
                    {count > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-foreground text-[8px] flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'chat'  && <ChatTab messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => void sendReaction(e)} displayName={displayName} />}
              {activeTab === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => void votePoll(pid, oid)} />}
            </div>
          </div>
        )}
      </div>

      {/* ════ MOBILE NAV ════ */}
      <div className="md:hidden flex border-t border-slate-200 bg-white flex-shrink-0">
        {(['chat', 'polls'] as const).map((t) => {
          const badge = t === 'chat' ? unread.chat : unread.polls;
          return (
            <button key={t} onClick={() => setActiveTab((p) => p === t ? null : t)}
              className={`relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${activeTab === t ? 'text-[#1d6fe8]' : 'text-muted-foreground'}`}>
              <span className="text-lg">{t === 'chat' ? '💬' : '📊'}</span>
              <span className="capitalize">{t}</span>
              {badge > 0 && <span className="absolute top-1.5 right-4 w-4 h-4 bg-red-500 rounded-full text-foreground text-[8px] flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ════ MOBILE SHEET ════ */}
      {panelOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-14 h-[55vh] bg-white border-t border-slate-200 rounded-t-2xl z-30 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex justify-center pt-2.5 pb-1"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat'  && <ChatTab messages={messages} onSend={(m) => void sendChat(m)} onReact={(e) => void sendReaction(e)} displayName={displayName} />}
            {activeTab === 'polls' && <PollsTab polls={polls} onVote={(pid, oid) => void votePoll(pid, oid)} />}
          </div>
        </div>
      )}

      {/* ════ CTA ════ */}
      <CTAPopup cta={activeCTA} onDismiss={() => setActiveCTA(null)} />

      {/* ════ LEAVE MODAL ════ */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-[280px] shadow-2xl">
            <p className="text-foreground font-bold text-base text-center mb-1">Leave Webinar?</p>
            <p className="text-muted-foreground text-xs text-center mb-5">You can rejoin using the same link.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { esRef.current?.close(); window.history.back(); }}
                className="w-full py-3 rounded-xl text-sm font-bold text-foreground bg-red-600 hover:bg-red-500 transition-colors">
                Leave Session
              </button>
              <button onClick={() => setShowLeave(false)}
                className="w-full py-3 rounded-xl text-sm font-medium text-muted-foreground bg-white hover:bg-white/[0.08] border border-slate-200 transition-colors">
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
