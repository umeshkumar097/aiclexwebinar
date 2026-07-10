'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
import { webinarApi, type Webinar } from '@/lib/api';
import { Device } from 'mediasoup-client';
import type { Transport, Producer } from 'mediasoup-client/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Chat types ────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  message: string;
  time: Date;
  isHost?: boolean;
}

interface Viewer {
  sid: string;
  name: string;
  joinedAt: Date;
}

// ─── Floating Reactions Helper ────────────────────────────────────────────────
interface FloatingEmoji { id: string; emoji: string; x: number }
function EmojiReactionsOverlay({ incoming }: { incoming: { emoji: string; id: string } | null }) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  useEffect(() => {
    if (!incoming) return;
    const fe: FloatingEmoji = { id: incoming.id, emoji: incoming.emoji, x: 10 + Math.random() * 80 };
    setFloating((prev) => [...prev.slice(-20), fe]);
    setTimeout(() => setFloating((prev) => prev.filter((f) => f.id !== fe.id)), 3000);
  }, [incoming]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {floating.map((f) => (
        <div key={f.id} className="absolute bottom-24 text-3xl" style={{ left: `${f.x}%`, animation: 'floatUp 3s ease-out forwards' }}>
          {f.emoji}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          100% { transform: translateY(-280px) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Control Button ───────────────────────────────────────────────────────────
function CtrlBtn({ icon, label, active = true, danger = false, onClick, disabled = false }: {
  icon: string; label: string; active?: boolean; danger?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg transition-all duration-150 min-w-[64px] disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'hover:bg-white/10 text-red-400'
          : active
          ? 'hover:bg-white/10 text-white'
          : 'hover:bg-white/10 text-[#b0b0b0] hover:text-white'
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[10px] font-medium mt-0.5 leading-none">{label}</span>
    </button>
  );
}

// ─── Main Studio Page ─────────────────────────────────────────────────────────
export default function LiveStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  void connectionError; // Mark as read


  // Refs for tracking streams — MediaSoup
  const deviceRef    = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const screenProducerRef = useRef<Producer | null>(null);
  const mediasoupRoomIdRef  = useRef<string>('');
  const mediasoupPeerIdRef  = useRef<string>('');
  const mediasoupUrlRef     = useRef<string>('');
  const mediasoupSecretRef  = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const pipCameraRef = useRef<HTMLVideoElement>(null);
  const localFallbackStreamRef = useRef<MediaStream | null>(null);
  const semiStreamRef = useRef<MediaStream | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Controls & Panels
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [activePanel, setActivePanel] = useState<'chat' | 'viewers' | 'control'>('chat');

  // Semi-live camera/mic takeover states
  const [semiCameraOn, setSemiCameraOn] = useState(false);
  const [semiMicOn, setSemiMicOn] = useState(false);

  // Full takeover states (semi-live → fully live)
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [semiTakeover, setSemiTakeover] = useState(false);
  const [takeoverConnecting, setTakeoverConnecting] = useState(false);
  const takeoverDeviceRef = useRef<Device | null>(null);
  const takeoverSendTransportRef = useRef<Transport | null>(null);

  // Live stats
  const [elapsed, setElapsed] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [viewers, _setViewers] = useState<Viewer[]>([]);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // End session modal
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ── Engagement states for Semi-Live Control Panel
  const [announcementText, setAnnouncementText] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activePollId, setActivePollId] = useState<string | null>(null);

  const [ctaTitle, setCtaTitle] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaPrice, setCtaPrice] = useState('');
  const [ctaTimer, setCtaTimer] = useState('180');
  const [ctaActive, setCtaActive] = useState(false);

  // F-042: Track server-side epoch when video started
  const videoStartEpochRef = useRef<number>(Date.now());
  // F-044: Replay behavior for semi-live
  const [replayBehavior, setReplayBehavior] = useState<'loop' | 'stop' | 'auto_live'>('stop');
  const [videoPaused, setVideoPaused] = useState(false);

  // ── Advanced features (F-019 to F-029) ──────────────────────────────────────
  const [screenSharing, setScreenSharing] = useState(false);
  const [bgBlur, setBgBlur]               = useState(false);
  const [showDevicePanel, setShowDevicePanel] = useState(false);
  const [cameras, setCameras]             = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics]                   = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic]     = useState('');
  const [pipActive, setPipActive]         = useState(false);
  const [spotlightSid, setSpotlightSid]   = useState<string | null>(null);
  const [mutedSids, setMutedSids]         = useState<Set<string>>(new Set());
  const [raisedHands, setRaisedHands]     = useState<Set<string>>(new Set()); // F-032
  const [incomingRxn, setIncomingRxn]     = useState<{ emoji: string; id: string } | null>(null);
  const [currentPoll, setCurrentPoll]     = useState<{
    id: string;
    question: string;
    options: { id: string; text: string; votes: number }[];
    totalVotes: number;
  } | null>(null);

  // ── Load webinar + connect MediaSoup / SSE ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let w = await webinarApi.get(id);
        if (cancelled) return;

        // Auto-start if not live yet (Zoom-style: opening studio starts the webinar)
        if (w.status !== 'live') {
          try {
            w = await webinarApi.goLive(id);
          } catch {
            // If goLive fails (already live or error), reload to check status
            w = await webinarApi.get(id);
          }
          if (cancelled) return;
          if (w.status !== 'live') {
            router.replace(`/dashboard/webinars/${id}`);
            return;
          }
        }

        setWebinar(w);
        if (w.startedAt) {
          setElapsed(Math.floor((Date.now() - new Date(w.startedAt).getTime()) / 1000));
        }

        // ── Connect via SSE to monitor chat/viewers (needed in both modes) ──
        const es = webinarApi.openEventStream(w.joinCode || '', 'Host');
        esRef.current = es;

        es.addEventListener('connected', () => {
          if (w.mode === 'semi_live') {
            setConnectionState('connected');
          }
        });

        es.addEventListener('viewer_count', (e: MessageEvent) => {
          try {
            const d = JSON.parse(e.data) as { count: number };
            setParticipantCount(d.count);
          } catch {}
        });

        es.addEventListener('chat', (e: MessageEvent) => {
          try {
            const d = JSON.parse(e.data) as { id?: string; user: string; message: string; time: string };
            // Parse and handle vote events
            if (d.message.startsWith('__vote__')) {
              try {
                const vote = JSON.parse(d.message.replace('__vote__', '')) as { pollId: string; optionId: string };
                setCurrentPoll((prev) => {
                  if (!prev || prev.id !== vote.pollId) return prev;
                  return {
                    ...prev,
                    totalVotes: prev.totalVotes + 1,
                    options: prev.options.map((o) =>
                      o.id === vote.optionId ? { ...o, votes: o.votes + 1 } : o
                    ),
                  };
                });
              } catch {}
              return;
            }

            // Parse and handle reaction events
            if (d.message.startsWith('__reaction__')) {
              const emoji = d.message.replace('__reaction__', '');
              setIncomingRxn({ emoji, id: `${Date.now()}-${Math.random()}` });
              return;
            }

            // Skip host's own messages — already added optimistically in sendMessage
            if (d.user === 'Host') return;

            const msg: ChatMessage = {
              id: d.id || `${Date.now()}-${Math.random()}`,
              user: d.user,
              avatar: d.user.substring(0, 2).toUpperCase(),
              message: d.message,
              time: new Date(d.time),
              isHost: false,
            };
            setMessages((prev) => [...prev.slice(-49), msg]);
          } catch {}
        });

        es.addEventListener('hand_toggle', (e: MessageEvent) => {
          try {
            const d = JSON.parse(e.data) as { user: string; raised: boolean };
            setRaisedHands((prev) => {
              const next = new Set(prev);
              if (d.raised) next.add(d.user);
              else next.delete(d.user);
              return next;
            });
          } catch {}
        });

        es.addEventListener('poll_vote', (e: MessageEvent) => {
          try {
            const d = JSON.parse(e.data) as { pollId: string; optionId: string; user: string };
            setCurrentPoll((prev) => {
              if (!prev || prev.id !== d.pollId) return prev;
              return {
                ...prev,
                totalVotes: prev.totalVotes + 1,
                options: prev.options.map((o) =>
                  o.id === d.optionId ? { ...o, votes: o.votes + 1 } : o
                ),
              };
            });
          } catch {}
        });

        es.onerror = () => {
          if (w.mode === 'semi_live') {
            setConnectionState('error');
          }
        };

        if (w.mode === 'semi_live') {
          setPageLoading(false);
        } else {
          // ── Fully-Live: Connect via MediaSoup WebRTC ──
          setConnectionState('connecting');
          const displayName = user?.email?.split('@')[0] ?? 'Host';
          const creds = await webinarApi.getHostToken(id, displayName);

          mediasoupRoomIdRef.current  = creds.roomId;
          mediasoupPeerIdRef.current  = creds.peerId;
          mediasoupUrlRef.current     = creds.mediasoupServerUrl;
          mediasoupSecretRef.current  = creds.mediasoupSecret;

          // ── Get RTP capabilities from MediaSoup server ──
          const capsRes = await fetch(
            `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/rtp-capabilities`,
            { headers: { 'x-mediasoup-secret': creds.mediasoupSecret } },
          );
          const { rtpCapabilities } = await capsRes.json();

          // ── Load mediasoup Device ──
          const device = new Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          deviceRef.current = device;

          // ── Create send transport ──
          const tRes = await fetch(
            `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret },
              body: JSON.stringify({ peerId: creds.peerId, direction: 'send', role: 'host' }),
            },
          );
          const tData = await tRes.json();

          const sendTransport = device.createSendTransport(tData);
          sendTransportRef.current = sendTransport;

          sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              await fetch(
                `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports/${sendTransport.id}/connect`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret },
                  body: JSON.stringify({ dtlsParameters }),
                },
              );
              callback();
            } catch (err) { errback(err as Error); }
          });

          sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
              const pRes = await fetch(
                `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports/${sendTransport.id}/produce`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret },
                  body: JSON.stringify({ peerId: creds.peerId, kind, rtpParameters, appData }),
                },
              );
              const { id: producerId } = await pRes.json();
              callback({ id: producerId });
            } catch (err) { errback(err as Error); }
          });

          // ── Capture camera + mic (try 720p, fallback to 480p) ──
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
              audio: { noiseSuppression: true, echoCancellation: true },
            });
          } catch {
            // Fallback to lower resolution if 720p fails
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 } },
              audio: true,
            });
          }

          localFallbackStreamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }

          // ── Produce video ──
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const vProducer = await sendTransport.produce({ track: videoTrack });
            videoProducerRef.current = vProducer;
          }

          // ── Produce audio ──
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            const aProducer = await sendTransport.produce({ track: audioTrack });
            audioProducerRef.current = aProducer;
          }

          setConnectionState('connected');
          setPageLoading(false);
        }

      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to connect';
        setConnectionError(msg);
        setConnectionState('error');

        // Preview fallback if fully live configuration fails
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localFallbackStreamRef.current = stream;
        } catch { /* denied */ }
        setPageLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      // Close MediaSoup producers
      videoProducerRef.current?.close();
      audioProducerRef.current?.close();
      screenProducerRef.current?.close();
      sendTransportRef.current?.close();
      esRef.current?.close();
    };
  }, [id, router, user]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!webinar) return;
    if (webinar.startedAt) {
      videoStartEpochRef.current = new Date(webinar.startedAt).getTime();
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [webinar]);

  // ── F-042: Broadcast video_sync to attendees every 10s ────────────────────
  useEffect(() => {
    if (webinar?.mode !== 'semi_live' || pageLoading) return;
    const interval = setInterval(async () => {
      if (!webinar?.id) return;
      const epochMs = videoStartEpochRef.current;
      // Broadcast current sync point so attendees can correct drift
      try {
        await webinarApi.broadcast(webinar.id, 'video_sync', {
          epochMs,
          paused: videoPaused,
          position: videoRef.current?.currentTime ?? 0,
        });
      } catch { /* best-effort */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [webinar, pageLoading, videoPaused]);

  // ── F-038: Scheduled playback auto-start ───────────────────────────────────
  useEffect(() => {
    if (webinar?.mode !== 'semi_live' || !webinar.scheduledAt || pageLoading) return;
    const scheduledMs = new Date(webinar.scheduledAt).getTime();
    const now = Date.now();
    const msUntil = scheduledMs - now;
    if (msUntil <= 0) return; // Already past scheduled time

    const t = setTimeout(() => {
      // Auto-start video at scheduled time
      if (videoRef.current) {
        videoStartEpochRef.current = scheduledMs;
        videoRef.current.currentTime = 0;
        void videoRef.current.play().catch(() => {});
        setVideoPaused(false);
      }
    }, msUntil);
    return () => clearTimeout(t);
  }, [webinar, pageLoading]);

  // ── Sync Video playback time for Semi-Live ─────────────────────────────────
  useEffect(() => {
    if (webinar?.mode !== 'semi_live' || !videoRef.current || pageLoading) return;
    const video = videoRef.current;
    
    // Set matching video timeline position
    if (Math.abs(video.currentTime - elapsed) > 2) {
      video.currentTime = elapsed;
    }

    // Ensure it plays
    if (video.paused && elapsed < video.duration) {
      video.play().catch(() => {});
    }
  }, [elapsed, webinar, pageLoading]);

  // ── Bind camera stream for Fully-Live (MediaSoup — srcObject already set in init) ──
  useEffect(() => {
    if (pageLoading || webinar?.mode === 'semi_live') return;
    const videoElement = videoRef.current;
    if (!videoElement) return;
    // Stream is attached directly in init via getUserMedia, just toggle visibility
    if (videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getVideoTracks().forEach((t) => { t.enabled = cameraOn; });
    } else if (localFallbackStreamRef.current) {
      if (cameraOn) {
        videoElement.srcObject = localFallbackStreamRef.current;
        videoElement.play().catch(() => {});
      } else {
        localFallbackStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; });
      }
    }
  }, [pageLoading, cameraOn, connectionState, webinar]);

  // ── Semi-Live PiP camera takeover ──────────────────────────────────────────
  useEffect(() => {
    if (webinar?.mode !== 'semi_live') return;
    const pip = cameraRef.current;
    if (!pip) return;

    if (semiCameraOn) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: semiMicOn })
        .then((stream) => {
          semiStreamRef.current = stream;
          pip.srcObject = stream;
          pip.play().catch(() => {});
        })
        .catch(() => setSemiCameraOn(false));
    } else {
      semiStreamRef.current?.getTracks().forEach((t) => t.stop());
      semiStreamRef.current = null;
      pip.srcObject = null;
    }

    return () => {
      semiStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [semiCameraOn, semiMicOn, webinar]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Screen share: show preview when screenSharing=true ───────────────────────
  useEffect(() => {
    if (!screenSharing || !screenVideoRef.current) return;
    // screenProducerRef track is the display stream — already attached in handleScreenShare
  }, [screenSharing]);

  // ── Camera PiP during screen share ────────────────────────────────────────
  useEffect(() => {
    if (!screenSharing || !cameraOn || !pipCameraRef.current) return;
    const el = pipCameraRef.current;
    // Use the main video stream for PiP
    if (videoRef.current?.srcObject) {
      el.srcObject = videoRef.current.srcObject;
      el.play().catch(() => {});
      return () => { el.srcObject = null; };
    }
    if (localFallbackStreamRef.current) {
      el.srcObject = localFallbackStreamRef.current;
      el.play().catch(() => {});
      return () => { el.srcObject = null; };
    }
  }, [screenSharing, cameraOn]);

  // ── Mic/Camera toggles (MediaSoup: pause/resume producers) ───────────────
  const toggleMic = useCallback(async () => {
    const newState = !micOn;
    if (audioProducerRef.current) {
      newState ? audioProducerRef.current.resume() : audioProducerRef.current.pause();
    } else if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getAudioTracks().forEach((t) => { t.enabled = newState; });
    }
    setMicOn(newState);
  }, [micOn]);

  const toggleCamera = useCallback(async () => {
    const newState = !cameraOn;
    if (videoProducerRef.current) {
      newState ? videoProducerRef.current.resume() : videoProducerRef.current.pause();
    }
    // Also toggle the track enabled state so camera light turns off
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getVideoTracks().forEach((t) => { t.enabled = newState; });
    }
    setCameraOn(newState);
  }, [cameraOn]);

  // ── Go Live Takeover (semi_live → fully_live via MediaSoup) ─────────────────
  const handleGoLiveTakeover = useCallback(async () => {
    if (!webinar || takeoverConnecting) return;
    setTakeoverConnecting(true);
    setShowTakeoverModal(false);
    try {
      const displayName = user?.email?.split('@')[0] ?? 'Host';
      const creds = await webinarApi.getHostToken(id, displayName);

      // Load MediaSoup device
      const capsRes = await fetch(
        `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/rtp-capabilities`,
        { headers: { 'x-mediasoup-secret': creds.mediasoupSecret } },
      );
      const { rtpCapabilities } = await capsRes.json();
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      takeoverDeviceRef.current = device;

      // Create send transport
      const tRes = await fetch(
        `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret },
          body: JSON.stringify({ peerId: creds.peerId, direction: 'send', role: 'host' }),
        },
      );
      const tData = await tRes.json();
      const sendTransport = device.createSendTransport(tData);
      takeoverSendTransportRef.current = sendTransport;

      sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await fetch(
            `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports/${sendTransport.id}/connect`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret }, body: JSON.stringify({ dtlsParameters }) },
          );
          callback();
        } catch (err) { errback(err as Error); }
      });

      sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const pRes = await fetch(
            `${creds.mediasoupServerUrl}/api/rooms/${creds.roomId}/transports/${sendTransport.id}/produce`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-mediasoup-secret': creds.mediasoupSecret }, body: JSON.stringify({ peerId: creds.peerId, kind, rtpParameters, appData }) },
          );
          const { id: producerId } = await pRes.json();
          callback({ id: producerId });
        } catch (err) { errback(err as Error); }
      });

      // Capture camera for takeover
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) await sendTransport.produce({ track: vTrack });
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) await sendTransport.produce({ track: aTrack });

      await webinarApi.broadcast(webinar.id, 'takeover_start', {
        roomId: creds.roomId,
        mediasoupServerUrl: creds.mediasoupServerUrl,
        message: 'Host is now live!',
      });

      setSemiTakeover(true);
      setSemiCameraOn(false);
      semiStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error('Takeover failed', err);
    } finally {
      setTakeoverConnecting(false);
    }
  }, [webinar, id, user, takeoverConnecting]);

  // ── Cleanup takeover transport on unmount ────────────────────────────────
  useEffect(() => {
    return () => { takeoverSendTransportRef.current?.close(); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // F-026: Device enumeration & switching
  // ─────────────────────────────────────────────────────────────────────────
  const loadDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === 'videoinput');
      const mics = all.filter((d) => d.kind === 'audioinput');
      setCameras(cams);
      setMics(mics);
      if (!selectedCamera && cams[0]) setSelectedCamera(cams[0].deviceId);
      if (!selectedMic    && mics[0]) setSelectedMic(mics[0].deviceId);
    } catch { /* permission denied */ }
  }, [selectedCamera, selectedMic]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (!sendTransportRef.current || !deviceRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
      const newTrack = newStream.getVideoTracks()[0];
      if (videoProducerRef.current && newTrack) {
        await videoProducerRef.current.replaceTrack({ track: newTrack });
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err) { console.error('Switch camera failed', err); }
  }, []);

  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId);
    if (!audioProducerRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
      const newTrack = newStream.getAudioTracks()[0];
      await audioProducerRef.current.replaceTrack({ track: newTrack });
    } catch (err) { console.error('Switch mic failed', err); }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // F-019: Screen sharing
  // ─────────────────────────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      // Stop screen share — close the MediaSoup screen producer
      screenProducerRef.current?.close();
      screenProducerRef.current = null;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setScreenSharing(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = displayStream.getVideoTracks()[0];

        // Produce via MediaSoup if transport is ready
        if (sendTransportRef.current && screenTrack) {
          const producer = await sendTransportRef.current.produce({ track: screenTrack, appData: { source: 'screen' } });
          screenProducerRef.current = producer;
        }

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
          screenVideoRef.current.play().catch(() => {});
        }

        // Auto-stop when user clicks browser "Stop sharing"
        screenTrack.onended = () => {
          screenProducerRef.current?.close();
          screenProducerRef.current = null;
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          setScreenSharing(false);
        };

        // Set state LAST — this triggers React re-render which mounts
        // <video ref={screenVideoRef}>, then the useEffect attaches the track
        setScreenSharing(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.includes('cancelled') && !msg.includes('Permission denied')) {
          console.error('Screen share failed', err);
        }
      }
    }
  }, [screenSharing]);

  // ─────────────────────────────────────────────────────────────────────────
  // F-021: Background blur — uses Chrome's native backgroundBlur constraint
  // This applies ML-based segmentation so only the background is blurred,
  // NOT the person. Falls back gracefully if browser doesn't support it.
  // ─────────────────────────────────────────────────────────────────────────
  const toggleBgBlur = useCallback(async () => {
    const newBlur = !bgBlur;
    setBgBlur(newBlur);

    // Get the active camera video track
    const track =
      (videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getVideoTracks()[0]
        : null);

    if (!track) return;

    try {
      // Chrome 94+ native background blur (uses on-device ML, only blurs background)
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        backgroundBlur?: boolean[];
      };

      if (capabilities.backgroundBlur && capabilities.backgroundBlur.includes(true)) {
        await track.applyConstraints({
          advanced: [{ backgroundBlur: newBlur } as MediaTrackConstraintSet],
        });
        return; // ✅ Native blur applied — only background blurred
      }

      // Fallback: browser doesn't support native background blur
      // Nothing we can do without a heavy ML library — just keep state as UI indicator
      console.info('Native backgroundBlur not supported on this device/browser.');
    } catch (err) {
      console.warn('backgroundBlur constraint failed:', err);
    }
  }, [bgBlur]);

  // ─────────────────────────────────────────────────────────────────────────
  // F-020: Picture-in-Picture
  // ─────────────────────────────────────────────────────────────────────────
  const togglePiP = useCallback(async () => {
    const el = screenSharing ? screenVideoRef.current : videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else {
        await el.requestPictureInPicture();
        setPipActive(true);
        el.addEventListener('leavepictureinpicture', () => setPipActive(false), { once: true });
      }
    } catch (err) { console.error('PiP failed', err); }
  }, [screenSharing]);

  // ─────────────────────────────────────────────────────────────────────────
  // F-027: Mute participant (signal via data channel)
  // ─────────────────────────────────────────────────────────────────────────
  const muteParticipant = useCallback(async (sid: string, mute: boolean) => {
    setMutedSids((prev) => {
      const next = new Set(prev);
      mute ? next.add(sid) : next.delete(sid);
      return next;
    });
    // Signal via MediaSoup / WebRTC data channel if needed in future
    console.log('muteParticipant', sid, mute);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // F-028/029: Spotlight participant (pin + broadcast)
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSpotlight = useCallback(async (sid: string) => {
    const next = spotlightSid === sid ? null : sid;
    setSpotlightSid(next);
    // Signal via MediaSoup / WebRTC data channel if needed in future
    console.log('toggleSpotlight', next);
  }, [spotlightSid]);

  // ── Send chat message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');

    // Optimistically add to local chat immediately (SSE echo will be deduplicated)
    const localMsg = {
      id: `host-${Date.now()}-${Math.random()}`,
      user: 'Host',
      avatar: 'HO',
      message: msg,
      time: new Date(),
      isHost: true,
    };
    setMessages((prev) => [...prev.slice(-49), localMsg]);

    // Broadcast chat via REST so all attendees receive it via SSE in both modes
    await webinarApi.sendChat(webinar?.joinCode || '', 'Host', msg).catch(() => {});
  }, [chatInput, connectionState, webinar]);

  // ── End webinar session ────────────────────────────────────────────────────
  const handleEndSession = async () => {
    setEnding(true);
    try {
      await webinarApi.endLive(id);
      // Close MediaSoup transports
      sendTransportRef.current?.close();
      takeoverSendTransportRef.current?.close();
      esRef.current?.close();
      router.push(`/dashboard/webinars/${id}`);
    } catch {
      setEnding(false);
    }
  };

  // ── Manual Local Recording Handlers ────────────────────────────────────────
  const startRecording = useCallback(() => {
    const stream = new MediaStream();
    
    if (webinar?.mode === 'semi_live' && videoRef.current) {
      // If semi-live, capture video stream of the playback element
      const captureStream = (videoRef.current as any).captureStream?.() || (videoRef.current as any).mozCaptureStream?.();
      if (captureStream) {
        captureStream.getTracks().forEach((t: any) => stream.addTrack(t));
      }
    } else {
      // Use tracks from the active video element stream
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((t) => stream.addTrack(t));
      } else if (localFallbackStreamRef.current) {
        localFallbackStreamRef.current.getTracks().forEach((t) => stream.addTrack(t));
      }
    }

    if (stream.getTracks().length === 0) {
      alert("No active audio/video feed found to record.");
      return;
    }

    recordedChunksRef.current = [];
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (typeof MediaRecorder !== 'undefined') {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
          }
        }
      }
    }

    try {
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length === 0) return;
        setUploadingRecording(true);
        try {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
          const filename = `recording_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;

          // Use proxy upload — sends file via backend to avoid MinIO CORS restrictions
          const result = await webinarApi.uploadRecording(id, blob, filename);
          alert("Recording saved and published as Replay successfully!");
          console.log('Recording uploaded:', result.publicUrl);
        } catch (err) {
          console.error(err);
          alert("Failed to upload recording file. Please try again.");
        } finally {
          setUploadingRecording(false);
        }
      };


      mediaRecorder.start(1000);
      setRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

    } catch (err) {
      console.error(err);
      alert("Could not start recording.");
    }
  }, [id, webinar]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  // ── Auto-start recording if enabled (F-046 / Competitor Parity) ───────────
  useEffect(() => {
    if (
      connectionState === 'connected' &&
      !recording &&
      webinar?.settings?.enableRecording === true
    ) {
      // Delay slightly to ensure tracks are fully attached to DOM
      const t = setTimeout(() => {
        if (!recording) {
          console.log('Auto-starting recording per settings...');
          startRecording();
        }
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [connectionState, recording, webinar?.settings?.enableRecording, startRecording]);


  // ── Semi-Live Engagement Actions ──────────────────────────────────────────
  const sendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    await webinarApi.broadcast(id, 'announcement', { text: announcementText.trim() });
    setAnnouncementText('');
    alert('Announcement broadcasted!');
  };

  const startPoll = async () => {
    if (!pollQuestion.trim()) return;
    const cleanOptions = pollOptions.filter(o => !!o.trim());
    if (cleanOptions.length < 2) {
      alert("Please provide at least 2 options.");
      return;
    }

    const pollId = `poll-${Date.now()}`;
    const pollData = {
      id: pollId,
      question: pollQuestion.trim(),
      options: cleanOptions.map((o, idx) => ({ id: `opt-${idx}`, text: o.trim(), votes: 0 })),
      totalVotes: 0,
      closed: false
    };

    await webinarApi.broadcast(id, 'poll_start', pollData);
    setActivePollId(pollId);
    setCurrentPoll(pollData);
    alert('Poll started!');
  };

  const endPoll = async () => {
    if (!activePollId) return;
    await webinarApi.broadcast(id, 'poll_end', { pollId: activePollId });
    setActivePollId(null);
    setCurrentPoll(null);
    alert('Poll ended!');
  };

  const toggleCTA = async () => {
    if (ctaActive) {
      await webinarApi.broadcast(id, 'cta_hide', {});
      setCtaActive(false);
    } else {
      if (!ctaTitle.trim() || !ctaUrl.trim()) {
        alert("Please enter CTA title and URL.");
        return;
      }
      await webinarApi.broadcast(id, 'cta_show', {
        cta: {
          id: `cta-${Date.now()}`,
          type: 'offer',
          title: ctaTitle.trim(),
          url: ctaUrl.trim(),
          cta_label: ctaLabel.trim() || 'Claim Offer',
          countdown_seconds: Number(ctaTimer) || 180,
          price: ctaPrice.trim() || undefined
        }
      });
      setCtaActive(true);
    }
  };

  const sendReaction = async (emoji: string) => {
    await webinarApi.broadcast(id, 'reaction', { emoji });
  };

  if (pageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#1C1C1C' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Connecting to Live Studio backstage…</p>
        </div>
      </div>
    );
  }

  const isSemi = webinar?.mode === 'semi_live';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden z-50 select-none" style={{ background: '#111111' }}>
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ background: '#1C1C1C', height: '48px', borderBottom: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/webinars/${id}`}
            className="flex items-center justify-center transition-all font-bold text-white/60 hover:text-white"
            title="Back to dashboard"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>
          {/* Zonvo branding */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ background: 'linear-gradient(135deg,#2563eb,#1d6fe8)' }}>Z</div>
            <span className="text-white font-bold text-sm tracking-tight">Zonvo</span>
          </div>
          <div className="w-px h-5" style={{ background: '#333' }} />
          <p className="text-white/70 text-xs truncate max-w-[200px]">{webinar?.title}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {recording && (
            <div className="flex items-center gap-1.5 rounded px-2.5 py-1 animate-pulse" style={{ background: '#2a0a0a', border: '1px solid #7f1d1d' }}>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-red-400 font-bold text-[11px] tracking-widest">REC</span>
              <span className="text-red-400/70 text-[11px] font-mono">{formatDuration(recordingTime)}</span>
            </div>
          )}
          {uploadingRecording && (
            <div className="flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: '#1a0d2e', border: '1px solid #4c1d95' }}>
              <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-violet-300 text-[11px] font-semibold">Saving…</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: '#1a0505', border: '1px solid #7f1d1d' }}>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-bold text-[11px] tracking-widest">LIVE</span>
            <span className="text-red-400/70 text-[11px] font-mono">{formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
            <span className="text-white/50 text-xs">👥</span>
            <span className="text-white font-semibold text-sm">{participantCount}</span>
            <span className="text-white/40 text-xs">watching</span>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ background: '#1C1C1C' }}>
            <EmojiReactionsOverlay incoming={incomingRxn} />
            {isSemi ? (
              // ── Semi-Live stage ──
              <>
                {/* Pre-recorded video (hidden when taken over) */}
                {!semiTakeover && webinar?.videoUrl && (
                  <video
                    ref={videoRef}
                    src={webinar.videoUrl}
                    className="w-full h-full object-contain"
                    muted
                    autoPlay
                    playsInline
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
                {!semiTakeover && !webinar?.videoUrl && (
                  <div className="text-muted-foreground text-xs">No video source configured.</div>
                )}

                {/* Live camera takeover stage */}
                {semiTakeover && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm rounded-xl px-3 py-1.5">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-foreground text-xs font-bold tracking-wide">YOU ARE LIVE</span>
                    </div>
                  </>
                )}

                {/* Host PiP camera overlay (only when NOT taken over) */}
                {!semiTakeover && (
                  <div
                    className={`absolute bottom-4 right-4 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${
                      semiCameraOn ? 'w-40 h-28 border-violet-500/60 opacity-100' : 'w-0 h-0 border-transparent opacity-0'
                    }`}
                  >
                    <video
                      ref={cameraRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}

                {/* Connecting overlay */}
                {takeoverConnecting && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                    <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-foreground font-semibold text-sm">Going Live…</p>
                    <p className="text-muted-foreground text-xs">Connecting your camera & mic</p>
                  </div>
                )}
              </>
            ) : (
              // ── Fully-Live: Camera feed element ──
              <>
                {/* Main camera — no CSS blur here; backgroundBlur applied on the MediaTrack itself */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraOn && !screenSharing ? 'scale-x-[-1]' : ''} ${!cameraOn || screenSharing ? 'hidden' : ''}`}
                />
                {/* F-019: Screen share video (full stage) */}
                {screenSharing && (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-slate-100"
                  />
                )}
                {/* Camera PiP when screen sharing */}
                {screenSharing && cameraOn && (
                  <div className="absolute bottom-4 right-4 w-44 h-28 rounded-2xl overflow-hidden border-2 border-violet-500/60 shadow-2xl shadow-black/50">
                    <video
                      ref={pipCameraRef}
                      autoPlay playsInline muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}
                {/* Spotlight badge */}
                {spotlightSid && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm rounded-xl px-3 py-1.5">
                    <span className="text-sm">📌</span>
                    <span className="text-foreground text-xs font-bold">
                      {viewers.find((v) => v.sid === spotlightSid)?.name ?? 'Spotlight'}
                    </span>
                  </div>
                )}
              </>
            )}

            {!isSemi && !cameraOn && (
              <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: '#1C1C1C' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white" style={{ background: '#2a2a2a' }}>
                  {(user?.email?.split('@')[0]?.charAt(0) ?? 'H').toUpperCase()}
                </div>
                <p className="text-white font-bold text-2xl mt-5 tracking-wide">{user?.email?.split('@')[0] ?? 'Host'}</p>
                <p className="text-white/40 text-xs mt-2">Camera is off</p>
              </div>
            )}
          </div>

          {/* Bottom controls — Zoom-style dark toolbar */}
          <div className="flex-shrink-0" style={{ background: '#111111', borderTop: '1px solid #2a2a2a' }}>
            {/* Device selector panel (F-026) */}
            {showDevicePanel && !isSemi && (
              <div className="px-4 py-3 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid #2a2a2a', background: '#1a1a1a' }}>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px] font-semibold uppercase">Camera</span>
                  <select
                    value={selectedCamera}
                    onChange={(e) => void switchCamera(e.target.value)}
                    className="rounded px-2 py-1 text-white text-xs focus:outline-none max-w-[180px]"
                    style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  >
                    {cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0,6)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px] font-semibold uppercase">Mic</span>
                  <select
                    value={selectedMic}
                    onChange={(e) => void switchMic(e.target.value)}
                    className="rounded px-2 py-1 text-white text-xs focus:outline-none max-w-[180px]"
                    style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  >
                    {mics.map((m) => (
                      <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${m.deviceId.slice(0,6)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${micOn ? 'text-emerald-400 border-emerald-600/40 bg-emerald-900/20' : 'text-white/40 border-white/10'}`}>
                    {micOn ? '🎤 Noise Cancel ON' : '🔇 Mic Off'}
                  </span>
                </div>
              </div>
            )}

            {/* Zoom-style toolbar row */}
            <div className="px-2 py-1 flex items-center justify-between" style={{ minHeight: '72px' }}>
              {/* Left group: media controls */}
              <div className="flex items-center">
              {!isSemi ? (
                <>
                  <CtrlBtn icon={micOn ? '🎙' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={() => void toggleMic()} />
                  <CtrlBtn icon={cameraOn ? '📹' : '📷'} label={cameraOn ? 'Stop Video' : 'Start Video'} active={cameraOn} onClick={() => void toggleCamera()} />
                  {/* F-019: Screen Share */}
                  <CtrlBtn
                    icon={screenSharing ? '🛑' : '🖥'}
                    label={screenSharing ? 'Stop Share' : 'Share'}
                    active={screenSharing}
                    danger={screenSharing}
                    onClick={() => void toggleScreenShare()}
                  />
                  {/* F-021: Background blur */}
                  <CtrlBtn
                    icon="🌫"
                    label={bgBlur ? 'Blur On' : 'Blur'}
                    active={bgBlur}
                    onClick={() => void toggleBgBlur()}
                  />
                  {/* F-020: PiP */}
                  <CtrlBtn
                    icon={pipActive ? '📺' : '⬛'}
                    label={pipActive ? 'Exit PiP' : 'PiP'}
                    active={pipActive}
                    onClick={() => void togglePiP()}
                  />
                  {/* F-026: Device settings */}
                  <CtrlBtn
                    icon="⚙️"
                    label="Settings"
                    active={showDevicePanel}
                    onClick={() => {
                      if (!showDevicePanel) void loadDevices();
                      setShowDevicePanel((v) => !v);
                    }}
                  />
                </>
              ) : semiTakeover ? (
                // Already live — show mic/cam controls for the live room
                <>
                  <CtrlBtn icon={micOn ? '🎙' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={() => {
                    if (audioProducerRef.current) {
                      micOn ? audioProducerRef.current.pause() : audioProducerRef.current.resume();
                    }
                    setMicOn(v => !v);
                  }} />
                  <CtrlBtn icon={'📹'} label={'Cam On'} active={true} onClick={() => {}} />
                  <div className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-emerald-400 font-semibold" style={{ background: '#0a1f0a', border: '1px solid #166534' }}>
                    🔴 Live Camera Active
                  </div>
                </>
              ) : (
                // Semi-live: PiP camera + Go Live button
                <>
                  <CtrlBtn
                    icon={semiMicOn ? '🎙' : '🔇'}
                    label={semiMicOn ? 'Mic On' : 'Mic Off'}
                    active={semiMicOn}
                    onClick={() => setSemiMicOn((v) => !v)}
                  />
                  <CtrlBtn
                    icon={semiCameraOn ? '📹' : '📷'}
                    label={semiCameraOn ? 'Preview On' : 'Preview'}
                    active={semiCameraOn}
                    onClick={() => setSemiCameraOn((v) => !v)}
                  />
                  <button
                    onClick={() => setShowTakeoverModal(true)}
                    disabled={takeoverConnecting}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-bold text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#e11d48)', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
                  >
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Go Live
                  </button>
                </>
              )}
              </div>

              {/* Center: Record */}
              <div className="flex items-center">
                <CtrlBtn
                  icon={recording ? '🔴' : '⏺'}
                  label={recording ? 'Recording' : 'Record'}
                  active={recording}
                  danger={recording}
                  onClick={recording ? stopRecording : startRecording}
                  disabled={uploadingRecording}
                />
              </div>

              {/* Right: End button */}
              <div className="flex items-center pr-2">
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#EF4444', minWidth: '72px' }}
                >
                  End
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Control Panel — light panel slides from right (Zoom style) */}
        <div className="w-[320px] flex flex-col overflow-hidden flex-shrink-0" style={{ background: '#ffffff', borderLeft: '1px solid #e5e7eb' }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {(['chat', 'viewers', 'control'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  activePanel === tab ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. CHAT PANEL */}
            {activePanel === 'chat' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {messages.length === 0 && <div className="text-center py-10 text-muted-foreground">No messages yet.</div>}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.isHost ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.isHost ? 'bg-[#1d6fe8] text-white' : 'bg-slate-200 text-foreground'}`}>
                        {msg.avatar}
                      </div>
                      <div className={`flex-1 flex flex-col ${msg.isHost ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] text-muted-foreground mb-0.5">{msg.user}</span>
                        <div className={`px-2.5 py-1.5 rounded-xl text-foreground ${msg.isHost ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
                    placeholder="Message to attendees…"
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-foreground placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]"
                  />
                  <button onClick={sendMessage} className="w-8 h-8 rounded-xl bg-[#1d6fe8] hover:bg-blue-600 text-white flex items-center justify-center">↑</button>
                </div>
              </div>
            )}

            {/* 2. VIEWERS LIST */}
            {activePanel === 'viewers' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-muted-foreground">Live audience ({participantCount} total)</p>
                  {raisedHands.size > 0 && (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-semibold animate-pulse">
                      ✋ {raisedHands.size} raised
                    </span>
                  )}
                  {spotlightSid && (
                    <button
                      onClick={() => void toggleSpotlight(spotlightSid)}
                      className="text-[10px] text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      📌 Clear Spotlight
                    </button>
                  )}
                </div>
                {viewers.length === 0 && <div className="text-center py-10 text-muted-foreground">Waiting for attendees…</div>}
                {viewers.map((v) => {
                  const isMuted     = mutedSids.has(v.sid);
                  const isSpotlight = spotlightSid === v.sid;
                  const hasHand     = raisedHands.has(v.name);
                  return (
                    <div
                      key={v.sid}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        hasHand
                          ? 'bg-amber-50 border-amber-300 animate-pulse'
                          : isSpotlight
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {v.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 truncate font-medium">
                        {v.name}
                        {hasHand && <span className="ml-1 text-amber-400">✋</span>}
                        {isSpotlight && <span className="ml-1 text-amber-400">📌</span>}
                        {isMuted && <span className="ml-1 text-red-400">🔇</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Lower hand */}
                        {hasHand && (
                          <button
                            onClick={() => setRaisedHands((prev) => { const n = new Set(prev); n.delete(v.name); return n; })}
                            title="Lower hand"
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
                          >✋</button>
                        )}
                        {/* F-028/029: Spotlight */}
                        <button
                          onClick={() => void toggleSpotlight(v.sid)}
                          title={isSpotlight ? 'Remove spotlight' : 'Spotlight'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-all ${
                            isSpotlight
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-slate-50 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >📌</button>
                        {/* F-027: Mute */}
                        <button
                          onClick={() => void muteParticipant(v.sid, !isMuted)}
                          title={isMuted ? 'Unmute signal' : 'Mute signal'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-all ${
                            isMuted
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-slate-50 text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
                          }`}
                        >{isMuted ? '🔇' : '🎤'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. ENGAGEMENT & CONTROLS PANEL */}
            {activePanel === 'control' && (
              <div className="space-y-6 text-xs pb-6">

                {/* F-042/F-039/F-040: Video Playback Controls */}
                {webinar?.mode === 'semi_live' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground border-b border-slate-200 pb-1">🎬 Video Playback Control</h4>

                    {/* Pause / Resume */}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (videoRef.current) videoRef.current.pause();
                          setVideoPaused(true);
                          try { await webinarApi.broadcast(webinar.id, 'video_pause', {}); } catch {}
                        }}
                        disabled={videoPaused}
                        className="flex-1 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-40 font-semibold transition-colors"
                      >⏸ Pause</button>
                      <button
                        onClick={async () => {
                          videoStartEpochRef.current = Date.now() - (videoRef.current?.currentTime ?? 0) * 1000;
                          if (videoRef.current) void videoRef.current.play().catch(() => {});
                          setVideoPaused(false);
                          try {
                            await webinarApi.broadcast(webinar.id, 'video_resume', {
                              epochMs: videoStartEpochRef.current,
                            });
                          } catch {}
                        }}
                        disabled={!videoPaused}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 font-semibold transition-colors"
                      >▶ Resume</button>
                    </div>

                    {/* Seek bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Seek position</span>
                        <span>{Math.floor((videoRef.current?.currentTime ?? 0) / 60)}:{String(Math.floor((videoRef.current?.currentTime ?? 0) % 60)).padStart(2, '0')}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.floor(videoRef.current?.duration ?? 0) || 100}
                        defaultValue={0}
                        onMouseUp={async (e) => {
                          const seekTo = Number((e.target as HTMLInputElement).value);
                          if (videoRef.current) videoRef.current.currentTime = seekTo;
                          videoStartEpochRef.current = Date.now() - seekTo * 1000;
                          try {
                            await webinarApi.broadcast(webinar.id, 'video_sync', {
                              epochMs: videoStartEpochRef.current,
                              paused: videoPaused,
                            });
                          } catch {}
                        }}
                        className="w-full accent-[#1d6fe8]"
                      />
                    </div>

                    {/* F-044: Replay behavior */}
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-[10px] uppercase tracking-wider">End-of-video behavior</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { v: 'stop',     label: '⏹ Stop',      desc: 'Show ended screen' },
                          { v: 'loop',     label: '🔁 Loop',      desc: 'Restart video' },
                          { v: 'auto_live', label: '📡 Go Live',  desc: 'Switch to camera' },
                        ] as const).map(({ v, label }) => (
                          <button
                            key={v}
                            onClick={() => setReplayBehavior(v)}
                            className={`py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
                              replayBehavior === v
                                ? 'bg-blue-50 border-blue-600 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-muted-foreground hover:text-foreground'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        {replayBehavior === 'stop' && 'Video ends → shows thank you screen'}
                        {replayBehavior === 'loop' && 'Video restarts automatically in loop'}
                        {replayBehavior === 'auto_live' && 'Video ends → switches to your live camera'}
                      </p>
                    </div>

                    {/* Manual sync nudge */}
                    <button
                      onClick={async () => {
                        videoStartEpochRef.current = Date.now() - (videoRef.current?.currentTime ?? 0) * 1000;
                        try {
                          await webinarApi.broadcast(webinar.id, 'video_sync', {
                            epochMs: videoStartEpochRef.current,
                            paused: videoPaused,
                          });
                        } catch {}
                      }}
                      className="w-full py-2 rounded-xl bg-slate-50 border border-slate-200 text-muted-foreground hover:text-foreground hover:bg-slate-100 font-semibold transition-colors"
                    >
                      🔄 Force Sync All Viewers
                    </button>
                  </div>
                )}

                {/* Reactions Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground border-b border-slate-200 pb-1">Float Reactions</h4>
                  <div className="flex gap-1.5 bg-slate-50 border border-slate-200 p-2 rounded-xl justify-around">
                    {['👍', '❤️', '🔥', '😂'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => void sendReaction(emoji)}
                        className="text-lg hover:scale-125 transition-transform"
                      >{emoji}</button>
                    ))}
                  </div>
                </div>

                {/* Announcement Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground border-b border-slate-200 pb-1">Broadcast Announcement</h4>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type header announcement message…"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-foreground placeholder-slate-400 focus:outline-none resize-none focus:border-[#1d6fe8]"
                  />
                  <button
                    onClick={sendAnnouncement}
                    disabled={!announcementText.trim()}
                    className="w-full py-2 bg-[#1d6fe8] hover:bg-blue-600 text-white disabled:opacity-40 rounded-xl font-semibold transition-colors"
                  >Broadcast Alert</button>
                </div>

                {/* Poll Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground border-b border-slate-200 pb-1">Poll Controller</h4>
                  {activePollId && currentPoll ? (
                    <div className="space-y-3 bg-blue-50 border border-blue-200 p-4 rounded-xl text-slate-800">
                      <p className="font-bold text-blue-700">Poll is active! 📊</p>
                      <p className="text-xs font-semibold text-slate-900">{currentPoll.question}</p>
                      <div className="space-y-2 mt-2">
                        {currentPoll.options.map((opt) => {
                          const pct = currentPoll.totalVotes > 0 ? Math.round((opt.votes / currentPoll.totalVotes) * 100) : 0;
                          return (
                            <div key={opt.id} className="text-[11px]">
                              <div className="flex justify-between font-medium text-slate-700 mb-0.5">
                                <span>{opt.text}</span>
                                <span>{opt.votes} votes ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">Total votes: {currentPoll.totalVotes}</p>
                      <button
                        onClick={endPoll}
                        className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors mt-2 text-xs"
                      >End Current Poll</button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Poll Question?"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-[#1d6fe8]"
                      />
                      <input
                        type="text"
                        value={pollOptions[0]}
                        onChange={(e) => setPollOptions([e.target.value, pollOptions[1]])}
                        placeholder="Option 1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                      />
                      <input
                        type="text"
                        value={pollOptions[1]}
                        onChange={(e) => setPollOptions([pollOptions[0], e.target.value])}
                        placeholder="Option 2"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                      />
                      <button
                        onClick={startPoll}
                        disabled={!pollQuestion.trim()}
                        className="w-full py-2 bg-[#1d6fe8] hover:bg-blue-600 text-white disabled:opacity-40 rounded-xl font-semibold transition-colors"
                      >Start Live Poll</button>
                    </div>
                  )}
                </div>

                {/* Offer CTA Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground border-b border-slate-200 pb-1">Offer & CTA Controller</h4>
                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <input
                      type="text"
                      value={ctaTitle}
                      onChange={(e) => setCtaTitle(e.target.value)}
                      placeholder="Offer title (e.g. 50% discount!)"
                      disabled={ctaActive}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                    />
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="Destination Checkout URL"
                      disabled={ctaActive}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                    />
                    <input
                      type="text"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Button Text (e.g. Buy Now)"
                      disabled={ctaActive}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ctaPrice}
                        onChange={(e) => setCtaPrice(e.target.value)}
                        placeholder="Price"
                        disabled={ctaActive}
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                      />
                      <input
                        type="number"
                        value={ctaTimer}
                        onChange={(e) => setCtaTimer(e.target.value)}
                        placeholder="Seconds"
                        disabled={ctaActive}
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 placeholder-slate-400 focus:outline-none text-[11px] focus:border-[#1d6fe8]"
                      />
                    </div>
                    <button
                      onClick={toggleCTA}
                      className={`w-full py-2 rounded-xl font-semibold transition-colors mt-1 ${
                        ctaActive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-[#1d6fe8] hover:bg-blue-600 text-white'
                      }`}
                    >
                      {ctaActive ? 'Hide/End Offer' : 'Show CTA Offer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Takeover Confirmation Modal */}
      <AnimatePresence>
        {showTakeoverModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl"
              style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#e11d48)', boxShadow: '0 8px 24px rgba(220,38,38,0.4)' }}>
                  📹
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Go Live with Camera?</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  The pre-recorded video will stop. Your live camera and microphone will be visible to all attendees in real time.
                </p>
              </div>

              <div className="rounded-xl px-4 py-3 mb-6" style={{ background: '#2a1f00', border: '1px solid #78350f' }}>
                <p className="text-amber-300 text-xs font-medium">
                  ⚠️ This action cannot be undone. Once you go live, you cannot return to the pre-recorded video.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => void handleGoLiveTakeover()}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#e11d48)', boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
                >
                  🔴 Yes, Go Live Now
                </button>
                <button
                  onClick={() => setShowTakeoverModal(false)}
                  className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#aaa' }}
                >
                  Cancel — Keep Video Playing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Session Confirm modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
              <div className="text-4xl mb-4 text-center">⏹</div>
              <h3 className="text-white font-bold text-lg text-center mb-2">End Live Session?</h3>
              <p className="text-white/50 text-sm text-center mb-6">Duration: <strong className="text-white">{formatDuration(elapsed)}</strong> · {participantCount} viewers</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/70 transition-all" style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}>Cancel</button>
                <button onClick={() => { setShowEndConfirm(false); void handleEndSession(); }} disabled={ending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all" style={{ background: '#EF4444' }}>
                  {ending ? 'Ending…' : 'End Session'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
