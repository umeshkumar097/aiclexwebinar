'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Upload, Zap } from 'lucide-react';
import { webinarApi, type Webinar } from '@/lib/api';

type WebinarMode = 'semi_live' | 'fully_live';
type Step = 1 | 2 | 3;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recurrence {
  frequency: 'weekly' | 'monthly';
  daysOfWeek: number[]; // 0=Sun ... 6=Sat
  dayOfMonth: number;   // 1–28
  endDate: string;
  occurrences: number;
}

interface FormData {
  title: string;
  description: string;
  mode: WebinarMode;
  scheduledAt: string;
  duration: number;
  maxAttendees: number;
  timezone: string;
  requireRegistration: boolean;
  enableChat: boolean;
  enablePolls: boolean;
  enableOffers: boolean;
  password: string;
  videoUrl: string;
  thumbnailUrl: string; // top-level cover image
  // Competitor-parity settings
  repeat: boolean;
  privateWebinar: boolean;
  requireLogin: boolean;
  waitingRoom: boolean;
  waitingThumbnailUrl: string;
  enableWatermark: boolean;
  showLiveCount: boolean;
  enableRecording: boolean;
  // Tags
  tags: string[];
  // Branding
  brandingLogoUrl: string;
  brandingAccentColor: string;
  // Recurrence
  recurrence: Recurrence;
}

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Calcutta', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Shanghai', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland',
  'UTC',
];

const PRESET_TAGS = ['Marketing', 'Sales', 'Training', 'Product Demo', 'HR', 'Tech', 'Finance', 'Healthcare'];

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  mode: 'semi_live',
  scheduledAt: '',
  duration: 60,
  maxAttendees: 500,
  timezone: 'UTC',
  requireRegistration: true,
  enableChat: true,
  enablePolls: true,
  enableOffers: false,
  password: '',
  videoUrl: '',
  thumbnailUrl: '',
  repeat: false,
  privateWebinar: false,
  requireLogin: false,
  waitingRoom: false,
  waitingThumbnailUrl: '',
  enableWatermark: false,
  showLiveCount: true,
  enableRecording: true,
  tags: [],
  brandingLogoUrl: '',
  brandingAccentColor: '#8b5cf6',
  recurrence: {
    frequency: 'weekly',
    daysOfWeek: [],
    dayOfMonth: 1,
    endDate: '',
    occurrences: 0,
  },
};

const STEPS = [
  { num: 1 as Step, label: 'Basics' },
  { num: 2 as Step, label: 'Settings' },
  { num: 3 as Step, label: 'Review' },
];

// ─── Templates ────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  features: string[];
  patch: Partial<FormData>;
}

