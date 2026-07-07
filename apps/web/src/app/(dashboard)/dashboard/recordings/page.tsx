'use client';

import { useState, useEffect, useCallback } from 'react';
import { Video, Cloud, Upload, Play, Link as LinkIcon, Trash2, ArrowRight, Download } from 'lucide-react';
import { webinarApi, type Webinar } from '@/lib/api';

export default function RecordingsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFilename, setUploadingFilename] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Fetch webinars list
  const fetchWebinars = useCallback(async () => {
    try {
      const res = await webinarApi.list({ limit: 100 });
      setWebinars(res.items);
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebinars();
  }, [fetchWebinars]);

  // Filter webinars that have either a replayUrl (recording of fully-live) or videoUrl (uploaded for semi-live)
  const recordings = webinars.filter((w) => !!w.replayUrl || !!w.videoUrl);

  // Handle local video upload via backend proxy (avoids R2 CORS issues)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    setUploading(true);
    setUploadProgress(0);
    setUploadingFilename(file.name);

    try {
      // 1. Create a draft webinar placeholder for this video
      const draft = await webinarApi.create({
        title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        description: 'Uploaded recording',
        mode: 'semi_live',
      });

      // 2. Upload via backend proxy (backend → R2), with XHR for progress tracking
      const token = localStorage.getItem('auth_token') ?? '';
      const formData = new FormData();
      formData.append('file', file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/webinars/${draft.id}/upload-video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try { msg = JSON.parse(xhr.responseText)?.message ?? msg; } catch { /* noop */ }
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      // 3. Refresh list — videoUrl was already saved by backend proxy endpoint
      alert('✅ Recording uploaded successfully!');
      void fetchWebinars();

    } catch (err) {
      console.error('File upload failed:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFilename('');
    }
  };



  // Delete recording reference (clear videoUrl / replayUrl or delete draft)
  const handleDelete = async (webinarId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;
    try {
      const w = webinars.find((x) => x.id === webinarId);
      if (w?.status === 'draft') {
        // If it's a draft recording, delete the whole webinar record
        await webinarApi.delete(webinarId);
      } else {
        // Otherwise, just clear the replayUrl
        await webinarApi.update(webinarId, { replayUrl: '' });
      }
      void fetchWebinars();
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recordings and Transcripts</h1>
          <p className="text-white/40 text-sm mt-1">
            Manage your cloud recordings, uploads, and assets to use directly in Semi-Live sessions.
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-all cursor-pointer shadow-lg active:scale-95 select-none">
            <Upload className="w-4 h-4" />
            Upload Video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Uploading progress overlay */}
      {uploading && (
        <div className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Uploading "{uploadingFilename}" to R2…</span>
            </div>
            <span className="text-xs font-bold text-violet-400">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center bg-[#0d0d14]/40">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-6 h-6 text-white/30" />
          </div>
          <h3 className="font-semibold text-white/80">No recordings found</h3>
          <p className="text-white/30 text-xs mt-1 max-w-sm mx-auto">
            Host live webinars to auto-save recordings, or upload direct video files above to schedule them in Semi-Live mode.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {recordings.map((rec) => {
            const url = rec.replayUrl || rec.videoUrl;
            return (
              <div
                key={rec.id}
                className="bg-[#0d0d14]/80 border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white truncate text-sm">{rec.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/50">
                        {rec.mode === 'semi_live' ? 'Semi-Live Asset' : 'Live Recording'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-semibold">
                        MP4
                      </span>
                    </div>
                    <p className="text-white/30 text-xs mt-0.5 truncate max-w-md">
                      Webinar ID: {rec.id}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1 font-mono">
                      {url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  {url && (
                    <>
                      <button
                        onClick={() => setPreviewVideoUrl(url)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Play
                      </button>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(url);
                          alert('Copied replay URL to clipboard!');
                        }}
                        className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        title="Copy URL"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-1.5 transition-colors text-white/70 hover:text-white"
                        title="Download Recording"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => void handleDelete(rec.id)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                    title="Delete Recording"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      // Redirect to create/edit webinar page with this video Url prefilled
                      const editUrl = `/dashboard/webinars/new?videoUrl=${encodeURIComponent(url || '')}&title=${encodeURIComponent(rec.title)}`;
                      window.location.href = editUrl;
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/25 text-violet-400 flex items-center gap-1.5 transition-colors"
                  >
                    Use Semi-Live
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d14] border border-white/10 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl relative">
            <button
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 text-white/70 hover:text-white flex items-center justify-center text-sm transition-colors border border-white/10"
            >
              ✕
            </button>
            <div className="aspect-video bg-black">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
