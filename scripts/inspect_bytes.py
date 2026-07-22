import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'src\components\campus\cursus\student-cursus.tsx'

with open(file_path, 'rb') as f:
    raw = f.read()

# Search for known mojibake patterns in raw bytes
patterns = {
    'checkmark_ok': b'\xe2\x9c\x85',     # UTF-8 of ✅ (if already fixed)
    'check': b'\xe2\x9c\x93',           # UTF-8 of ✓
    'cross': b'\xe2\x9c\x97',           # UTF-8 of ✗
    'lightning': b'\xe2\x9a\xa1',       # UTF-8 of ⚡
    'em_dash': b'\xe2\x80\x94',         # UTF-8 of —
    # double-encoded versions (UTF-8 bytes of the above, re-encoded as UTF-8 of Latin-1 chars)
    # ✅ U+2705: UTF-8 = E2 9C 85
    # Read as Latin-1: â (E2) œ (9C) … (85) -> re-saved as UTF-8:
    'dbl_checkmark': b'\xc3\xa2\xc2\x9c\xc2\x85',
    # ✓ U+2713: UTF-8 = E2 9C 93
    'dbl_check': b'\xc3\xa2\xc2\x9c\xc2\x93',
    # ✗ U+2717: UTF-8 = E2 9C 97
    'dbl_cross': b'\xc3\xa2\xc2\x9c\xc2\x97',
    # ⚡ U+26A1: UTF-8 = E2 9A A1
    'dbl_lightning': b'\xc3\xa2\xc2\x9a\xc2\xa1',
    # — U+2014: UTF-8 = E2 80 94
    'dbl_emdash': b'\xc3\xa2\xc2\x80\xc2\x94',
    # ─ U+2500: UTF-8 = E2 94 80
    'dbl_box': b'\xc3\xa2\xc2\x94\xc2\x80',
    # 📚 U+1F4DA: UTF-8 = F0 9F 93 9A
    'dbl_books': b'\xc3\xb0\xc2\x9f\xc2\x93\xc2\x9a',
    # 📖 U+1F4D6: UTF-8 = F0 9F 93 96
    'dbl_book': b'\xc3\xb0\xc2\x9f\xc2\x93\xc2\x96',
}

for name, pat in patterns.items():
    count = raw.count(pat)
    sys.stdout.write(f'{name}: {count}x found, bytes={pat.hex()}\n')

# Also show context around "Marquer"
idx = raw.find(b'Marquer')
if idx >= 0:
    chunk = raw[max(0,idx-5):idx+30]
    sys.stdout.write(f'\nAround "Marquer": {chunk.hex()} = {chunk!r}\n')

idx2 = raw.find(b'\xe2')
sys.stdout.write(f'\nFirst E2 byte at offset: {idx2}\n')
if idx2 >= 0:
    sys.stdout.write(f'Context: {raw[idx2:idx2+6].hex()}\n')
