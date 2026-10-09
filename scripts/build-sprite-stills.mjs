#!/usr/bin/env node
/**
 * Builds static ("still") variants of every creature sprite.
 *
 * The source SVGs carry their own infinite CSS animations (bob, blink, glow, scan, ...). Those keep
 * running inside <img> tags, so a Collection grid with dozens of sprites repainted continuously and
 * ignored the in-app reduced-motion setting. Lists and grids use these stills; only hero, detail and
 * battle views load the animated originals.
 *
 * Usage: node scripts/build-sprite-stills.mjs   (writes public/assets/creatures/<set>-still/)
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/assets/creatures/', import.meta.url));
const SETS = ['playable', 'generated-100'];
const FREEZE_RULE = '*{animation:none!important;transition:none!important}';

function minify(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function freeze(svg) {
  if (/<\/style>/.test(svg)) {
    // Append inside the existing stylesheet (before the CDATA end when present).
    return svg.replace(/(\]\]>)?\s*<\/style>/, (_match, cdata) => `${FREEZE_RULE}${cdata ?? ''}</style>`);
  }
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${FREEZE_RULE}</style>`);
}

let count = 0;
let sourceBytes = 0;
let stillBytes = 0;
for (const set of SETS) {
  const sourceDir = join(ROOT, set);
  const targetDir = join(ROOT, `${set}-still`);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  for (const file of readdirSync(sourceDir)) {
    if (!file.endsWith('.svg')) continue;
    const source = readFileSync(join(sourceDir, file), 'utf8');
    const still = minify(freeze(source));
    writeFileSync(join(targetDir, file), still);
    count += 1;
    sourceBytes += Buffer.byteLength(source);
    stillBytes += Buffer.byteLength(still);
  }
}
console.log(`Built ${count} still sprites: ${(sourceBytes / 1024).toFixed(0)} kB -> ${(stillBytes / 1024).toFixed(0)} kB`);
