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
    <div className="flex flex-col h-full" style={{ background: '#0f0f18' }}>
      {pinned && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#a78bfa' }}>📌 Pinned</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{pinned.message}</p>
        </div>
      )}

      {/* Quick reactions */}
      <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] mr-1" style={{ color: 'rgba(255,255,255,0.25)' }}>React:</p>
        {QUICK_EMOJIS.map((e) => (
          <button key={e} onClick={() => onReact(e)} className="text-lg hover:scale-125 active:scale-110 transition-transform select-none">{e}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
              💬
            </div>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Chat is open — say hello! 👋
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-lg ${
              msg.isHost
                ? ''
                : msg.isMe
                ? ''
                : ''
            }`}
              style={{
                background: msg.isHost
                  ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                  : msg.isMe
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: msg.isHost ? '14px' : undefined,
              }}>
              {msg.isHost ? '🎙' : msg.user.substring(0, 2).toUpperCase()}
            </div>

            <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[82%]`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-semibold"
                  style={{ color: msg.isHost ? '#a78bfa' : msg.isMe ? '#60a5fa' : 'rgba(255,255,255,0.35)' }}>
                  {msg.isHost ? '✦ Host' : msg.isMe ? 'You' : msg.user}
                </span>
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed"
                style={{
                  background: msg.isHost
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(109,40,217,0.15))'
                    : msg.isMe
                    ? 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(29,78,216,0.2))'
                    : 'rgba(255,255,255,0.06)',
                  border: msg.isHost
                    ? '1px solid rgba(139,92,246,0.3)'
                    : msg.isMe
                    ? '1px solid rgba(59,130,246,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.88)',
                  borderRadius: msg.isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                }}>
                {msg.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {showEmoji && (
          <div className="mb-2">
            <EmojiPicker onPick={(e) => { setInput((v) => v + e); setShowEmoji(false); }} />
          </div>
        )}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all hover:scale-105"
            style={{
              background: showEmoji ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showEmoji ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >😊</button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Message…"
            maxLength={500}
            className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all min-w-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.9)',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 disabled:opacity-30 disabled:scale-100"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
