import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'src\components\campus\cursus\student-cursus.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# === EMOJI FIXES ===
# Each emoji's UTF-8 bytes were read as Windows-1252 characters, then re-saved as UTF-8.
# This creates a specific double-encoded pattern for each emoji.
#
# Formula: emoji_bytes -> CP1252_chars -> UTF-8_chars stored in file
# We search for the CP1252_chars (which Python decodes from the double-UTF8 in file)
# and replace with the correct emoji.
#
# E2 -> â (U+00E2)
# 9C -> œ (U+0153)  [CP1252 0x9C = œ]
# 93 -> " (U+201C)  [CP1252 0x93 = left double quote]
# 94 -> " (U+201D)  [CP1252 0x94 = right double quote]
# 85 -> … (U+2026)  [CP1252 0x85 = ellipsis]
# 80 -> € (U+20AC)  [CP1252 0x80 = euro]
# 9A -> š (U+0161)  [CP1252 0x9A = š]
# A1 -> ¡ (U+00A1)  [CP1252 0xA1 = inverted exclamation]
# 97 -> — (U+2014)  [CP1252 0x97 = em dash]
# F0 -> ð (U+00F0)
# 9F -> Ÿ (U+0178)  [CP1252 0x9F = Ÿ]
# 96 -> – (U+2013)  [CP1252 0x96 = en dash]
# 9A -> š (U+0161)

emoji_fixes = [
    # ✅ U+2705: bytes E2 9C 85 -> â(U+E2) + œ(U+153) + …(U+2026)
    ('\u00e2\u0153\u2026', '\u2705'),
    # ✓ U+2713: bytes E2 9C 93 -> â + œ + "(U+201C)
    ('\u00e2\u0153\u201c', '\u2713'),
    # ✗ U+2717: bytes E2 9C 97 -> â + œ + —(U+2014)
    ('\u00e2\u0153\u2014', '\u2717'),
    # ⚡ U+26A1: bytes E2 9A A1 -> â + š(U+161) + ¡(U+A1)
    ('\u00e2\u0161\u00a1', '\u26a1'),
    # — U+2014: bytes E2 80 94 -> â + €(U+20AC) + "(U+201D)
    ('\u00e2\u20ac\u201d', '\u2014'),
    # ─ U+2500: bytes E2 94 80 -> â + "(U+201D) + €(U+20AC)
    ('\u00e2\u201d\u20ac', '\u2500'),
    # 📚 U+1F4DA: bytes F0 9F 93 9A -> ð(F0) + Ÿ(9F=U+178) + "(9C but wait 93=U+201C) + š(9A=U+161)
    ('\u00f0\u0178\u201c\u0161', '\U0001f4da'),
    # 📖 U+1F4D6: bytes F0 9F 93 96 -> ð + Ÿ + "(U+201C) + –(96=U+2013 en dash)
    ('\u00f0\u0178\u201c\u2013', '\U0001f4d6'),
    # 👨 U+1F468: bytes F0 9F 91 A8 -> ð + Ÿ + '(91=U+2018 left single quote) + ¨(A8=U+A8)
    # + ZWJ U+200D: bytes E2 80 8D -> â + €(U+20AC) + (8D=undefined in CP1252, use U+008D)
    # + 🏫 U+1F3EB: bytes F0 9F 8F AB -> ð + Ÿ + (8F=undefined) + «(AB=U+AB)
    # This is complex - replace the whole sequence with text equivalent
    ('\u00f0\u0178\u2018\u00a8', '👨'),  # just the man emoji
]

count_total = 0
for old, new in emoji_fixes:
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        count_total += count
        sys.stdout.write(f'Fixed {count}x: U+{ord(old[0]):04X}...{ord(old[-1]):04X} -> {new}\n')

# Also handle the ── comment separators (â"€â"€)
sep_old = '\u00e2\u201d\u20ac\u00e2\u201d\u20ac'  # ─── doubled
sep_new = '──'
c2 = content.count(sep_old)
if c2:
    content = content.replace(sep_old, sep_new)
    sys.stdout.write(f'Fixed {c2}x double-box-drawing\n')

sys.stdout.write(f'\nTotal emoji fixes: {count_total}\n')

with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

sys.stdout.write('Done!\n')
