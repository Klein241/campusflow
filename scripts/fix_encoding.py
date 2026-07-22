import sys, os
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'src\components\campus\cursus\student-cursus.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Double-encoded UTF-8 -> proper Unicode replacements
# Pattern: original UTF-8 char bytes were read as Latin-1 then re-saved as UTF-8
fixes = [
    # French chars
    ('\u00c3\u00a7on', '\u00e7on'),          # Ã§on -> çon (leçon)
    ('\u00c3\u00a9e', '\u00e9e'),            # Ã©e -> ée
    ('\u00c3\u00a9', '\u00e9'),              # Ã© -> é
    ('\u00c3\u00a8res', '\u00e8res'),        # Ã¨res -> ères
    ('\u00c3\u00a8re', '\u00e8re'),          # Ã¨re -> ère
    ('\u00c3\u00a8s', '\u00e8s'),            # Ã¨s -> ès
    ('\u00c3\u00a8', '\u00e8'),              # Ã¨ -> è
    ('\u00c3\u2030', '\u00e9'),              # Ã© (alt) -> é  (Ã\u2030 = C3 A9 in some)
    # Emojis (4-byte emoji stored as double-encoded)
    ('\u00e2\u009c\u0085', '\u2705'),        # âœ… -> ✅
    ('\u00e2\u009c\u201c', '\u2713'),        # âœ" -> ✓
    ('\u00e2\u009c\u2014', '\u2717'),        # âœ— -> ✗
    ('\u00e2\u009a\u00a1', '\u26a1'),        # âš¡ -> ⚡
    ('\u00e2\u0080\u201c', '\u2014'),        # â€" -> —
    ('\u00e2\u00ad\u0090', '\u2b50'),        # â­ -> ⭐
    ('\u00e2\u0094\u20ac', '\u2500'),        # â"€ -> ─
]

for old, new in fixes:
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        sys.stdout.write(f'Fixed {count}x U+{ord(old[0]):04X}... -> {repr(new)}\n')

# Now fix the 4-byte emojis that show as garbled 4-char sequences
# These are stored as their raw UTF-8 bytes mis-decoded as Latin-1, then re-encoded
# 📚 U+1F4DA: UTF-8 = F0 9F 93 9A -> Latin-1 chars: ð Ÿ " š -> re-encoded as UTF-8
emoji_fixes = [
    ('\u00f0\u009f\u0093\u009a', '\U0001f4da'),   # 📚
    ('\u00f0\u009f\u0093\u0096', '\U0001f4d6'),   # 📖
    ('\u00f0\u009f\u0091\u00a8\u00e2\u0080\u008d\u00f0\u009f\u008f\u00ab', '\U0001f468\u200d\U0001f3eb'),  # 👨‍🏫
]
for old, new in emoji_fixes:
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        sys.stdout.write(f'Fixed emoji {count}x -> {repr(new)}\n')

with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

sys.stdout.write('Done!\n')
