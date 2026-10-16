#!/usr/bin/env python3
"""Replace hard-coded colors that duplicate design tokens with the token itself.

rgba(r, g, b, a) whose rgb equals a token becomes color-mix(in srgb, var(--token) a%, transparent),
which renders the identical color but follows theme/accent changes. Exact hex duplicates of token
values become var(--token). The token definitions in src/styles/_tokens.scss are never touched.

usage: python scripts/tokenize-colors.py [--apply]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKENS = {
    (19, 216, 255): 'line',
    (156, 246, 255): 'line-bright',
    (131, 255, 69): 'success',
    (255, 86, 77): 'danger',
    (255, 220, 66): 'coin',
    (187, 105, 255): 'dna',
    (124, 255, 58): 'baby',
    (24, 210, 255): 'intraining',
    (255, 225, 43): 'rookie',
    (255, 156, 36): 'champion',
    (255, 69, 59): 'ultimate',
    (182, 99, 255): 'mega',
    (255, 85, 216): 'special',
    (234, 250, 255): 'text',
    (174, 217, 231): 'muted',
}
HEX = {'#%02x%02x%02x' % rgb: name for rgb, name in TOKENS.items()}
RGBA = re.compile(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)')
HEX_RE = re.compile(r'#[0-9a-fA-F]{6}\b')


def percent(alpha):
    value = round(float(alpha) * 100, 2)
    return f'{value:g}%'


def rewrite(text):
    count = 0

    def rgba(m):
        nonlocal count
        rgb = tuple(int(m.group(i)) for i in (1, 2, 3))
        name = TOKENS.get(rgb)
        if not name:
            return m.group(0)
        count += 1
        return f'color-mix(in srgb, var(--{name}) {percent(m.group(4))}, transparent)'

    def hexcolor(m):
        nonlocal count
        name = HEX.get(m.group(0).lower())
        if not name:
            return m.group(0)
        count += 1
        return f'var(--{name})'

    out = []
    for line in text.split('\n'):
        # never rewrite a custom-property definition (it may *be* the token)
        if re.match(r'\s*--[a-z0-9-]+\s*:', line):
            out.append(line)
            continue
        line = RGBA.sub(rgba, line)
        line = HEX_RE.sub(hexcolor, line)
        out.append(line)
    return '\n'.join(out), count


def main():
    apply = '--apply' in sys.argv
    files = [p for p in (ROOT / 'src').rglob('*.scss') if p.name != '_tokens.scss']
    total = 0
    for path in sorted(files):
        text = path.read_text(encoding='utf-8')
        new, count = rewrite(text)
        if count:
            total += count
            print(f'{count:4d}  {path.relative_to(ROOT)}')
            if apply:
                path.write_text(new, encoding='utf-8')
    print(f'{total} color literals {"replaced" if apply else "replaceable"}')


if __name__ == '__main__':
    main()
