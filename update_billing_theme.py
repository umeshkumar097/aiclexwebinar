import re
with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/billing/page.tsx', 'r') as f:
    content = f.read()

replacements = [
    (r"iconColor: 'hsl\(262 83% 67%\)'", "iconColor: '#1d6fe8'"),
    (r"iconBg: 'hsl\(262 83% 67% / 0.15\)'", "iconBg: 'rgba(29, 111, 232, 0.1)'"),
    (r"borderColor: 'hsl\(262 83% 67% / 0.3\)'", "borderColor: 'rgba(29, 111, 232, 0.2)'"),
    
    (r"iconColor: 'hsl\(38 92% 55%\)'", "iconColor: '#f4b413'"),
    (r"iconBg: 'hsl\(38 92% 55% / 0.15\)'", "iconBg: 'rgba(244, 180, 19, 0.1)'"),
    (r"borderColor: 'hsl\(38 92% 55% / 0.4\)'", "borderColor: 'rgba(244, 180, 19, 0.3)'"),

    (r"iconColor: 'hsl\(217 91% 60%\)'", "iconColor: '#1d6fe8'"),
    (r"iconBg: 'hsl\(217 91% 60% / 0.15\)'", "iconBg: 'rgba(29, 111, 232, 0.15)'"),
    (r"borderColor: 'hsl\(217 91% 60% / 0.4\)'", "borderColor: 'rgba(29, 111, 232, 0.4)'"),
    
    (r"text-white text-sm font-medium shadow-xl bg-violet-500/15 border-violet-500/30", "text-foreground text-sm font-medium shadow-md bg-white border-slate-200"),
    
    (r"background: 'linear-gradient\(135deg, hsl\(262 83% 67% / 0.08\) 0%, hsl\(217 91% 60% / 0.05\) 100%\)'", "background: '#ffffff'"),
    (r"borderColor: 'hsl\(262 83% 67% / 0.25\)'", "borderColor: 'rgba(29, 111, 232, 0.2)'"),
    
    (r"background: 'hsl\(262 83% 67% / 0.15\)'", "background: 'rgba(29, 111, 232, 0.1)'"),
    
    (r"background: 'hsl\(38 92% 55% / 0.2\)', color: 'hsl\(38 92% 65%\)'", "background: 'rgba(244, 180, 19, 0.15)', color: '#d97706'"),
    
    (r"text-muted-foreground bg-white/5 border border-white/10", "text-muted-foreground bg-slate-50 border border-slate-200"),
    
    (r"text-white transition-all", "text-white transition-all shadow-sm"),
    
    (r"hsl\(262 83% 67%\)", "#3b82f6"),
    
    (r"background: 'hsl\(262 83% 67% / 0.08\)'", "background: 'rgba(29, 111, 232, 0.08)'"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/billing/page.tsx', 'w') as f:
    f.write(content)

