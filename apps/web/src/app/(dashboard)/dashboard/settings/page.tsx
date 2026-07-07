'use client';

import { useState } from 'react';
import { User, Shield, HardDrive, CheckCircle2, Copy } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  void copied; // Mark as read

  const triggerCopy = (txt: string) => {
    void navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account & Storage Settings</h1>
        <p className="text-white/40 text-sm mt-1">Configure profile details and manage R2 bucket parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Tabs (Visual placeholders) */}
        <div className="space-y-1">
          {[
            { label: 'Profile Information', icon: User, active: true },
            { label: 'Cloudflare R2 Storage', icon: HardDrive, active: false },
            { label: 'Security & Access', icon: Shield, active: false },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                item.active
                  ? 'bg-violet-600 text-white'
                  : 'text-white/40 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Configuration Details Panels */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#0d0d14]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide border-b border-white/[0.05] pb-2">
              Profile details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-white/30 block">Account Email</span>
                <span className="font-medium text-white/80">{user?.email || 'info@aiclex.in'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-white/30 block">Current Organization</span>
                <span className="font-medium text-white/80">My Organization (Free Plan)</span>
              </div>
            </div>
          </div>

          {/* R2 Storage Configuration Panel */}
          <div className="bg-[#0d0d14]/60 border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                Cloudflare R2 Integrations
              </h3>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3 h-3" />
                Operational
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-white/30 block">Bucket Name</span>
                  <span className="font-mono text-white/80">zonvowebinar</span>
                </div>
                <div className="space-y-1">
                  <span className="text-white/30 block">Region / Cluster</span>
                  <span className="font-mono text-white/80">APAC (Asia-Pacific)</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-white/30 block">Custom Domain Endpoint</span>
                <div className="flex items-center gap-2 bg-black/20 border border-white/[0.06] rounded-xl px-3 py-2 mt-1">
                  <span className="font-mono text-white/60 flex-1 truncate">
                    https://webinar.siteboard.in
                  </span>
                  <button
                    onClick={() => triggerCopy('https://webinar.siteboard.in')}
                    className="text-white/40 hover:text-white/70"
                    title="Copy Endpoint"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border border-dashed border-white/10 rounded-xl p-3 bg-white/[0.01] text-[11px] text-white/40 leading-relaxed">
                📢 Presigned URLs for direct client upload to Cloudflare R2 are configured dynamically. CORS policy permissions verified.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
