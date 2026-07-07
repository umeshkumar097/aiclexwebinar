'use client';
import { useState, useCallback } from 'react';
import { QnAQuestion } from './types';

export function QnATab({
  questions, onAsk, onUpvote,
}: {
  questions: QnAQuestion[];
  onAsk: (q: string) => void;
  onUpvote: (id: string) => void;
  displayName: string;
}) {
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'open' | 'answered'>('open');

  const send = useCallback(() => {
    if (!input.trim()) return;
    onAsk(input.trim());
    setInput('');
  }, [input, onAsk]);

  const filtered = questions
    .filter((q) => tab === 'open' ? !q.answered : q.answered)
    .sort((a, b) => b.upvotes - a.upvotes);

  const openCount = questions.filter((q) => !q.answered).length;
  const answeredCount = questions.filter((q) => q.answered).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/[0.05] flex-shrink-0">
        {(['open', 'answered'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t ? 'text-violet-400 border-b-2 border-violet-500' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'open' ? `Open (${openCount})` : `Answered (${answeredCount})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">{tab === 'open' ? '🙋' : '✅'}</div>
            <p className="text-white/30 text-xs">
              {tab === 'open' ? 'No questions yet — ask away!' : 'No answered questions yet'}
            </p>
          </div>
        )}
        {filtered.map((q) => (
          <div key={q.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-white/80 text-xs leading-relaxed">{q.question}</p>
                {q.answered && q.answer && (
                  <div className="mt-2 pt-2 border-t border-white/[0.05]">
                    <p className="text-violet-400 text-[10px] font-semibold mb-0.5">Host answered:</p>
                    <p className="text-white/60 text-xs">{q.answer}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-white/20 text-[9px]">{q.user}</span>
                  <span className="text-white/20 text-[9px]">
                    {q.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onUpvote(q.id)}
                disabled={q.hasUpvoted}
                className={`flex flex-col items-center gap-0.5 min-w-[32px] py-1 px-1.5 rounded-lg transition-all flex-shrink-0 ${
                  q.hasUpvoted
                    ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.07]'
                }`}
              >
                <span className="text-[10px]">▲</span>
                <span className="text-[10px] font-bold">{q.upvotes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/[0.05] flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Ask a question…"
            maxLength={300}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-all min-w-0"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="px-3 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-medium transition-all flex-shrink-0"
          >Ask</button>
        </div>
      </div>
    </div>
  );
}
