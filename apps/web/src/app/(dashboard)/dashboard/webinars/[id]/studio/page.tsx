'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
  Track,
} from 'livekit-client';
import { webinarApi, type Webinar } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

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

// ─── Control Button ───────────────────────────────────────────────────────────
function CtrlBtn({ icon, label, active = true, danger = false, onClick, disabled = false }: {
  icon: string; label: string; active?: boolean; danger?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-200 min-w-[72px] disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400'
          : active
          ? 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
          : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/60'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
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


  // Refs for tracking streams
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null); // PiP camera for semi-live takeover
  const pipCameraRef = useRef<HTMLVideoElement>(null); // Camera PiP when screen sharing
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null); // screen share track
  const localFallbackStreamRef = useRef<MediaStream | null>(null);
  const semiStreamRef = useRef<MediaStream | null>(null); // Camera stream for semi-live mode
  const esRef = useRef<EventSource | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null); // screen share preview

  // Controls & Panels
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [activePanel, setActivePanel] = useState<'chat' | 'viewers' | 'control'>('chat');

  // Semi-live camera/mic takeover states
  const [semiCameraOn, setSemiCameraOn] = useState(false);
  const [semiMicOn, setSemiMicOn] = useState(false);

  // Full takeover states (semi-live → fully live)
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [semiTakeover, setSemiTakeover] = useState(false);  // true = host went fully live
  const [takeoverConnecting, setTakeoverConnecting] = useState(false);
  const takeoverRoomRef = useRef<Room | null>(null);

  // Live stats
  const [elapsed, setElapsed] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [viewers, setViewers] = useState<Viewer[]>([]);

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

  // ── Load webinar + connect LiveKit / SSE ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const w = await webinarApi.get(id);
        if (cancelled) return;

        if (w.status !== 'live') {
          router.replace(`/dashboard/webinars/${id}`);
          return;
        }

        setWebinar(w);
        if (w.startedAt) {
          setElapsed(Math.floor((Date.now() - new Date(w.startedAt).getTime()) / 1000));
        }

        if (w.mode === 'semi_live') {
          // ── Semi-Live: Connect via SSE to monitor chat/viewers ──
          setConnectionState('connecting');
          const es = webinarApi.openEventStream(w.joinCode || '', 'Host');
          esRef.current = es;

          es.addEventListener('connected', () => {
            setConnectionState('connected');
          });

          es.addEventListener('viewer_count', (e: MessageEvent) => {
            const d = JSON.parse(e.data) as { count: number };
            setParticipantCount(d.count);
          });

          es.addEventListener('chat', (e: MessageEvent) => {
            const d = JSON.parse(e.data) as { user: string; message: string; time: string };
            // Filter out vote messages from general chat
            if (d.message.startsWith('__vote__')) {
              try {
                const vote = JSON.parse(d.message.replace('__vote__', '')) as { pollId: string; optionId: string };
                // Handle live poll result updates on Host control panel
                console.log('Received vote:', vote);
              } catch {}
              return;
            }

            const msg: ChatMessage = {
              id: `${Date.now()}-${Math.random()}`,
              user: d.user,
              avatar: d.user.substring(0, 2).toUpperCase(),
              message: d.message,
              time: new Date(d.time),
              isHost: d.user.toLowerCase().includes('host'),
            };
            setMessages((prev) => [...prev.slice(-49), msg]);
          });

          es.onerror = () => setConnectionState('error');
          setPageLoading(false);

        } else {
          // ── Fully-Live: Connect via LiveKit WebRTC ──
          setConnectionState('connecting');
          const displayName = user?.email?.split('@')[0] ?? 'Host';
          const { token, livekitUrl } = await webinarApi.getHostToken(id, displayName);

          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            // F-025: automatic reconnection
            reconnectPolicy: { nextRetryDelayInMs: (ctx) => Math.min(ctx.retryCount * 1000, 10000) },
          });
          roomRef.current = room;

          const syncViewers = () => {
            const list = Array.from(room.remoteParticipants.values()).map((p) => ({
              sid: p.sid,
              name: p.name ?? p.identity ?? 'Attendee',
              joinedAt: new Date(),
            }));
            setViewers(list);
            setParticipantCount(list.length);
          };

          room.on(RoomEvent.ParticipantConnected, syncViewers);
          room.on(RoomEvent.ParticipantDisconnected, syncViewers);
          room.on(RoomEvent.DataReceived, (data) => {
            try {
              const ev = JSON.parse(new TextDecoder().decode(data)) as {
                type?: string; user?: string; message?: string;
                raised?: boolean; emoji?: string;
              };
              if (ev.type === 'message' || (!ev.type && ev.message)) {
                // Chat message from attendee
                setMessages((prev) => [
                  ...prev.slice(-49),
                  { id: Date.now().toString(), user: ev.user ?? 'Attendee', avatar: (ev.user ?? 'At').substring(0, 2).toUpperCase(), message: ev.message ?? '', time: new Date() },
                ]);
              } else if (ev.type === 'raise_hand') {
                // F-032: Track raised hands by participant name
                setRaisedHands((prev) => {
                  const next = new Set(prev);
                  ev.raised ? next.add(ev.user ?? '') : next.delete(ev.user ?? '');
                  return next;
                });
                // Auto-clear after 35s if host doesn't see it
                if (ev.raised) {
                  setTimeout(() => setRaisedHands((prev) => { const n = new Set(prev); n.delete(ev.user ?? ''); return n; }), 35000);
                }
              } else if (ev.type === 'reaction') {
                // Reactions are for broadcast, no UI needed in studio
              }
            } catch { /* ignore */ }
          });
          room.on(RoomEvent.Disconnected, () => setConnectionState('idle'));
          room.on(RoomEvent.Reconnecting, () => setConnectionState('connecting'));
          room.on(RoomEvent.Reconnected, () => setConnectionState('connected'));

          await room.connect(livekitUrl, token);
          if (cancelled) { await room.disconnect(); return; }

          setConnectionState('connected');
          setParticipantCount(room.remoteParticipants.size);
          setViewers(Array.from(room.remoteParticipants.values()).map((p) => ({
            sid: p.sid,
            name: p.name ?? p.identity ?? 'Attendee',
            joinedAt: new Date(),
          })));

          // F-022: Publish with noise + echo cancellation enabled
          const [videoTrack, audioTrack] = await Promise.all([
            createLocalVideoTrack({ resolution: { width: 1280, height: 720 } }),
            createLocalAudioTrack({ noiseSuppression: true, echoCancellation: true }),
          ]);

          localVideoTrackRef.current = videoTrack;
          localAudioTrackRef.current = audioTrack;

          await room.localParticipant.publishTrack(videoTrack);
          await room.localParticipant.publishTrack(audioTrack);
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
      localVideoTrackRef.current?.stop();
      localAudioTrackRef.current?.stop();
      void roomRef.current?.disconnect();
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

  // ── Bind camera tracks for Fully-Live ──────────────────────────────────────
  useEffect(() => {
    if (pageLoading || webinar?.mode === 'semi_live') return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (localVideoTrackRef.current) {
      if (cameraOn) {
        localVideoTrackRef.current.attach(videoElement);
        videoElement.play().catch(() => {});
      } else {
        localVideoTrackRef.current.detach(videoElement);
      }
    } else if (localFallbackStreamRef.current) {
      if (cameraOn) {
        videoElement.srcObject = localFallbackStreamRef.current;
        videoElement.play().catch(() => {});
      } else {
        videoElement.srcObject = null;
      }
    }

    return () => {
      if (videoElement) {
        if (localVideoTrackRef.current) localVideoTrackRef.current.detach(videoElement);
        videoElement.srcObject = null;
      }
    };
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

  // ── Screen share: attach track AFTER React mounts the video element ──────────
  // We CANNOT attach inside the async handler because the <video ref={screenVideoRef}>
  // element is conditional — React hasn't re-rendered yet when setScreenSharing(true) is called.
  useEffect(() => {
    if (!screenSharing || !screenVideoRef.current || !screenTrackRef.current) return;
    const el = screenVideoRef.current;
    screenTrackRef.current.attach(el);
    el.play().catch(() => {});
    return () => {
      screenTrackRef.current?.detach(el);
    };
  }, [screenSharing]);

  // ── Camera PiP during screen share: attach camera track to pipCameraRef ──────
  useEffect(() => {
    if (!screenSharing || !cameraOn || !pipCameraRef.current) return;
    const el = pipCameraRef.current;
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.attach(el);
      el.play().catch(() => {});
      return () => { localVideoTrackRef.current?.detach(el); };
    }
    // Fallback: use localFallbackStreamRef
    if (localFallbackStreamRef.current) {
      el.srcObject = localFallbackStreamRef.current;
      el.play().catch(() => {});
      return () => { el.srcObject = null; };
    }
  }, [screenSharing, cameraOn]);

  // ── Mic/Camera toggles ─────────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!micOn);
    } else if (localAudioTrackRef.current) {
      micOn ? localAudioTrackRef.current.mute() : localAudioTrackRef.current.unmute();
    }
    setMicOn((v) => !v);
  }, [micOn]);

  const toggleCamera = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(!cameraOn);
    } else if (localVideoTrackRef.current) {
      cameraOn ? localVideoTrackRef.current.mute() : localVideoTrackRef.current.unmute();
    }
    setCameraOn((v) => !v);
  }, [cameraOn]);

  // ── Go Live Takeover ─────────────────────────────────────────────────────────
  const handleGoLiveTakeover = useCallback(async () => {
    if (!webinar || takeoverConnecting) return;
    setTakeoverConnecting(true);
    setShowTakeoverModal(false);
    try {
      const displayName = user?.email?.split('@')[0] ?? 'Host';
      const { token, livekitUrl } = await webinarApi.getHostToken(id, displayName);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      takeoverRoomRef.current = room;
      await room.connect(livekitUrl, token);

      // Enable camera + mic
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Attach camera to main video element
      const camTrackPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
      if (camTrackPub?.track && videoRef.current) {
        camTrackPub.track.attach(videoRef.current);
        videoRef.current.play().catch(() => {});
      }

      // Stop pre-recorded video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.src = '';
      }

      // Broadcast takeover_start to all attendees
      await webinarApi.broadcast(webinar.id, 'takeover_start', {
        livekitUrl,
        roomName: webinar.joinCode ?? id,
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

  // ── Cleanup takeover room on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => { void takeoverRoomRef.current?.disconnect(); };
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
    if (!roomRef.current) return;
    try {
      // Stop current video track
      localVideoTrackRef.current?.stop();
      // Create new track with selected device
      const track = await createLocalVideoTrack({
        deviceId,
        resolution: { width: 1280, height: 720 },
      });
      localVideoTrackRef.current = track;
      await roomRef.current.localParticipant.publishTrack(track);
      if (videoRef.current) {
        track.attach(videoRef.current);
        videoRef.current.play().catch(() => {});
      }
    } catch (err) { console.error('Switch camera failed', err); }
  }, []);

  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId);
    if (!roomRef.current) return;
    try {
      localAudioTrackRef.current?.stop();
      const track = await createLocalAudioTrack({
        deviceId,
        noiseSuppression: true,
        echoCancellation: true,
      });
      localAudioTrackRef.current = track;
      await roomRef.current.localParticipant.publishTrack(track);
    } catch (err) { console.error('Switch mic failed', err); }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // F-019: Screen sharing
  // ─────────────────────────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      // Stop screen share — detach handled by useEffect cleanup
      screenTrackRef.current?.stop();
      if (roomRef.current) {
        const pub = Array.from(roomRef.current.localParticipant.videoTrackPublications.values())
          .find((p) => p.source === Track.Source.ScreenShare);
        if (pub?.track) await roomRef.current.localParticipant.unpublishTrack(pub.track);
      }
      screenTrackRef.current = null;
      setScreenSharing(false);
    } else {
      try {
        const [screenTrack] = await createLocalScreenTracks({ audio: false });
        screenTrackRef.current = screenTrack as LocalVideoTrack;

        // Publish to LiveKit room
        if (roomRef.current) {
          await roomRef.current.localParticipant.publishTrack(screenTrack);
        }

        // Auto-stop when user clicks browser "Stop sharing"
        screenTrack.mediaStreamTrack.onended = () => {
          setScreenSharing(false);
          screenTrackRef.current = null;
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
      localVideoTrackRef.current?.mediaStreamTrack ??
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
    if (roomRef.current) {
      const signal = new TextEncoder().encode(
        JSON.stringify({ type: 'host_mute', targetSid: sid, muted: mute }),
      );
      await roomRef.current.localParticipant.publishData(signal, { reliable: true });
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // F-028/029: Spotlight participant (pin + broadcast)
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSpotlight = useCallback(async (sid: string) => {
    const next = spotlightSid === sid ? null : sid;
    setSpotlightSid(next);
    if (roomRef.current) {
      const signal = new TextEncoder().encode(
        JSON.stringify({ type: 'spotlight', targetSid: next }),
      );
      await roomRef.current.localParticipant.publishData(signal, { reliable: true });
    }
  }, [spotlightSid]);

  // ── Send chat message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');

    if (webinar?.mode === 'semi_live') {
      // Semi-Live: Broadcast chat via REST so all attendees receive it via SSE
      await webinarApi.sendChat(webinar.joinCode || '', 'Host', msg).catch(() => {});
    } else {
      // Fully-Live: Broadcast via LiveKit Data Channel
      const myMsg: ChatMessage = {
        id: Date.now().toString(),
        user: 'You (Host)',
        avatar: 'H',
        message: msg,
        time: new Date(),
        isHost: true,
      };
      setMessages((prev) => [...prev, myMsg]);

      if (roomRef.current && connectionState === 'connected') {
        const data = new TextEncoder().encode(JSON.stringify({ user: 'Host', message: msg }));
        await roomRef.current.localParticipant.publishData(data, { reliable: true });
      }
    }
  }, [chatInput, connectionState, webinar]);

  // ── End webinar session ────────────────────────────────────────────────────
  const handleEndSession = async () => {
    setEnding(true);
    try {
      await webinarApi.endLive(id);
      await roomRef.current?.disconnect();
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
      if (localVideoTrackRef.current?.mediaStreamTrack) stream.addTrack(localVideoTrackRef.current.mediaStreamTrack);
      if (localAudioTrackRef.current?.mediaStreamTrack) stream.addTrack(localAudioTrackRef.current.mediaStreamTrack);
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
          const contentType = mimeType || 'video/webm';

          const { uploadUrl, publicUrl } = await webinarApi.getRecordingUploadUrl(id, filename, contentType);

          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: blob,
          });
          if (!uploadRes.ok) throw new Error(`Upload status ${uploadRes.status}`);

          await webinarApi.update(id, { replayUrl: publicUrl });
          alert("Recording saved and published as Replay successfully!");
        } catch (err) {
          console.error(err);
          alert("Failed to upload recording file.");
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
    alert('Poll started!');
  };

  const endPoll = async () => {
    if (!activePollId) return;
    await webinarApi.broadcast(id, 'poll_end', { pollId: activePollId });
    setActivePollId(null);
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
      <div className="fixed inset-0 bg-[#08080f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Connecting to Live Studio backstage…</p>
        </div>
      </div>
    );
  }

  const isSemi = webinar?.mode === 'semi_live';

  return (
    <div className="fixed inset-0 bg-[#08080f] flex flex-col overflow-hidden z-50 select-none">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d0d14] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/webinars/${id}`}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all font-bold"
          >←</Link>
          <div>
            <p className="text-white font-semibold text-sm leading-tight truncate max-w-xs">{webinar?.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                🔴 Studio Control
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {recording && (
            <div className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 rounded-xl px-3 py-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-red-400 font-bold text-xs tracking-wide">REC</span>
              <span className="text-red-400/80 text-xs font-mono">{formatDuration(recordingTime)}</span>
            </div>
          )}
          {uploadingRecording && (
            <div className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/30 rounded-xl px-3 py-1.5">
              <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-violet-400 text-xs font-semibold">Saving Rec…</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-bold text-xs tracking-wide">LIVE</span>
            <span className="text-red-400/80 text-xs font-mono">{formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
            <span className="text-xs">👥</span>
            <span className="text-white font-semibold text-sm">{participantCount}</span>
            <span className="text-white/30 text-xs">watching</span>
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >⏹ End Session</button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-[#09090e] overflow-hidden flex items-center justify-center">
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
                  <div className="text-white/40 text-xs">No video source configured.</div>
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
                      <span className="text-white text-xs font-bold tracking-wide">YOU ARE LIVE</span>
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
                    <p className="text-white font-semibold text-sm">Going Live…</p>
                    <p className="text-white/40 text-xs">Connecting your camera & mic</p>
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
                    className="w-full h-full object-contain bg-black"
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
                    <span className="text-white text-xs font-bold">
                      {viewers.find((v) => v.sid === spotlightSid)?.name ?? 'Spotlight'}
                    </span>
                  </div>
                )}
              </>
            )}

            {!isSemi && !cameraOn && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d14]">
                <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center text-3xl font-bold">H</div>
                <p className="text-white/40 text-xs mt-2">Camera off</p>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="bg-[#0d0d14] border-t border-white/[0.06] flex-shrink-0">
            {/* Device selector panel (F-026) */}
            {showDevicePanel && !isSemi && (
              <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0a0a12] flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px] font-semibold uppercase">Camera</span>
                  <select
                    value={selectedCamera}
                    onChange={(e) => void switchCamera(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-2 py-1 text-white text-xs focus:outline-none max-w-[180px]"
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
                    className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-2 py-1 text-white text-xs focus:outline-none max-w-[180px]"
                  >
                    {mics.map((m) => (
                      <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${m.deviceId.slice(0,6)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${micOn ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-white/30 border-white/10'}`}>
                    {micOn ? '🎤 Noise Cancel ON' : '🔇 Mic Off'}
                  </span>
                </div>
              </div>
            )}

            <div className="px-4 py-3 flex items-center justify-center gap-2">
            {!isSemi ? (
              <>
                <CtrlBtn icon={micOn ? '🎙' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} active={micOn} onClick={() => void toggleMic()} />
                <CtrlBtn icon={cameraOn ? '📹' : '📷'} label={cameraOn ? 'Cam Off' : 'Cam On'} active={cameraOn} onClick={() => void toggleCamera()} />
                {/* F-019: Screen Share */}
                <CtrlBtn
                  icon={screenSharing ? '🛑' : '🖥'}
                  label={screenSharing ? 'Stop Share' : 'Share Screen'}
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
                  void takeoverRoomRef.current?.localParticipant.setMicrophoneEnabled(!micOn);
                  setMicOn(v => !v);
                }} />
                <CtrlBtn icon={'📹'} label={'Cam On'} active={true} onClick={() => {}} />
                <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Go Live with Camera
                </button>
              </>
            )}
            <div className="w-px h-10 bg-white/[0.06] mx-1" />
            <CtrlBtn
              icon={recording ? '🔴' : '⏺'}
              label={recording ? 'Recording' : 'Record'}
              active={recording}
              danger={recording}
              onClick={recording ? stopRecording : startRecording}
              disabled={uploadingRecording}
            />
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Control Panel */}
        <div className="w-[320px] border-l border-white/[0.06] bg-[#0d0d14] flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex border-b border-white/[0.06] flex-shrink-0">
            {(['chat', 'viewers', 'control'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  activePanel === tab ? 'text-violet-400 border-violet-500 bg-white/[0.01]' : 'text-white/30 border-transparent hover:text-white/50'
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
                  {messages.length === 0 && <div className="text-center py-10 text-white/20">No messages yet.</div>}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.isHost ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.isHost ? 'bg-violet-600' : 'bg-white/10 text-white/60'}`}>
                        {msg.avatar}
                      </div>
                      <div className={`flex-1 flex flex-col ${msg.isHost ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] text-white/30 mb-0.5">{msg.user}</span>
                        <div className={`px-2.5 py-1.5 rounded-xl text-white/80 ${msg.isHost ? 'bg-violet-600/20 border border-violet-500/20' : 'bg-white/[0.04]'}`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
                    placeholder="Message to attendees…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60"
                  />
                  <button onClick={sendMessage} className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center">↑</button>
                </div>
              </div>
            )}

            {/* 2. VIEWERS LIST */}
            {activePanel === 'viewers' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40">Live audience ({participantCount} total)</p>
                  {raisedHands.size > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-semibold animate-pulse">
                      ✋ {raisedHands.size} raised
                    </span>
                  )}
                  {spotlightSid && (
                    <button
                      onClick={() => void toggleSpotlight(spotlightSid)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      📌 Clear Spotlight
                    </button>
                  )}
                </div>
                {viewers.length === 0 && <div className="text-center py-10 text-white/20">Waiting for attendees…</div>}
                {viewers.map((v) => {
                  const isMuted     = mutedSids.has(v.sid);
                  const isSpotlight = spotlightSid === v.sid;
                  const hasHand     = raisedHands.has(v.name);
                  return (
                    <div
                      key={v.sid}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        hasHand
                          ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                          : isSpotlight
                          ? 'bg-amber-500/10 border-amber-500/25'
                          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
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
                              : 'bg-white/[0.04] text-white/30 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >📌</button>
                        {/* F-027: Mute */}
                        <button
                          onClick={() => void muteParticipant(v.sid, !isMuted)}
                          title={isMuted ? 'Unmute signal' : 'Mute signal'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-all ${
                            isMuted
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-white/[0.04] text-white/30 hover:text-red-400 hover:bg-red-500/10'
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
                    <h4 className="font-semibold text-white/80 border-b border-white/[0.05] pb-1">🎬 Video Playback Control</h4>

                    {/* Pause / Resume */}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (videoRef.current) videoRef.current.pause();
                          setVideoPaused(true);
                          try { await webinarApi.broadcast(webinar.id, 'video_pause', {}); } catch {}
                        }}
                        disabled={videoPaused}
                        className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 font-semibold transition-colors"
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
                        className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 font-semibold transition-colors"
                      >▶ Resume</button>
                    </div>

                    {/* Seek bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-white/40">
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
                        className="w-full accent-violet-500"
                      />
                    </div>

                    {/* F-044: Replay behavior */}
                    <div className="space-y-1.5">
                      <label className="text-white/40 text-[10px] uppercase tracking-wider">End-of-video behavior</label>
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
                                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                      <p className="text-white/20 text-[10px]">
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
                      className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06] font-semibold transition-colors"
                    >
                      🔄 Force Sync All Viewers
                    </button>
                  </div>
                )}

                {/* Reactions Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white/80 border-b border-white/[0.05] pb-1">Float Reactions</h4>
                  <div className="flex gap-1.5 bg-white/[0.02] border border-white/[0.05] p-2 rounded-xl justify-around">
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
                  <h4 className="font-semibold text-white/80 border-b border-white/[0.05] pb-1">Broadcast Announcement</h4>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type header announcement message…"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white placeholder-white/20 focus:outline-none resize-none"
                  />
                  <button
                    onClick={sendAnnouncement}
                    disabled={!announcementText.trim()}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
                  >Broadcast Alert</button>
                </div>

                {/* Poll Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white/80 border-b border-white/[0.05] pb-1">Poll Controller</h4>
                  {activePollId ? (
                    <div className="space-y-2 bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl">
                      <p className="font-bold text-violet-400">Poll is active! 📊</p>
                      <p className="text-[10px] text-white/60">Attendees can see and vote in real-time.</p>
                      <button
                        onClick={endPoll}
                        className="w-full py-2 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-colors mt-2"
                      >End Current Poll</button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Poll Question?"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 placeholder-white/20 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={pollOptions[0]}
                        onChange={(e) => setPollOptions([e.target.value, pollOptions[1]])}
                        placeholder="Option 1"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                      />
                      <input
                        type="text"
                        value={pollOptions[1]}
                        onChange={(e) => setPollOptions([pollOptions[0], e.target.value])}
                        placeholder="Option 2"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                      />
                      <button
                        onClick={startPoll}
                        disabled={!pollQuestion.trim()}
                        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
                      >Start Live Poll</button>
                    </div>
                  )}
                </div>

                {/* Offer CTA Control */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white/80 border-b border-white/[0.05] pb-1">Offer & CTA Controller</h4>
                  <div className="space-y-2 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl">
                    <input
                      type="text"
                      value={ctaTitle}
                      onChange={(e) => setCtaTitle(e.target.value)}
                      placeholder="Offer title (e.g. 50% discount!)"
                      disabled={ctaActive}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                    />
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="Destination Checkout URL"
                      disabled={ctaActive}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                    />
                    <input
                      type="text"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Button Text (e.g. Buy Now)"
                      disabled={ctaActive}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ctaPrice}
                        onChange={(e) => setCtaPrice(e.target.value)}
                        placeholder="Price"
                        disabled={ctaActive}
                        className="w-1/2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                      />
                      <input
                        type="number"
                        value={ctaTimer}
                        onChange={(e) => setCtaTimer(e.target.value)}
                        placeholder="Seconds"
                        disabled={ctaActive}
                        className="w-1/2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 placeholder-white/20 focus:outline-none text-[11px]"
                      />
                    </div>
                    <button
                      onClick={toggleCTA}
                      className={`w-full py-2 rounded-xl font-semibold transition-colors mt-1 ${
                        ctaActive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0d0d14] border border-white/[0.10] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-red-500/30">
                  📹
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Go Live with Camera?</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  The pre-recorded video will stop. Your live camera and microphone will be visible to all attendees in real time.
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
                <p className="text-amber-400 text-xs font-medium">
                  ⚠️ This action cannot be undone. Once you go live, you cannot return to the pre-recorded video.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => void handleGoLiveTakeover()}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  🔴 Yes, Go Live Now
                </button>
                <button
                  onClick={() => setShowTakeoverModal(false)}
                  className="w-full py-3 rounded-2xl text-sm font-medium text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="text-4xl mb-4 text-center">⏹</div>
              <h3 className="text-white font-bold text-lg text-center mb-2">End Live Session?</h3>
              <p className="text-white/50 text-sm text-center mb-6">Duration: <strong className="text-white">{formatDuration(elapsed)}</strong> · {participantCount} viewers</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all">Cancel</button>
                <button onClick={() => { setShowEndConfirm(false); void handleEndSession(); }} disabled={ending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 transition-all">
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
