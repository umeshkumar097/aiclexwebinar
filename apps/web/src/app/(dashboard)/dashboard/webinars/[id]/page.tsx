'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { webinarApi, type Webinar, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ClientDate({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState('');
  useEffect(() => { setLabel(formatDate(iso)); }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'text-white/50',    bg: 'bg-white/5',        dot: 'bg-white/30', border: 'border-white/10' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400', border: 'border-blue-500/20' },
  live:      { label: 'Live Now',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400 animate-pulse', border: 'border-emerald-500/20' },
  ended:     { label: 'Ended',     color: 'text-white/40',    bg: 'bg-white/5',        dot: 'bg-white/20', border: 'border-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-400', border: 'border-red-500/20' },
};

// ─── Stat Box ──────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────
function ActionButton({
  label, icon, onClick, variant = 'default', loading = false, disabled = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'live';
  loading?: boolean;
  disabled?: boolean;
}) {
  const styles = {
    default: 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white',
    primary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20',
    danger:  'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300',
    live:    'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      <span>{loading ? '⏳' : icon}</span>
      {label}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Video Settings States
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    webinarApi.get(id)
      .then((w) => {
        setWebinar(w);
        setEditVideoUrl(w.videoUrl || '');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Webinar not found');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load webinar');
        }
      })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { uploadUrl, publicUrl } = await webinarApi.getVideoUploadUrl(id, file.name, file.type || 'video/mp4');

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
          else reject(new Error(`Status ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      const updated = await webinarApi.update(id, { videoUrl: publicUrl, replayUrl: publicUrl });
      setWebinar(updated);
      setEditVideoUrl(publicUrl);
      showToast('Video uploaded and configured successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveVideoUrl = async () => {
    setActionLoading(true);
    try {
      const updated = await webinarApi.update(id, { videoUrl: editVideoUrl.trim() || undefined });
      setWebinar(updated);
      showToast('Video URL updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update URL', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoLive = async () => {
    setActionLoading(true);
    try {
      const updated = await webinarApi.goLive(id);
      setWebinar(updated);
      showToast('🔴 Webinar is now LIVE!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to go live', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndLive = async () => {
    if (!confirm('Are you sure you want to end this live session?')) return;
    setActionLoading(true);
    try {
      const updated = await webinarApi.endLive(id);
      setWebinar(updated);
      showToast('✅ Webinar ended successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to end webinar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this webinar? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await webinarApi.delete(id);
      router.push('/dashboard/webinars');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
      setActionLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded-xl" />
        <div className="h-32 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !webinar) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-white mb-2">{error ?? 'Webinar not found'}</h2>
        <p className="text-white/40 text-sm mb-6">The webinar may have been deleted or you don't have access.</p>
        <Link
          href="/dashboard/webinars"
          className="px-4 py-2 rounded-xl text-sm font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
        >
          ← Back to Webinars
        </Link>
      </div>
    );
  }

  const s = STATUS_CONFIG[webinar.status];
  const attendees = webinar.status === 'ended' ? webinar.attendeeCount : webinar.registeredCount;
  const fillPct = webinar.maxAttendees > 0 ? Math.round((attendees / webinar.maxAttendees) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Link href="/dashboard/webinars" className="hover:text-white/70 transition-colors">Webinars</Link>
        <span>/</span>
        <span className="text-white/70 truncate max-w-xs">{webinar.title}</span>
      </div>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white/[0.03] border ${s.border} rounded-2xl p-6`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium ${s.color} ${s.bg}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className="text-xs text-white/30 bg-white/[0.04] px-2 py-1 rounded-lg">
                {webinar.mode === 'semi_live' ? '🎬 Semi-Live' : '📡 Fully Live'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{webinar.title}</h1>
            {webinar.description && (
              <p className="text-white/50 text-sm leading-relaxed">{webinar.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {webinar.status === 'draft' || webinar.status === 'scheduled' ? (
              <ActionButton
                label="Go Live"
                icon="🔴"
                onClick={() => void handleGoLive()}
                variant="live"
                loading={actionLoading}
              />
            ) : null}
            {webinar.status === 'live' && (
              <ActionButton
                label="End Session"
                icon="⏹"
                onClick={() => void handleEndLive()}
                variant="danger"
                loading={actionLoading}
              />
            )}
            <ActionButton
              label="Delete"
              icon="🗑"
              onClick={() => void handleDelete()}
              variant="danger"
              loading={actionLoading}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox
          label="Registered"
          value={webinar.registeredCount.toLocaleString()}
          sub={`of ${webinar.maxAttendees.toLocaleString()} max`}
        />
        <StatBox
          label="Attendees"
          value={webinar.attendeeCount.toLocaleString()}
          sub={webinar.status === 'live' ? 'Currently watching' : 'Total'}
        />
        <StatBox
          label="Capacity"
          value={`${fillPct}%`}
          sub={fillPct >= 90 ? '🔥 Almost full' : fillPct >= 60 ? 'Filling up' : 'Available'}
        />
        <StatBox
          label="Duration"
          value={`${webinar.durationMinutes} min`}
        />
      </div>

      {/* Capacity Bar */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-white/50">Registration Progress</span>
          <span className="text-white font-medium">{attendees.toLocaleString()} / {webinar.maxAttendees.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(fillPct, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              fillPct >= 90 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
              fillPct >= 60 ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
              'bg-gradient-to-r from-violet-600 to-violet-500'
            }`}
          />
        </div>
      </div>

      {/* Schedule Info */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Schedule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Scheduled At', value: webinar.scheduledAt, icon: '📅' },
            { label: 'Started At', value: webinar.startedAt, icon: '▶️' },
            { label: 'Ended At', value: webinar.endedAt, icon: '⏹' },
          ].map(({ label, value, icon }) => (
            <div key={label}>
              <p className="text-white/40 text-xs mb-1">{icon} {label}</p>
              <p className="text-white/80">
                <ClientDate iso={value} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Semi-Live Video Settings Configuration */}
      {webinar.mode === 'semi_live' && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">🎬 Semi-Live Configuration</h3>
            <p className="text-xs text-white/30 mt-0.5">Upload or link a pre-recorded video, set the scheduled start time, and configure replay behavior.</p>
          </div>

          {/* F-037: Video Upload — up to 10 GB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Box */}
            <div className="space-y-2">
              <label className="block text-xs text-white/40">Upload Video File <span className="text-white/20">(MP4, MOV, WebM — up to 10 GB)</span></label>
              <label className={`flex flex-col items-center justify-center border border-dashed rounded-xl p-4 cursor-pointer transition-all h-24 text-center ${
                isUploading ? 'border-violet-500/60 bg-violet-500/5' : 'border-white/20 hover:border-violet-500/50 hover:bg-white/[0.01]'
              }`}>
                <span className="text-2xl mb-1">{isUploading ? '⏳' : '📤'}</span>
                <span className="text-xs text-white/60 font-semibold">
                  {isUploading ? `Uploading… ${uploadProgress}%` : 'Choose Video File'}
                </span>
                <span className="text-[10px] text-white/20 mt-0.5">.mp4, .mov, .webm — up to 10 GB</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // F-037: 10 GB limit
                    const MAX_BYTES = 10 * 1024 * 1024 * 1024;
                    if (file.size > MAX_BYTES) {
                      showToast('File too large — maximum is 10 GB', 'error');
                      return;
                    }
                    await handleVideoUpload(e);
                  }}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {isUploading && (
                <div className="space-y-1.5 mt-1">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-violet-400 text-center">{uploadProgress}% uploaded to cloud storage</p>
                </div>
              )}
            </div>

            {/* URL Box + Schedule + Replay */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs text-white/40">Video Source URL</label>
                <input
                  type="text"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="e.g. https://cdn.example.com/video.mp4"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              {/* F-038: Scheduled playback time */}
              <div className="space-y-1">
                <label className="block text-xs text-white/40">📅 Scheduled Playback Start <span className="text-white/20">(auto-starts at this time)</span></label>
                <input
                  type="datetime-local"
                  defaultValue={webinar.scheduledAt ? new Date(webinar.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (!val) return;
                    try {
                      const updated = await webinarApi.update(id, { scheduledAt: new Date(val).toISOString() });
                      setWebinar(updated);
                      showToast('Scheduled time saved', 'success');
                    } catch {
                      showToast('Failed to save schedule', 'error');
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <button
                onClick={handleSaveVideoUrl}
                disabled={actionLoading || isUploading}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors"
              >
                Save Video Config
              </button>
            </div>
          </div>

          {webinar.videoUrl && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl overflow-hidden">
              {/* Video preview */}
              <div className="relative bg-black aspect-video w-full max-h-52">
                <video
                  key={webinar.videoUrl}
                  src={webinar.videoUrl}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLVideoElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl opacity-50">▶</div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">✅</span>
                  <span className="text-white/70 text-xs font-medium">Video ready</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Replace via URL */}
                  <label className="cursor-pointer">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/70 hover:text-white transition-all">
                      🔄 Replace
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024 * 1024) {
                          showToast('File too large — maximum is 10 GB', 'error');
                          return;
                        }
                        await handleVideoUpload(e);
                      }}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const updated = await webinarApi.update(id, { videoUrl: undefined });
                        setWebinar(updated);
                        setEditVideoUrl('');
                        showToast('Video removed', 'success');
                      } catch {
                        showToast('Failed to remove video', 'error');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
              {/* Upload in progress */}
              {isUploading && (
                <div className="px-4 pb-3 space-y-1">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-violet-400 text-center">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Join Code Card */}
      {webinar.joinCode && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Share with Attendees</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* 8-digit code */}
            <div className="flex-1 bg-black/20 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-white/40 text-xs mb-2">Join Code</p>
              <p className="text-3xl font-bold text-white tracking-[0.3em] font-mono">{webinar.joinCode}</p>
            </div>
            {/* Direct join link */}
            <div className="flex-[2] space-y-2">
              <p className="text-white/40 text-xs">Direct Join Link</p>
              <div className="flex items-center gap-2 bg-black/20 border border-white/[0.06] rounded-xl px-3 py-2">
                <span className="text-white/60 text-xs font-mono truncate flex-1">
                  {typeof window !== 'undefined' ? `${window.location.origin}/join/${webinar.joinCode}` : `/join/${webinar.joinCode}`}
                </span>
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    const link = `${window.location.origin}/join/${webinar.joinCode}`;
                    void navigator.clipboard.writeText(link);
                  }}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-colors font-medium"
                >
                  Copy
                </button>
              </div>
              {webinar.password && (
                <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                  <span>🔒</span> Password protected — share password separately
                </p>
              )}
            </div>
          </div>

          {/* Registration link (separate card) */}
          <div className="border-t border-white/[0.05] pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-white/60 text-xs font-medium">Registration Link</p>
                  <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-md font-medium">Recommended</span>
                </div>
                <p className="text-white/30 text-[11px] mb-2">Share this link so attendees register with name & email before joining.</p>
                <div className="flex items-center gap-2 bg-black/20 border border-white/[0.06] rounded-xl px-3 py-2">
                  <span className="text-white/60 text-xs font-mono truncate flex-1">
                    {typeof window !== 'undefined' ? `${window.location.origin}/join/${webinar.joinCode}/register` : `/join/${webinar.joinCode}/register`}
                  </span>
                  <button
                    suppressHydrationWarning
                    onClick={() => {
                      const link = `${window.location.origin}/join/${webinar.joinCode}/register`;
                      void navigator.clipboard.writeText(link);
                    }}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Go Live Banner (if live) */}
      {webinar.status === 'live' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">🔴</div>
          <h3 className="text-emerald-400 font-bold text-lg mb-1">This webinar is LIVE</h3>
          <p className="text-white/50 text-sm mb-4">
            Started at <ClientDate iso={webinar.startedAt} />
          </p>
          <Link
            href={`/dashboard/webinars/${webinar.id}/studio`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
            🎙 Join Live Studio
          </Link>
        </motion.div>
      )}

      {/* Meta */}
      <div className="text-xs text-white/20 flex gap-4">
        <span>ID: {webinar.id}</span>
        <span>Created: <ClientDate iso={webinar.createdAt} /></span>
        <span>Updated: <ClientDate iso={webinar.updatedAt} /></span>
      </div>
    </div>
  );
}
