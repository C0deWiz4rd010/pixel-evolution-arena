#!/usr/bin/env python3
"""Report (or remove) style rules and selectors that target classes no template uses.

A class counts as used when it appears in any template/TS source as a static class, a
[class.x] binding, a host class, a string literal, or matches a dynamic prefix such as
`stage-{{ ... }}`. A rule is removed when *every* selector in its list references at least one
unused class; mixed lists are trimmed to their live selectors. Element-only selectors are kept.

usage: python scripts/find-unused-css.py <file.scss> [--apply]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'src' / 'app'
NL = '\n'


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
        # string literals in TS and bound expressions: any kebab/word token could be a class
        for lit in re.findall(r"'([^'\n]{1,80})'|\"([^\"\n]{1,80})\"|`([^`]{1,200})`", text):
            for chunk in lit:
                # prose (sentences, lore, toasts) cannot be a class list
                if len(chunk.split()) > 5 or re.search(r'[.!?:] [A-Z]', chunk):
                    continue
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
    """Yield (selector_start, block_start, block_end, selector_text) for every block."""
    clean = strip_comments(css)
    stack = []
    seg_start = 0
    for i, c in enumerate(clean):
        if c == '{':
            stack.append((seg_start, i, clean[seg_start:i].strip()))
            seg_start = i + 1
        elif c == '}':
            if stack:
                s_start, b_start, selector = stack.pop()
                yield s_start, b_start, i, selector
            seg_start = i + 1
        elif c == ';':
            seg_start = i + 1


def split_selectors(selector):
    """Split a selector list on top-level commas only (keeps :is(a, b) intact)."""
    parts, depth, current = [], 0, ''
    for c in selector:
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        if c == ',' and depth == 0:
            parts.append(current.strip())
            current = ''
        else:
            current += c
    parts.append(current.strip())
    return [p for p in parts if p]


def selector_is_dead(selector, used, prefixes):
    def live(cls):
        return cls in used or any(cls.startswith(p) for p in prefixes)

    stripped = re.sub(r':not\([^)]*\)', '', selector)
    if re.search(r':(is|where)\(', stripped):
        # functional lists: dead only when nothing inside could ever match
        classes = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', stripped)
        return bool(classes) and not any(live(cls) for cls in classes)
    return any(not live(cls) for cls in re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', stripped))


def is_style_rule(selector):
    return bool(selector) and not selector.startswith(('@', '%')) and not re.match(r'^(from|to|\d+%)', selector)


def main():
    target = Path(sys.argv[1])
    apply = '--apply' in sys.argv
    css = target.read_text(encoding='utf-8')
    used, prefixes = collect_used_classes()

    dead, partial = [], []
    for s_start, b_start, b_end, selector in iter_rules(css):
        if not is_style_rule(selector):
            continue
        parts = split_selectors(selector)
        alive = [p for p in parts if not selector_is_dead(p, used, prefixes)]
        if parts and not alive:
            dead.append((s_start, b_end, selector))
        elif len(alive) < len(parts):
            partial.append((s_start, b_start, parts, alive))

    dead.sort()
    outer = []
    for item in dead:
        if outer and item[0] >= outer[-1][0] and item[1] <= outer[-1][1]:
            continue
        outer.append(item)

    for _, _, selector in outer:
        print('DEAD:', ' '.join(selector.split())[:110])
    for _, _, parts, alive in partial:
        removed = [p for p in parts if p not in alive]
        print('TRIM:', ', '.join(' '.join(p.split()) for p in removed)[:110])
    print(f'{len(outer)} dead rules, {len(partial)} selector lists with dead parts in {target}')

    if not apply:
        return
    edits = [(start, end + 1, None) for start, end, _ in outer]
    for s_start, b_start, parts, alive in partial:
        if any(o[0] <= s_start and b_start <= o[1] for o in outer):
            continue
        raw = css[s_start:b_start]
        # keep any comment that sits between the previous rule and this selector
        comment_end = raw.rfind('*/')
        keep = raw[:comment_end + 2] if comment_end >= 0 else ''
        rest = raw[len(keep):]
        lead = keep + re.match(r'\s*', rest).group(0)
        line_indent = lead.split(NL)[-1]
        joined = (',' + NL + line_indent).join(' '.join(p.split()) for p in alive)
        edits.append((s_start, b_start, lead + joined + ' '))
    for start, end, replacement in sorted(edits, reverse=True):
        if replacement is not None:
            css = css[:start] + replacement + css[end:]
            continue
        line_start = css.rfind(NL, 0, start) + 1
        if css[line_start:start].strip() == '':
            css = css[:line_start] + css[end:].lstrip(' \t').lstrip(NL)
        else:
            css = css[:start] + css[end:]
    css = re.sub(NL + '{3,}', NL + NL, css)
    target.write_text(css, encoding='utf-8')
    print('applied')


if __name__ == '__main__':
    main()
