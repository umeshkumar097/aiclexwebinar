'use client';
import { useState, useEffect } from 'react';
import { CTAData } from './types';

export function CTAPopup({ cta, onDismiss }: { cta: CTAData | null; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!cta?.countdown_seconds) { setRemaining(null); return; }
    setRemaining(cta.countdown_seconds);
    const t = setInterval(() => {
      setRemaining((v) => {
        if (v === null || v <= 1) { clearInterval(t); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cta]);

  if (!cta) return null;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const TYPE_CFG = {
    buy_now:   { icon: '🛒', color: 'from-emerald-600 to-teal-600' },
    book_demo: { icon: '📅', color: 'from-blue-600 to-indigo-600' },
    coupon:    { icon: '🎫', color: 'from-orange-600 to-red-600' },
    offer:     { icon: '🎁', color: 'from-violet-600 to-purple-600' },
    bonus:     { icon: '⭐', color: 'from-amber-500 to-orange-500' },
  };
  const cfg = TYPE_CFG[cta.type];

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40">
      <div className="bg-[#0d0d14] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden">
        {remaining !== null && cta.countdown_seconds && (
          <div
            className={`h-1 bg-gradient-to-r ${cfg.color} transition-all duration-1000`}
            style={{ width: `${(remaining / cta.countdown_seconds) * 100}%` }}
          />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <p className="text-white font-bold text-sm">{cta.title}</p>
                {cta.description && <p className="text-white/50 text-xs mt-0.5">{cta.description}</p>}
              </div>
            </div>
            <button onClick={onDismiss} className="text-white/30 hover:text-white/60 text-xl flex-shrink-0">×</button>
          </div>

          {cta.price && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-white">{cta.price}</span>
              {cta.original_price && <span className="text-white/30 line-through text-sm">{cta.original_price}</span>}
            </div>
          )}

          {cta.coupon && (
            <div
              className="flex items-center justify-between bg-white/[0.04] border border-dashed border-white/20 rounded-xl px-3 py-2 mb-3 cursor-pointer hover:bg-white/[0.08] transition-colors"
              onClick={() => navigator.clipboard.writeText(cta.coupon!)}
            >
              <span className="text-white font-mono font-bold text-sm tracking-widest">{cta.coupon}</span>
              <span className="text-white/40 text-xs">Tap to copy</span>
            </div>
          )}

          {remaining !== null && remaining > 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <span className="text-white/40 text-xs">Expires in</span>
              <span className="text-red-400 font-mono font-bold">{fmt(remaining)}</span>
            </div>
          )}

          <a
            href={cta.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full py-3 rounded-xl text-center font-bold text-white text-sm bg-gradient-to-r ${cfg.color} hover:opacity-90 transition-opacity shadow-lg`}
          >
            {cta.cta_label}
          </a>
        </div>
      </div>
    </div>
  );
}
