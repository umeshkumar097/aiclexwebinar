import re
with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/page.tsx', 'r') as f:
    content = f.read()

replacements = [
    (r"color: 'hsl\(262 83% 67%\)'", "color: '#1d6fe8'"),
    (r"bg: 'hsl\(262 83% 67% / 0.1\)'", "bg: 'rgba(29, 111, 232, 0.1)'"),
    
    (r"color: 'hsl\(217 91% 60%\)'", "color: '#f4b413'"),
    (r"bg: 'hsl\(217 91% 60% / 0.1\)'", "bg: 'rgba(244, 180, 19, 0.1)'"),
    
    (r"color: 'hsl\(142 71% 45%\)'", "color: '#10b981'"),
    (r"bg: 'hsl\(142 71% 45% / 0.1\)'", "bg: 'rgba(16, 185, 129, 0.1)'"),
    
    (r"bg-white/5", "bg-slate-100"),
    (r"divide-border/30", "divide-slate-200"),
    (r"hover:bg-white/\[0\.02\]", "hover:bg-slate-50"),
    
    (r"background: 'linear-gradient\(135deg, hsl\(262 83% 67%\), hsl\(217 91% 60%\)\)'", "background: 'linear-gradient(135deg, #1d6fe8, #3b82f6)'"),
    
    (r"background: 'hsl\(262 83% 67% / 0.1\)'", "background: 'rgba(29, 111, 232, 0.1)'"),
    
    (r"background:\n\s*'linear-gradient\(135deg, hsl\(262 83% 67% / 0.06\) 0%, hsl\(217 91% 60% / 0.04\) 100%\)'", "background: '#ffffff'"),
    (r"borderColor: 'hsl\(262 83% 67% / 0.2\)'", "borderColor: 'rgba(29, 111, 232, 0.2)'"),
    
    (r"background: 'hsl\(262 83% 67% / 0.15\)'", "background: 'rgba(29, 111, 232, 0.1)'"),
    
    (r"background: 'rgba\(255,255,255,0.03\)'", "background: 'rgba(0,0,0,0.02)'"),
    
    (r"'hsl\(142 71% 45% / 0.2\)'", "'rgba(16, 185, 129, 0.2)'"),
    (r"'hsl\(0 0% 20%\)'", "'rgba(0,0,0,0.05)'"),
    (r"'hsl\(142 71% 45% / 0.5\)'", "'rgba(16, 185, 129, 0.5)'"),
    (r"'hsl\(0 0% 30%\)'", "'rgba(0,0,0,0.1)'"),
    (r"'hsl\(142 71% 55%\)'", "'#10b981'"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open('/Users/aiclex/Downloads/Aiclex Meet/apps/web/src/app/(dashboard)/dashboard/page.tsx', 'w') as f:
    f.write(content)

