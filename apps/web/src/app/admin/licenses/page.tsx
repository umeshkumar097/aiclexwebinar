'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type License = {
  id: string;
  name: string;
  slug: string;
  maxWebinars?: number;
  maxAttendeesPerWebinar?: number;
  maxHosts?: number;
  features?: string[];
  assignedCount?: number;
  totalCount?: number;
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.licenses
      .list()
      .then((d: License[] | { licenses?: License[] }) => {
        setLicenses(Array.isArray(d) ? d : (d as { licenses?: License[] }).licenses ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalLicenses = licenses.reduce((s, l) => s + (l.totalCount ?? 0), 0);
  const assignedLicenses = licenses.reduce((s, l) => s + (l.assignedCount ?? 0), 0);
  const available = totalLicenses - assignedLicenses;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-white font-black text-2xl">License Inventory</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Manage license plans and availability</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Licenses', value: totalLicenses, color: 'linear-gradient(135deg,#1d6fe8,#4338ca)', icon: '📦' },
          { label: 'Assigned', value: assignedLicenses, color: 'linear-gradient(135deg,#059669,#047857)', icon: '✅' },
          { label: 'Available', value: available, color: 'linear-gradient(135deg,#d97706,#b45309)', icon: '🎫' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: s.color }}>{s.icon}</div>
            <p className="text-3xl font-black text-white">{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* License Cards Grid */}
      {licenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
          <span className="text-4xl">🎫</span>
          <p className="text-sm">No licenses configured</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {licenses.map((lic) => {
            const used = lic.assignedCount ?? 0;
            const total = lic.totalCount ?? 0;
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            return (
              <div key={lic.id} className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Title */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-bold text-base">{lic.name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(29,111,232,0.12)', color: '#60a5fa' }}>
                      {lic.slug}
                    </span>
                  </div>
                  {total > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: pct >= 90 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)', color: pct >= 90 ? '#f87171' : '#34d399' }}>
                      {pct}% used
                    </span>
                  )}
                </div>

                {/* Specs */}
                <div className="space-y-1.5">
                  {[
                    { label: 'Max Webinars', value: lic.maxWebinars ?? '∞' },
                    { label: 'Max Attendees', value: lic.maxAttendeesPerWebinar ?? '∞' },
                    { label: 'Max Hosts', value: lic.maxHosts ?? '∞' },
                  ].map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{spec.label}</span>
                      <span className="text-xs font-semibold text-white">{spec.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                {lic.features && lic.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lic.features.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{used} / {total} assigned</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct >= 90 ? '#ef4444' : '#1d6fe8' }}
                      />
                    </div>
                  </div>
                )}

                {/* View Assigned */}
                <a
                  href="/admin/licenses/assigned"
                  className="block text-center py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: 'rgba(29,111,232,0.1)', color: '#60a5fa', border: '1px solid rgba(29,111,232,0.2)' }}
                >
                  View Assigned →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
