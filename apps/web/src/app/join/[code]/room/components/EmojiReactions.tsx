'use client';
import { useEffect, useState } from 'react';

interface FloatingEmoji { id: string; emoji: string; x: number }

export function EmojiReactionsOverlay({ incoming }: { incoming: { emoji: string; id: string } | null }) {
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
        <div
          key={f.id}
          className="absolute bottom-24 text-3xl"
          style={{ left: `${f.x}%`, animation: 'floatUp 3s ease-out forwards' }}
        >
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

const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '🙏'];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-2xl px-2 py-1.5 border border-white/10">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-xl hover:scale-125 active:scale-110 transition-transform"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
