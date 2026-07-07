'use client';
import { useState, useEffect } from 'react';

export function NotesPanel({ webinarCode }: { webinarCode: string }) {
  const key = `zonvo_notes_${webinarCode}`;
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(localStorage.getItem(key) ?? '');
  }, [key]);

  const save = (v: string) => {
    setNotes(v);
    localStorage.setItem(key, v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
        <p className="text-white/30 text-xs">Auto-saved locally</p>
        {saved && <span className="text-emerald-400 text-[10px] font-medium">✓ Saved</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => save(e.target.value)}
        placeholder="Take notes here… (auto-saved on your device)"
        className="flex-1 bg-transparent text-white/80 text-sm p-4 resize-none focus:outline-none placeholder-white/20 leading-relaxed"
      />
    </div>
  );
}
