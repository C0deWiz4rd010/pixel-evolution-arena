#!/usr/bin/env python3
"""Report (or remove) global style rules whose selectors only target classes no template uses.

A class counts as used when it appears in any template/TS source as a static class, a
[class.x] binding, a host class, a string literal, or matches a dynamic prefix such as
`stage-{{ ... }}`. A rule is removed only when *every* selector in its list references at
least one unused class; element-only selectors are always kept.

usage: python scripts/find-unused-css.py src/styles.scss [--apply]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'src' / 'app'


def collect_used_classes():
    used, prefixes = set(), set()
    for path in list(APP.rglob('*.html')) + list(APP.rglob('*.ts')) + [ROOT / 'src' / 'index.html']:
        if path.name.endswith('.spec.ts'):
            continue
        text = path.read_text(encoding='utf-8')
        for m in re.finditer(r'class="([^"]*)"', text):
            for token in re.split(r'\s+', re.sub(r'\{\{[^}]*\}\}', ' {{}} ', m.group(1))):
                if token.endswith('-{{}}') or token.endswith('-'):
                    prefixes.add(token.replace('{{}}', ''))
                elif token and '{{' not in token:
                    used.add(token)
            for p in re.findall(r'([a-z][a-z0-9-]*-)\{\{', m.group(1)):
                prefixes.add(p)
        used.update(re.findall(r'\[class\.([a-zA-Z0-9_-]+)\]', text))
        used.update(re.findall(r"'\[class\.([a-zA-Z0-9_-]+)\]'", text))
        # string literals in TS and bound expressions: any kebab/word token could be a class
        for lit in re.findall(r"'([^'\n]{1,80})'|\"([^\"\n]{1,80})\"|`([^`]{1,200})`", text):
            for chunk in lit:
                for token in re.findall(r'[a-z][a-z0-9-]*', chunk):
                    used.add(token)
                for p in re.findall(r"([a-z][a-z0-9-]*-)\$\{", chunk):
                    prefixes.add(p)
        # 'portrait size-' + size  ->  prefix "size-" (last token of a concatenated literal)
        prefixes.update(re.findall(r"([a-z][a-z0-9-]*-)['\"] *\+", text))
    return used, prefixes


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)


def iter_rules(css):
    """Yield (selector_start, block_start, block_end, selector_text, depth) for style rules."""
    clean = strip_comments(css)
    stack = []
    i = 0
    seg_start = 0
    while i < len(clean):
        c = clean[i]
        if c == '{':
            selector = clean[seg_start:i]
            stack.append((seg_start, i, selector.strip()))
            seg_start = i + 1
        elif c == '}':
            if stack:
                s_start, b_start, selector = stack.pop()
                yield s_start, b_start, i, selector, len(stack)
            seg_start = i + 1
        elif c == ';':
            seg_start = i + 1
        i += 1


def selector_is_dead(selector, used, prefixes):
    classes = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', re.sub(r':not\([^)]*\)', '', selector))
    if not classes:
        return False
    for cls in classes:
        if cls in used or any(cls.startswith(p) for p in prefixes):
            continue
        return True
    return False


def main():
    target = Path(sys.argv[1])
    apply = '--apply' in sys.argv
    css = target.read_text(encoding='utf-8')
    used, prefixes = collect_used_classes()
    dead = []
    for s_start, b_start, b_end, selector, depth in iter_rules(css):
        if not selector or selector.startswith('@') or selector.startswith('%') or re.match(r'^(from|to|\d+%)', selector):
            continue
        parts = [p.strip() for p in selector.split(',') if p.strip()]
        if parts and all(selector_is_dead(p, used, prefixes) for p in parts):
            dead.append((s_start, b_end, selector))
    # drop nested duplicates (only remove outermost dead rules)
    dead.sort()
    outer = []
    for item in dead:
        if outer and item[0] >= outer[-1][0] and item[1] <= outer[-1][1]:
            continue
        outer.append(item)
    for _, _, selector in outer:
        print('DEAD:', ' '.join(selector.split())[:110])
    print(f'{len(outer)} dead rules in {target}')
    if apply:
        for start, end, _ in reversed(outer):
            # extend start back to the beginning of the line
            line_start = css.rfind('\n', 0, start) + 1
            css = css[:line_start] + css[end + 1:].lstrip(' \t').lstrip('\n') if css[line_start:start].strip() == '' else css[:start] + css[end + 1:]
        css = re.sub(r'\{\s*\n\s*\}', '{\n}', css)
        css = re.sub(r'\n{3,}', '\n\n', css)
        target.write_text(css, encoding='utf-8')
        print('applied')


if __name__ == '__main__':
    main()