const TEMPLATES: Template[] = [
  {
    id: 'tpl-product-demo',
    emoji: '🎯',
    name: 'Product Demo',
    desc: '60-min demo of your product',
    features: ['Chat', 'Polls', 'Offers', 'Semi-live'],
    patch: {
      duration: 60, enableChat: true, enablePolls: true, enableOffers: true,
      mode: 'semi_live', requireRegistration: true,
    },
  },
  {
    id: 'tpl-training',
    emoji: '🎓',
    name: 'Training Session',
    desc: '90-min training webinar',
    features: ['Chat', 'Q&A', 'Registration', 'Fully-live'],
    patch: {
      duration: 90, enableChat: true, enablePolls: true, enableOffers: false,
      mode: 'fully_live', requireRegistration: true, requireLogin: true,
    },
  },
  {
    id: 'tpl-town-hall',
    emoji: '📢',
    name: 'Town Hall',
    desc: '60-min all-hands event',
    features: ['Q&A', 'Live count', 'Fully-live'],
    patch: {
      duration: 60, enableChat: false, enablePolls: true, showLiveCount: true,
      mode: 'fully_live', requireRegistration: false,
    },
  },
  {
    id: 'tpl-launch',
    emoji: '🚀',
    name: 'Launch Event',
    desc: '120-min product launch',
    features: ['All features', 'Max attendees', 'Fully-live'],
    patch: {
      duration: 120, enableChat: true, enablePolls: true, enableOffers: true,
      showLiveCount: true, enableRecording: true, mode: 'fully_live',
      maxAttendees: 2000, requireRegistration: true,
    },
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
            step.num < current ? 'bg-[#1d6fe8] text-white' :
            step.num === current ? 'bg-[#1d6fe8] text-white ring-4 ring-blue-500/20' :
            'bg-slate-100 text-muted-foreground'
          }`}>
            {step.num < current ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : step.num}
          </div>
          <span className={`text-sm font-medium transition-colors ${step.num === current ? 'text-white' : 'text-muted-foreground'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-px mx-1 transition-colors ${step.num < current ? 'bg-blue-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ModeCard({ mode, selected, onClick }: { mode: WebinarMode; selected: boolean; onClick: () => void }) {
  const config = {
    semi_live: {
      title: 'Semi-Live',
      subtitle: 'Pre-recorded + Live Takeover',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'violet',
      badge: 'Recommended',
    },
    fully_live: {
      title: 'Fully Live',
      subtitle: 'Full real-time streaming',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M12 12h.01" />
        </svg>
      ),
      color: 'orange',
      badge: null,
    },
  };

  const c = config[mode];
  const isViolet = c.color === 'violet';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
        selected
          ? isViolet
            ? 'border-[#1d6fe8] bg-blue-50'
            : 'border-[#f4b413] bg-amber-50'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {c.badge && (
        <span className="absolute top-3 right-3 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
          {c.badge}
        </span>
      )}

      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        selected
          ? isViolet ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
          : 'bg-slate-100 text-muted-foreground'
      }`}>
        {c.icon}
      </div>

      <h3 className="font-semibold text-foreground text-lg mb-1">{c.title}</h3>
      <p className="text-sm text-muted-foreground">{c.subtitle}</p>

      {selected && (
        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full ${isViolet ? 'bg-violet-500' : 'bg-orange-500'} flex items-center justify-center`}>
          <svg className="w-3 h-3 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-violet-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ─── Recurrence UI ────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RecurrencePanel({ recurrence, onChange, startDate }: {
  recurrence: Recurrence;
  onChange: (r: Recurrence) => void;
  startDate: string;
}) {
  const update = (patch: Partial<Recurrence>) => onChange({ ...recurrence, ...patch });

  const toggleDay = (day: number) => {
    const d = recurrence.daysOfWeek.includes(day)
      ? recurrence.daysOfWeek.filter((x) => x !== day)
      : [...recurrence.daysOfWeek, day];
    update({ daysOfWeek: d });
  };

  // Compute occurrences count from endDate
  const computeOccurrences = () => {
    if (!recurrence.endDate || !startDate) return 0;
    const start = new Date(startDate);
    const end = new Date(recurrence.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (recurrence.frequency === 'weekly') {
      if (recurrence.daysOfWeek.length === 0) return 0;
      return Math.floor((diffDays / 7) * recurrence.daysOfWeek.length);
    } else {
      return Math.floor(diffDays / 30);
    }
  };

  const occurrences = computeOccurrences();

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2">
      {/* Frequency selector */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frequency</p>
        <div className="flex gap-2">
          {(['weekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => update({ frequency: f })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                recurrence.frequency === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'
              }`}
            >
              {f === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly: day-of-week checkboxes */}
      {recurrence.frequency === 'weekly' && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days of Week</p>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                  recurrence.daysOfWeek.includes(i)
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly: day of month */}
      {recurrence.frequency === 'monthly' && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Day of Month</p>
          <input
            type="number"
            min={1}
            max={28}
            value={recurrence.dayOfMonth}
            onChange={(e) => update({ dayOfMonth: Math.max(1, Math.min(28, Number(e.target.value))) })}
            className="w-24 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-violet-500/60 transition-all"
          />
          <p className="text-xs text-muted-foreground">Max 28 to avoid month-end issues</p>
        </div>
      )}

      {/* End date */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</p>
        <input
          type="date"
          value={recurrence.endDate}
          onChange={(e) => update({ endDate: e.target.value })}
          min={startDate ? startDate.split('T')[0] : undefined}
          className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]"
        />
      </div>

      {/* Count preview */}
      {occurrences > 0 && (
        <p className="text-xs text-violet-400 font-medium">
          ✨ Will repeat <span className="font-bold">{occurrences}</span> time{occurrences !== 1 ? 's' : ''} until{' '}
          {new Date(recurrence.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

// ─── Image Uploader helper ─────────────────────────────────────────────────────

async function uploadImageToR2(
  file: File,
  webinarId: string,
): Promise<string> {
  const { uploadUrl, publicUrl } = await webinarApi.getImageUploadUrl(
    webinarId,
    file.name,
    file.type || 'image/jpeg',
  );
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network upload error'));
    xhr.send(file);
  });
  return publicUrl;
}

// ─── Main Form ────────────────────────────────────────────────────────────────

function CreateWebinarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTitle = searchParams.get('title') || '';
  const initialVideoUrl = searchParams.get('videoUrl') || '';

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [startNowLoading, setStartNowLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Video Upload & Selection States
  const [recordingsList, setRecordingsList] = useState<Webinar[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const draftWebinarIdRef = useRef<string | null>(null);

  const update = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  // Load existing recordings
  useEffect(() => {
    webinarApi.list({ limit: 100 }).then((res) => {
      const filtered = res.items.filter((w) => !!w.replayUrl || !!w.videoUrl);
      setRecordingsList(filtered);
    }).catch(console.error);
  }, []);

  // Set local timezone client-side
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    update({ timezone: tz });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from query params
  useEffect(() => {
    if (initialTitle) update({ title: initialTitle });
    if (initialVideoUrl) update({ mode: 'semi_live', videoUrl: initialVideoUrl });
  }, [initialTitle, initialVideoUrl]);

  // Apply template
  const applyTemplate = (tpl: Template) => {
    update(tpl.patch);
    setShowTemplates(false);
    showToast(`Template "${tpl.name}" applied!`);
  };

  // ── Start Instantly ──────────────────────────────────────────────────────────
  const handleStartNow = async () => {
    setStartNowLoading(true);
    try {
      const title = `Live Session - ${new Date().toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}`;
      const webinar = await webinarApi.create({
        title,
        mode: 'fully_live',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 60,
      });
      router.push(`/dashboard/webinars/${webinar.id}/studio`);
    } catch (err) {
      console.error('Start now failed:', err);
      showToast('Failed to start session. Please try again.', false);
      setStartNowLoading(false);
    }
  };

  // ── Video Upload ──────────────────────────────────────────────────────────────
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const draft = await webinarApi.create({
        title: form.title.trim() || file.name,
        description: 'Uploaded video for semi-live session',
        mode: 'semi_live',
      });
      draftWebinarIdRef.current = draft.id;

      const { uploadUrl, publicUrl } = await webinarApi.getVideoUploadUrl(
        draft.id, file.name, file.type || 'video/mp4',
      );

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network upload error'));
        xhr.send(file);
      });

      update({ videoUrl: publicUrl });
      await webinarApi.update(draft.id, { videoUrl: publicUrl, replayUrl: publicUrl });
      showToast('Video uploaded successfully!');
    } catch (err) {
      console.error('Video upload failed:', err);
      showToast('Upload failed: ' + (err instanceof Error ? err.message : String(err)), false);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────────
  async function handleCreate(asDraft: boolean) {
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        mode: form.mode,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        durationMinutes: form.duration,
        maxAttendees: form.maxAttendees,
        password: form.password.trim() || undefined,
        videoUrl: form.videoUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        settings: {
          requireRegistration: form.requireRegistration,
          enableChat:          form.enableChat,
          enablePolls:         form.enablePolls,
          enableOffers:        form.enableOffers,
          repeat:              form.repeat,
          privateWebinar:      form.privateWebinar,
          requireLogin:        form.requireLogin,
          waitingRoom:         form.waitingRoom,
          enableWatermark:     form.enableWatermark,
          showLiveCount:       form.showLiveCount,
          enableRecording:     form.enableRecording,
          timezone:            form.timezone,
        },
      };

      let createdId: string;

      if (draftWebinarIdRef.current) {
        await webinarApi.update(draftWebinarIdRef.current, {
          ...payload,
          status: asDraft ? 'draft' : 'scheduled',
        });
        createdId = draftWebinarIdRef.current;
      } else {
        const webinar = await webinarApi.create(payload);
        createdId = webinar.id;
        if (!asDraft && webinar.id) {
          await webinarApi.update(webinar.id, { status: 'scheduled' });
        }
      }
      void createdId;
      router.push('/dashboard/webinars');
    } catch (err) {
      console.error('Failed to create webinar:', err);
      showToast('Failed to create webinar. Please try again.', false);
      setLoading(false);
    }
  }

  // ── Ensure draft exists helper ─────────────────────────────────────────────
  const ensureDraftId = async () => {
    if (!draftWebinarIdRef.current) {
      const draft = await webinarApi.create({
        title: form.title.trim() || 'Draft Webinar',
        mode: form.mode,
      });
      draftWebinarIdRef.current = draft.id;
    }
    return draftWebinarIdRef.current;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-md text-foreground text-sm font-medium shadow-xl animate-in slide-in-from-top-2 duration-300 ${
          toast.ok
            ? 'bg-emerald-500/15 border-emerald-500/30'
            : 'bg-red-500/15 border-red-500/30'
        }`}>
          <span>{toast.ok ? '✅' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/webinars" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-200 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Create Webinar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Set up your webinar in minutes</p>
        </div>

        {/* ⚡ Start Instantly Button */}
        <button
          id="start-now-btn"
          type="button"
          onClick={() => void handleStartNow()}
          disabled={startNowLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            boxShadow: '0 0 20px rgba(245,158,11,0.25)',
          }}
        >
          {startNowLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Start Instantly
            </>
          )}
        </button>
      </div>

      {/* ── Templates Section ──────────────────────────────────────────────────── */}
      {showTemplates && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Start from Template</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Pick a preset to pre-fill your webinar settings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                id={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-violet-500/40 transition-all group"
              >
                <span className="text-2xl block mb-2">{tpl.emoji}</span>
                <p className="text-sm font-semibold text-foreground group-hover:text-violet-300 transition-colors">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">{tpl.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {tpl.features.map((f) => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-muted-foreground font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Or start from scratch
            </button>
          </div>
        </div>
      )}

      {!showTemplates && (
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          ← Show templates
        </button>
      )}

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">

        {/* ── STEP 1: Basics ── */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Mode selection */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Webinar Type</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose how you want to deliver your webinar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModeCard mode="semi_live" selected={form.mode === 'semi_live'} onClick={() => update({ mode: 'semi_live' })} />
                <ModeCard mode="fully_live" selected={form.mode === 'fully_live'} onClick={() => update({ mode: 'fully_live' })} />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="wn-title" className="block text-sm font-medium text-foreground">
                Webinar Title <span className="text-red-400">*</span>
              </label>
              <input
                id="wn-title"
                type="text"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                required
                maxLength={255}
                placeholder="e.g. Mastering Digital Marketing in 2026"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all"
              />
              <p className="text-xs text-muted-foreground text-right">{form.title.length}/255</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="wn-desc" className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="wn-desc"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                maxLength={2000}
                placeholder="What will attendees learn in this webinar?"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all resize-none"
              />
            </div>

            {/* ── Cover Image ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Cover Image</p>
                <p className="text-xs text-muted-foreground mt-0.5">Shown on registration page & webinar card</p>
              </div>

              {form.thumbnailUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 bg-black aspect-video max-w-sm">
                  <img
                    src={form.thumbnailUrl}
                    alt="Cover image preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <label className="cursor-pointer">
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-black/70 border border-slate-300 text-foreground hover:bg-black/90 transition-all">
                        🔄 Replace
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const id = await ensureDraftId();
                            const url = await uploadImageToR2(file, id);
                            update({ thumbnailUrl: url });
                            showToast('Cover image updated!');
                          } catch {
                            showToast('Image upload failed', false);
                          } finally { setUploading(false); }
                        }}
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => update({ thumbnailUrl: '' })}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-violet-500/50 hover:bg-slate-50 rounded-2xl p-8 cursor-pointer transition-all max-w-sm">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-foreground font-medium">Upload Cover Image</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const id = await ensureDraftId();
                        const url = await uploadImageToR2(file, id);
                        update({ thumbnailUrl: url });
                        showToast('Cover image uploaded!');
                      } catch {
                        showToast('Image upload failed', false);
                      } finally { setUploading(false); }
                    }}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Semi-Live Video Selector */}
            {form.mode === 'semi_live' && (
              <div className="space-y-4 border border-slate-200 rounded-2xl p-5 bg-white/[0.01]">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Video Content for Semi-Live</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Provide the pre-recorded video source that will play for attendees.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Upload New Video</label>
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-violet-500/50 hover:bg-slate-50 rounded-xl p-4 cursor-pointer transition-all h-28 text-center">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-foreground font-medium">Select file (.mp4, .webm)</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Direct upload to Cloudflare R2</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploading} className="hidden" />
                    </label>
                  </div>

                  {/* Existing */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Choose Existing Recording</label>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 h-28 flex flex-col justify-between">
                      <select
                        value={form.videoUrl}
                        onChange={(e) => update({ videoUrl: e.target.value })}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
                      >
                        <option value="">-- Select from recordings --</option>
                        {recordingsList.map((rec) => {
                          const url = rec.replayUrl || rec.videoUrl || '';
                          return (
                            <option key={rec.id} value={url}>
                              {rec.title} ({rec.mode === 'semi_live' ? 'Uploaded' : 'Recorded'})
                            </option>
                          );
                        })}
                      </select>
                      <span className="text-[10px] text-muted-foreground leading-normal">
                        Select a past live recorded session or an asset you uploaded previously.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload progress */}
                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-foreground">Uploading…</span>
                      <span className="text-violet-400">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Video Preview */}
                {form.videoUrl && !uploading && (
                  <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl overflow-hidden">
                    <div className="relative bg-black aspect-video w-full max-h-48">
                      <video
                        key={form.videoUrl}
                        src={form.videoUrl}
                        controls
                        preload="metadata"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-2xl opacity-60">▶</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-emerald-400 text-sm">✅</span>
                        <span className="text-foreground text-xs font-medium truncate">Video ready</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="cursor-pointer">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-white/[0.10] border border-slate-200 text-foreground hover:text-foreground transition-all">
                            🔄 Replace
                          </span>
                          <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploading} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => update({ videoUrl: '' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="wn-date" className="block text-sm font-medium text-foreground">
                  Scheduled Date & Time <span className="text-red-400">*</span>
                </label>
                <input
                  id="wn-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => update({ scheduledAt: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wn-duration" className="block text-sm font-medium text-foreground">
                  Duration (minutes)
                </label>
                <select
                  id="wn-duration"
                  value={form.duration}
                  onChange={(e) => update({ duration: Number(e.target.value) })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h * 60}>{h}h</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Settings ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Webinar Settings</h2>
              <p className="text-sm text-muted-foreground">Configure features and access controls</p>
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label htmlFor="wn-capacity" className="block text-sm font-medium text-foreground">
                Max Attendees
              </label>
              <div className="relative">
                <input
                  id="wn-capacity"
                  type="number"
                  value={form.maxAttendees}
                  onChange={(e) => update({ maxAttendees: Number(e.target.value) })}
                  min={1}
                  max={10000}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-violet-500/60 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">attendees</span>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label htmlFor="wn-tz" className="block text-sm font-medium text-foreground">Timezone</label>
              <select
                id="wn-tz"
                value={form.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="wn-pw" className="block text-sm font-medium text-foreground">
                Access Password <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="wn-pw"
                type="text"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder="Leave blank for open access"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-foreground placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Feature toggles */}
            <div className="space-y-1 divide-y divide-white/[0.05] bg-slate-50 border border-white/[0.05] rounded-2xl px-4">
              <div className="py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Access Controls</p>
              </div>

              <Toggle checked={form.requireRegistration} onChange={(v) => update({ requireRegistration: v })} label="Registration Page" description="Public page where attendees view the event and register" />
              <Toggle checked={form.requireLogin} onChange={(v) => update({ requireLogin: v })} label="Require Login" description="Require attendees to log in to join the webinar" />
              <Toggle checked={form.privateWebinar} onChange={(v) => update({ privateWebinar: v, requireLogin: v ? true : form.requireLogin })} label="Private Webinar" description="Invite-only — Require Login will be enabled automatically" />
              <Toggle checked={form.waitingRoom} onChange={(v) => update({ waitingRoom: v })} label="Waiting Room" description="Attendees must be approved by the host before joining" />

              {/* Waiting Room Thumbnail */}
              {form.waitingRoom && (
                <div className="py-3 space-y-2 border-t border-white/[0.05]">
                  <p className="text-sm font-medium text-foreground">Waiting Room Thumbnail <span className="text-muted-foreground font-normal text-xs">(optional)</span></p>
                  <p className="text-xs text-muted-foreground">Image shown to attendees while they wait for host approval.</p>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-white/[0.10] border border-slate-200 text-foreground hover:text-foreground transition-all">
                        <Upload className="w-4 h-4" /> Upload Image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const id = await ensureDraftId();
                            const url = await uploadImageToR2(file, id);
                            update({ waitingThumbnailUrl: url });
                            showToast('Thumbnail uploaded successfully!');
                          } catch (err) {
                            console.error(err);
                            showToast('Failed to upload thumbnail', false);
                          } finally { setUploading(false); }
                        }}
                        disabled={uploading}
                      />
                    </label>

                    <input
                      type="url"
                      value={form.waitingThumbnailUrl}
                      onChange={(e) => update({ waitingThumbnailUrl: e.target.value })}
                      placeholder="Or enter image URL..."
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-foreground placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                    />
                  </div>

                  {form.waitingThumbnailUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black max-w-sm">
                      <img src={form.waitingThumbnailUrl} alt="Waiting room thumbnail" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => update({ waitingThumbnailUrl: '' })} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-foreground rounded-full p-1.5 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                  {!form.waitingThumbnailUrl && (
                    <div className="rounded-xl mt-2 border border-slate-200 bg-slate-50 aspect-video max-w-sm flex items-center justify-center">
                      <p className="text-muted-foreground text-xs text-center px-4">Default Zonvo waiting room thumbnail will be used</p>
                    </div>
                  )}
                </div>
              )}

              <div className="py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Engagement</p>
              </div>

              <Toggle checked={form.enableChat} onChange={(v) => update({ enableChat: v })} label="Live Chat" description="Allow attendees to send chat messages" />
              <Toggle checked={form.enablePolls} onChange={(v) => update({ enablePolls: v })} label="Polls & Q&A" description="Create interactive polls during the webinar" />
              <Toggle checked={form.enableOffers} onChange={(v) => update({ enableOffers: v })} label="Offers & CTAs" description="Display timed offers and call-to-action buttons" />
              <Toggle checked={form.showLiveCount} onChange={(v) => update({ showLiveCount: v })} label="Show Live User Count" description="Show the live viewer count to all attendees" />

              <div className="py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recording & Privacy</p>
              </div>

              <Toggle checked={form.enableRecording} onChange={(v) => update({ enableRecording: v })} label="Enable Recording" description="Record the webinar for playback later" />
              <Toggle checked={form.enableWatermark} onChange={(v) => update({ enableWatermark: v })} label="Enable Watermark" description="Show viewer name as a watermark on the video" />
              <Toggle
                checked={form.repeat}
                onChange={(v) => update({ repeat: v })}
                label="Repeat Schedule"
                description="Schedule this webinar to repeat at regular intervals"
              />

              {/* ── Recurrence Panel ─────────────────────────────────────── */}
              {form.repeat && (
                <div className="pb-3">
                  <RecurrencePanel
                    recurrence={form.recurrence}
                    onChange={(r) => update({ recurrence: r })}
                    startDate={form.scheduledAt}
                  />
                </div>
              )}
            </div>

            {/* ── Landing Page Branding ──────────────────────────────────── */}
            <div className="space-y-4 border border-slate-200 rounded-2xl p-5 bg-white/[0.01]">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Registration Page Appearance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Customize branding shown on your landing page</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Logo <span className="text-muted-foreground">(100×100 max)</span></p>
                  {form.brandingLogoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={form.brandingLogoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="space-y-1.5">
                        <label className="cursor-pointer">
                          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-foreground hover:text-foreground transition-all">
                            Replace
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            try {
                              const id = await ensureDraftId();
                              const url = await uploadImageToR2(file, id);
                              update({ brandingLogoUrl: url });
                            } catch { showToast('Logo upload failed', false); }
                            finally { setUploading(false); }
                          }} disabled={uploading} />
                        </label>
                        <button type="button" onClick={() => update({ brandingLogoUrl: '' })} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center border border-dashed border-slate-300 hover:border-violet-500/50 rounded-xl p-4 cursor-pointer transition-all h-20">
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                        <span className="text-xs text-muted-foreground">Upload logo</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const id = await ensureDraftId();
                          const url = await uploadImageToR2(file, id);
                          update({ brandingLogoUrl: url });
                          showToast('Logo uploaded!');
                        } catch { showToast('Logo upload failed', false); }
                        finally { setUploading(false); }
                      }} disabled={uploading} />
                    </label>
                  )}
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Accent Color</p>
                  <div className="flex items-center gap-3">
                    <input
                      id="branding-accent"
                      type="color"
                      value={form.brandingAccentColor}
                      onChange={(e) => update({ brandingAccentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-transparent cursor-pointer overflow-hidden"
                    />
                    <input
                      type="text"
                      value={form.brandingAccentColor}
                      onChange={(e) => update({ brandingAccentColor: e.target.value })}
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-foreground text-sm font-mono focus:outline-none focus:border-violet-500/60 transition-all"
                    />
                  </div>
                  {/* Mini Preview Card */}
                  <div
                    className="rounded-xl p-3 border mt-2"
                    style={{ borderColor: `${form.brandingAccentColor}33`, background: `${form.brandingAccentColor}0d` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {form.brandingLogoUrl && (
                        <img src={form.brandingLogoUrl} alt="logo" className="w-5 h-5 rounded object-cover" />
                      )}
                      <p className="text-xs font-semibold text-foreground">{form.title || 'Your Webinar'}</p>
                    </div>
                    <div className="h-1 rounded-full w-1/2" style={{ background: form.brandingAccentColor }} />
                    <p className="text-[10px] text-muted-foreground mt-2">Registration page preview</p>
                    <div
                      className="mt-2 text-[9px] font-semibold text-foreground px-2 py-1 rounded-lg w-fit"
                      style={{ background: form.brandingAccentColor }}
                    >
                      Register Now
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Review & Launch</h2>
              <p className="text-sm text-muted-foreground">Double-check everything before creating your webinar</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Title', value: form.title || '—' },
                { label: 'Type', value: form.mode === 'semi_live' ? 'Semi-Live' : 'Fully Live' },
                { label: 'Scheduled', value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : '—' },
                { label: 'Duration', value: (() => { const h = Math.floor(form.duration / 60); const m = form.duration % 60; return m > 0 ? `${h}h ${m}m` : `${h}h`; })() },
                { label: 'Timezone', value: form.timezone },
                { label: 'Max Attendees', value: form.maxAttendees.toLocaleString() },

                { label: 'Cover Image', value: form.thumbnailUrl ? '✅ Set' : '—' },
                { label: 'Registration Page', value: form.requireRegistration ? '✅ On' : '—' },
                { label: 'Require Login', value: form.requireLogin ? '✅ On' : '—' },
                { label: 'Private Webinar', value: form.privateWebinar ? '✅ On' : '—' },
                { label: 'Waiting Room', value: form.waitingRoom ? '✅ On' : '—' },
                { label: 'Live Chat', value: form.enableChat ? '✅ On' : '—' },
                { label: 'Polls & Q&A', value: form.enablePolls ? '✅ On' : '—' },
                { label: 'Offers & CTAs', value: form.enableOffers ? '✅ On' : '—' },
                { label: 'Show Viewer Count', value: form.showLiveCount ? '✅ On' : '—' },
                { label: 'Enable Recording', value: form.enableRecording ? '✅ On' : '—' },
                { label: 'Watermark', value: form.enableWatermark ? '✅ On' : '—' },
                { label: 'Repeat Schedule', value: form.repeat ? `✅ ${form.recurrence.frequency}` : '—' },
                { label: 'Accent Color', value: form.brandingAccentColor },
                ...(form.password ? [{ label: 'Password Protected', value: '✅ Yes' }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.05]">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm text-foreground font-medium text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {form.description && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{form.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : router.push('/dashboard/webinars')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:text-foreground bg-slate-100 hover:bg-slate-200 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        <div className="flex items-center gap-3">
          {step === 3 && (
            <button
              type="button"
              onClick={() => void handleCreate(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:text-foreground bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (step < 3) {
                setStep((s) => (s + 1) as Step);
              } else {
                void handleCreate(false);
              }
            }}
            disabled={loading || (step === 1 && (!form.title || !form.scheduledAt))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-foreground text-sm
              bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </>
            ) : step < 3 ? (
              <>
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Webinar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateWebinarPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateWebinarForm />
    </Suspense>
  );
}
