'use client';

const MENU_ITEMS = [
  { icon: '📝', label: 'Notes',        action: 'notes',    danger: false, disabled: false },
  { icon: '⚙️', label: 'Settings',     action: 'settings', danger: false, disabled: true  },
  { icon: '🚩', label: 'Report Issue', action: 'report',   danger: false, disabled: true  },
  { icon: '🚪', label: 'Leave',        action: 'leave',    danger: true,  disabled: false },
];

export function MoreMenu({ onSelect }: { onSelect: (action: string) => void }) {
  return (
    <div className="flex flex-col p-3 gap-1">
      {MENU_ITEMS.map((item) => (
        <button
          key={item.action}
          disabled={item.disabled}
          onClick={() => !item.disabled && onSelect(item.action)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : item.disabled
              ? 'text-white/20 cursor-not-allowed'
              : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {item.disabled && <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">Soon</span>}
        </button>
      ))}
    </div>
  );
}
