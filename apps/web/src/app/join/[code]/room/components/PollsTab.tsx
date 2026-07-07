'use client';
import { Poll } from './types';

export function PollsTab({ polls, onVote }: { polls: Poll[]; onVote: (pollId: string, optionId: string) => void }) {
  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-white/30 text-sm">No polls yet</p>
        <p className="text-white/20 text-xs mt-1">The host will start a poll soon</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {[...polls].reverse().map((poll) => {
        const showResults = !!poll.myVote || poll.closed;
        return (
          <div key={poll.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-white font-medium text-sm flex-1">{poll.question}</p>
              {poll.closed && (
                <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg flex-shrink-0">Ended</span>
              )}
            </div>

            <div className="space-y-2">
              {poll.options.map((opt) => {
                const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                const isMyVote = poll.myVote === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => !poll.myVote && !poll.closed ? onVote(poll.id, opt.id) : undefined}
                    disabled={!!poll.myVote || poll.closed}
                    className={`relative w-full text-left rounded-xl overflow-hidden border transition-all ${
                      isMyVote
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] disabled:cursor-default'
                    }`}
                  >
                    {showResults && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-700 ${isMyVote ? 'bg-violet-500/20' : 'bg-white/5'}`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {isMyVote && <span className="text-violet-400 text-xs font-bold">✓</span>}
                        <span className="text-white/80 text-xs">{opt.text}</span>
                      </div>
                      {showResults && (
                        <span className={`text-xs font-bold ${isMyVote ? 'text-violet-400' : 'text-white/40'}`}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {poll.totalVotes > 0 && (
              <p className="text-white/20 text-[10px] mt-2 text-right">{poll.totalVotes} votes</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
