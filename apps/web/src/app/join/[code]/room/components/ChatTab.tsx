'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMsg } from './types';
import { EmojiPicker } from './EmojiReactions';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🙏'];

export function ChatTab({
  messages, onSend, onReact, pinnedId,
}: {
  messages: ChatMsg[];
  onSend: (msg: string) => void;
  onReact: (emoji: string) => void;
  displayName: string;
  pinnedId?: string;
}) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(() => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    setShowEmoji(false);
  }, [input, onSend]);

  const pinned = messages.find((m) => m.id === pinnedId);

  return (
    <div className="flex flex-col h-full">
      {pinned && (
        <div className="mx-3 mt-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl flex-shrink-0">
          <p className="text-violet-400 text-[10px] font-semibold mb-0.5">📌 Pinned</p>
          <p className="text-white/80 text-xs">{pinned.message}</p>
        </div>
      )}

      {/* Quick reactions */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.05] flex-shrink-0">
        <p className="text-white/25 text-[10px] mr-1">React:</p>
        {QUICK_EMOJIS.map((e) => (
          <button key={e} onClick={() => onReact(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-center py-10 text-white/20 text-xs">Chat is open — say hello! 👋</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
              msg.isHost ? 'bg-violet-600 text-white' : msg.isMe ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/60'
            }`}>
              {msg.isHost ? '🎙' : msg.user.substring(0, 2).toUpperCase()}
            </div>
            <div className={`flex-1 flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[82%]`}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className={`text-[9px] font-semibold ${msg.isHost ? 'text-violet-400' : msg.isMe ? 'text-indigo-400' : 'text-white/30'}`}>
                  {msg.isHost ? 'Host' : msg.isMe ? 'You' : msg.user}
                </span>
                <span className="text-white/15 text-[8px]">
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`px-2.5 py-1.5 rounded-xl text-xs text-white/85 ${
                msg.isHost ? 'bg-violet-600/20 border border-violet-500/20'
                : msg.isMe ? 'bg-indigo-600/20 border border-indigo-500/20'
                : 'bg-white/[0.04] border border-white/[0.06]'
              }`}>
                {msg.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.05] flex-shrink-0">
        {showEmoji && (
          <div className="mb-2">
            <EmojiPicker onPick={(e) => { setInput((v) => v + e); setShowEmoji(false); }} />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm flex items-center justify-center hover:bg-white/[0.08] transition-colors flex-shrink-0"
          >😊</button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Type a message…"
            maxLength={500}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-all min-w-0"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white flex items-center justify-center transition-all flex-shrink-0"
          >↑</button>
        </div>
      </div>
    </div>
  );
}
