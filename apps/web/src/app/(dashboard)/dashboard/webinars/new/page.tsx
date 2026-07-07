'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { webinarApi, type Webinar } from '@/lib/api';

type WebinarMode = 'semi_live' | 'fully_live';
type Step = 1 | 2 | 3;


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
  // Competitor-parity settings
  repeat: boolean;
  privateWebinar: boolean;
  requireLogin: boolean;
  waitingRoom: boolean;
  waitingThumbnailUrl: string; // optional waiting room thumbnail
  enableWatermark: boolean;
  showLiveCount: boolean;
  enableRecording: boolean;
}

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Calcutta', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Shanghai', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland',
  'UTC',
];

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  mode: 'semi_live',
  scheduledAt: '',
  duration: 60,
  maxAttendees: 500,
  timezone: 'UTC', // will be updated client-side to avoid SSR mismatch
  requireRegistration: true,
  enableChat: true,
  enablePolls: true,
  enableOffers: false,
  password: '',
  videoUrl: '',
  repeat: false,
  privateWebinar: false,
  requireLogin: false,
  waitingRoom: false,
  waitingThumbnailUrl: '',
  enableWatermark: false,
  showLiveCount: true,
  enableRecording: true,
};

const STEPS = [
  { num: 1 as Step, label: 'Basics' },
  { num: 2 as Step, label: 'Settings' },
  { num: 3 as Step, label: 'Review' },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
            step.num < current ? 'bg-violet-600 text-white' :
            step.num === current ? 'bg-violet-600 text-white ring-4 ring-violet-500/20' :
            'bg-white/5 text-white/30'
          }`}>
            {step.num < current ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : step.num}
          </div>
          <span className={`text-sm font-medium transition-colors ${step.num === current ? 'text-white' : 'text-white/30'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-px mx-1 transition-colors ${step.num < current ? 'bg-violet-500' : 'bg-white/10'}`} />
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
      features: [] as string[],
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
      features: [] as string[],
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
            ? 'border-violet-500/60 bg-violet-500/10'
            : 'border-orange-500/60 bg-orange-500/10'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      }`}
    >
      {c.badge && (
        <span className="absolute top-3 right-3 text-xs font-medium text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-lg">
          {c.badge}
        </span>
      )}

      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        selected
          ? isViolet ? 'bg-violet-500/20 text-violet-300' : 'bg-orange-500/20 text-orange-300'
          : 'bg-white/5 text-white/40'
      }`}>
        {c.icon}
      </div>

      <h3 className="font-semibold text-white text-lg mb-1">{c.title}</h3>
      <p className="text-sm text-white/50">{c.subtitle}</p>


      {selected && (
        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full ${isViolet ? 'bg-violet-500' : 'bg-orange-500'} flex items-center justify-center`}>
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-violet-600' : 'bg-white/10'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function CreateWebinarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTitle = searchParams.get('title') || '';
  const initialVideoUrl = searchParams.get('videoUrl') || '';

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  // Set local timezone client-side (avoid SSR hydration mismatch)
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    update({ timezone: tz });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill title & mode if redirected from Recordings
  useEffect(() => {
    if (initialTitle) {
      update({ title: initialTitle });
    }
    if (initialVideoUrl) {
      update({ mode: 'semi_live', videoUrl: initialVideoUrl });
    }
  }, [initialTitle, initialVideoUrl]);

  // Video upload handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Create a draft webinar placeholder
      const draft = await webinarApi.create({
        title: form.title.trim() || file.name,
        description: 'Uploaded video for semi-live session',
        mode: 'semi_live',
      });
      draftWebinarIdRef.current = draft.id;

      // 2. Fetch presigned upload URL
      const { uploadUrl, publicUrl } = await webinarApi.getVideoUploadUrl(
        draft.id,
        file.name,
        file.type || 'video/mp4'
      );

      // 3. Upload file directly to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Failed with status ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Network upload error'));
        xhr.send(file);
      });

      // 4. Update form state & save to draft
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
        // ✅ All settings toggles (competitor-parity)
        settings: {
          requireRegistration: form.requireRegistration,
          enableChat:          form.enableChat,
          enablePolls:         form.enablePolls,
          enableOffers:        form.enableOffers,
          repeat:              form.repeat,
          privateWebinar:      form.privateWebinar,
          requireLogin:        form.requireLogin,
          waitingRoom:         form.waitingRoom,
          waitingThumbnailUrl: form.waitingThumbnailUrl || null,
          enableWatermark:     form.enableWatermark,
          showLiveCount:       form.showLiveCount,
          enableRecording:     form.enableRecording,
          timezone:            form.timezone,
        },
      };

      let createdId: string;

      if (draftWebinarIdRef.current) {
        // If draft was pre-created during upload, update it
        await webinarApi.update(draftWebinarIdRef.current, {
          ...payload,
          status: asDraft ? 'draft' : 'scheduled',
        });
        createdId = draftWebinarIdRef.current;
      } else {
        // Create fresh webinar
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



  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-md text-white text-sm font-medium shadow-xl animate-in slide-in-from-top-2 duration-300 ${
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
        <Link href="/dashboard/webinars" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Webinar</h1>
          <p className="text-white/50 text-sm mt-0.5">Set up your webinar in minutes</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">

        {/* ── STEP 1: Basics ── */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Mode selection */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Webinar Type</h2>
              <p className="text-sm text-white/50 mb-4">Choose how you want to deliver your webinar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModeCard mode="semi_live" selected={form.mode === 'semi_live'} onClick={() => update({ mode: 'semi_live' })} />
                <ModeCard mode="fully_live" selected={form.mode === 'fully_live'} onClick={() => update({ mode: 'fully_live' })} />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="wn-title" className="block text-sm font-medium text-white/80">
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all"
              />
              <p className="text-xs text-white/30 text-right">{form.title.length}/255</p>
            </div>

             {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="wn-desc" className="block text-sm font-medium text-white/80">
                Description
              </label>
              <textarea
                id="wn-desc"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                maxLength={2000}
                placeholder="What will attendees learn in this webinar?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all resize-none"
              />
            </div>

            {/* Semi-Live Video Selector (Only shown if mode is semi_live) */}
            {form.mode === 'semi_live' && (
              <div className="space-y-4 border border-white/10 rounded-2xl p-5 bg-white/[0.01]">
                <div>
                  <h3 className="text-sm font-semibold text-white">Video Content for Semi-Live</h3>
                  <p className="text-xs text-white/40 mt-0.5">Provide the pre-recorded video source that will play for attendees.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Upload local video */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-white/60">Upload New Video</label>
                    <label className="flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-violet-500/50 hover:bg-white/[0.02] rounded-xl p-4 cursor-pointer transition-all h-28 text-center">
                      <Upload className="w-5 h-5 text-white/40 mb-1" />
                      <span className="text-xs text-white/70 font-medium">Select file (.mp4, .webm)</span>
                      <span className="text-[10px] text-white/30 mt-1">Direct upload to Cloudflare R2</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Option B: Choose from recordings */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-white/60">Choose Existing Recording</label>
                    <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] h-28 flex flex-col justify-between">
                      <select
                        value={form.videoUrl}
                        onChange={(e) => update({ videoUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
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
                      <span className="text-[10px] text-white/30 leading-normal">
                        Select a past live recorded session or an asset you uploaded previously.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload progress */}
                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white/60">Uploading video file…</span>
                      <span className="text-violet-400">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Video Preview Card — replaces the URL text */}
                {form.videoUrl && !uploading && (
                  <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl overflow-hidden">
                    {/* Video player */}
                    <div className="relative bg-black aspect-video w-full max-h-48">
                      <video
                        key={form.videoUrl}
                        src={form.videoUrl}
                        controls
                        preload="metadata"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // If video can't load (e.g. CORS), show poster fallback
                          (e.target as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                      {/* Fallback icon in case video can't load inline */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl opacity-60">▶</div>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-emerald-400 text-sm">✅</span>
                        <span className="text-white/70 text-xs font-medium truncate">Video ready</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Replace */}
                        <label className="cursor-pointer">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/70 hover:text-white transition-all">
                            🔄 Replace
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                        {/* Delete */}
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
                <label htmlFor="wn-date" className="block text-sm font-medium text-white/80">
                  Scheduled Date & Time <span className="text-red-400">*</span>
                </label>
                <input
                  id="wn-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => update({ scheduledAt: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wn-duration" className="block text-sm font-medium text-white/80">
                  Duration (minutes)
                </label>
                <select
                  id="wn-duration"
                  value={form.duration}
                  onChange={(e) => update({ duration: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
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
              <h2 className="text-lg font-semibold text-white mb-1">Webinar Settings</h2>
              <p className="text-sm text-white/50">Configure features and access controls</p>
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label htmlFor="wn-capacity" className="block text-sm font-medium text-white/80">
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/60 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">attendees</span>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label htmlFor="wn-tz" className="block text-sm font-medium text-white/80">Timezone</label>
              <select
                id="wn-tz"
                value={form.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/60 transition-all appearance-none [color-scheme:dark]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Access password */}
            <div className="space-y-1.5">
              <label htmlFor="wn-pw" className="block text-sm font-medium text-white/80">
                Access Password <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <input
                id="wn-pw"
                type="text"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder="Leave blank for open access"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Feature toggles */}
            <div className="space-y-1 divide-y divide-white/[0.05] bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4">

              <div className="py-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Access Controls</p>
              </div>

              <Toggle
                checked={form.requireRegistration}
                onChange={(v) => update({ requireRegistration: v })}
                label="Registration Page"
                description="Public page where attendees view the event and register"
              />
              <Toggle
                checked={form.requireLogin}
                onChange={(v) => update({ requireLogin: v })}
                label="Require Login"
                description="Require attendees to log in to join the webinar"
              />
              <Toggle
                checked={form.privateWebinar}
                onChange={(v) => update({ privateWebinar: v, requireLogin: v ? true : form.requireLogin })}
                label="Private Webinar"
                description="Invite-only — Require Login will be enabled automatically"
              />
              <Toggle
                checked={form.waitingRoom}
                onChange={(v) => update({ waitingRoom: v })}
                label="Waiting Room"
                description="Attendees must be approved by the host before joining"
              />

              {/* Waiting Room Thumbnail — shown only when waitingRoom is ON */}
              {form.waitingRoom && (
                <div className="py-3 space-y-2 border-t border-white/[0.05]">
                  <p className="text-sm font-medium text-white">Waiting Room Thumbnail <span className="text-white/30 font-normal text-xs">(optional)</span></p>
                  <p className="text-xs text-white/40">Image shown to attendees while they wait for host approval. Leave blank to use the default.</p>
                  
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/70 hover:text-white transition-all">
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
                            // 1. Ensure we have a draft ID if it doesn't exist
                            let currentId = draftWebinarIdRef.current;
                            if (!currentId) {
                              const draft = await webinarApi.create({
                                title: form.title.trim() || 'Draft Webinar',
                                mode: form.mode,
                              });
                              draftWebinarIdRef.current = draft.id;
                              currentId = draft.id;
                            }
                            
                            // 2. Get presigned upload URL
                            const { uploadUrl, publicUrl } = await webinarApi.getImageUploadUrl(
                              currentId,
                              file.name,
                              file.type || 'image/jpeg'
                            );
                            
                            // 3. Upload to R2
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
                            
                            update({ waitingThumbnailUrl: publicUrl });
                            showToast('Thumbnail uploaded successfully!');
                          } catch (err) {
                            console.error('Thumbnail upload failed:', err);
                            showToast('Failed to upload thumbnail', false);
                          } finally {
                            setUploading(false);
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                    
                    <input
                      type="url"
                      value={form.waitingThumbnailUrl}
                      onChange={(e) => update({ waitingThumbnailUrl: e.target.value })}
                      placeholder="Or enter image URL..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                    />
                  </div>

                  {form.waitingThumbnailUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10 aspect-video bg-black max-w-sm">
                      <img
                        src={form.waitingThumbnailUrl}
                        alt="Waiting room thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => update({ waitingThumbnailUrl: '' })}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  )}
                  {!form.waitingThumbnailUrl && (
                    <div className="rounded-xl mt-2 border border-white/[0.06] bg-white/[0.02] aspect-video max-w-sm flex items-center justify-center">
                      <p className="text-white/20 text-xs text-center px-4">Default Zonvo waiting room thumbnail will be used</p>
                    </div>
                  )}
                </div>
              )}

              <div className="py-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Engagement</p>
              </div>

              <Toggle
                checked={form.enableChat}
                onChange={(v) => update({ enableChat: v })}
                label="Live Chat"
                description="Allow attendees to send chat messages"
              />
              <Toggle
                checked={form.enablePolls}
                onChange={(v) => update({ enablePolls: v })}
                label="Polls & Q&A"
                description="Create interactive polls during the webinar"
              />
              <Toggle
                checked={form.enableOffers}
                onChange={(v) => update({ enableOffers: v })}
                label="Offers & CTAs"
                description="Display timed offers and call-to-action buttons"
              />
              <Toggle
                checked={form.showLiveCount}
                onChange={(v) => update({ showLiveCount: v })}
                label="Show Live User Count"
                description="Show the live viewer count to all attendees"
              />

              <div className="py-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Recording & Privacy</p>
              </div>

              <Toggle
                checked={form.enableRecording}
                onChange={(v) => update({ enableRecording: v })}
                label="Enable Recording"
                description="Record the webinar for playback later"
              />
              <Toggle
                checked={form.enableWatermark}
                onChange={(v) => update({ enableWatermark: v })}
                label="Enable Watermark"
                description="Show viewer name as a watermark on the video"
              />
              <Toggle
                checked={form.repeat}
                onChange={(v) => update({ repeat: v })}
                label="Repeat Schedule"
                description="Schedule this webinar to repeat at regular intervals"
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Review & Launch</h2>
              <p className="text-sm text-white/50">Double-check everything before creating your webinar</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Title', value: form.title || '—' },
                { label: 'Type', value: form.mode === 'semi_live' ? 'Semi-Live' : 'Fully Live' },
                { label: 'Scheduled', value: form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : '—' },
                { label: 'Duration', value: (() => { const h = Math.floor(form.duration / 60); const m = form.duration % 60; return m > 0 ? `${h}h ${m}m` : `${h}h`; })() },
                { label: 'Timezone', value: form.timezone },
                { label: 'Max Attendees', value: form.maxAttendees.toLocaleString() },
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
                { label: 'Repeat Schedule', value: form.repeat ? '✅ On' : '—' },
                ...(form.password ? [{ label: 'Password Protected', value: '✅ Yes' }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.05]">
                  <span className="text-sm text-white/50">{row.label}</span>
                  <span className="text-sm text-white font-medium text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Description preview */}
            {form.description && (
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs text-white/40 mb-2">Description</p>
                <p className="text-sm text-white/70 whitespace-pre-wrap line-clamp-4">{form.description}</p>
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
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
              onClick={() => handleCreate(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm
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

