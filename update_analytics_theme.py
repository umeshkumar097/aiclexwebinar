import re
with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx', 'r') as f:
    content = f.read()

replacements = [
    (r'text-white/40', 'text-muted-foreground'),
    (r'text-white/30', 'text-muted-foreground'),
    (r'text-white/50', 'text-muted-foreground'),
    (r'text-white/70', 'text-foreground'),
    (r'text-white/80', 'text-foreground'),
    (r'text-white', 'text-foreground'),
    (r'border-white/\[0\.06\]', 'border-slate-200'),
    (r'border-white/\[0\.05\]', 'border-slate-200'),
    (r'border-white/\[0\.04\]', 'border-slate-200'),
    (r'border-white/\[0\.08\]', 'border-slate-200'),
    (r'border-white/10', 'border-slate-200'),
    (r'bg-white/\[0\.04\]', 'bg-white shadow-sm'),
    (r'bg-white/\[0\.02\]', 'bg-slate-50'),
    (r'bg-white/5', 'bg-slate-100'),
    (r'hover:bg-white/10', 'hover:bg-slate-200'),
    (r'hover:bg-white/\[0\.02\]', 'hover:bg-slate-50'),
    (r'bg-\[\#0d0d14\]/80', 'bg-white shadow-sm'),
    (r'bg-\[\#0d0d14\]/60', 'bg-white shadow-sm'),
    (r'bg-\[\#0d0d14\]/40', 'bg-slate-50'),
    (r'bg-\[\#0d0d14\]', 'bg-white'),
    (r'bg-\[\#08080f\]', 'bg-white shadow-sm'),
    (r'placeholder-white/20', 'placeholder-muted-foreground'),
    (r'divide-white/\[0\.04\]', 'divide-slate-200'),
    (r'bg-black/85', 'bg-black/40'),
    (r'bg-violet-600 hover:bg-violet-500', 'bg-[#1d6fe8] hover:bg-blue-600 text-white'),
    (r'hover:text-white', 'hover:text-foreground'),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx', 'w') as f:
    f.write(content)

