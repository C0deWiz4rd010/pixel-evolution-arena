#!/usr/bin/env node
/**
 * Validates every creature sprite: 128x128 viewBox, reduced-motion block, no scripts/external refs,
 * under the size budget, and upgraded by the art-bible pass (data-art="2").
 *
 * Usage: node scripts/validate-sprites.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/assets/creatures/', import.meta.url));
const MAX_BYTES = 8 * 1024;
const problems = [];
let count = 0;

for (const set of ['playable', 'generated-100']) {
  for (const file of readdirSync(join(ROOT, set)).filter((name) => name.endsWith('.svg'))) {
    const path = join(ROOT, set, file);
    const svg = readFileSync(path, 'utf8');
    count += 1;
    const rule = (ok, message) => ok || problems.push(`${set}/${file}: ${message}`);
    rule(svg.includes('viewBox="0 0 128 128"'), 'viewBox must be 0 0 128 128');
    rule(svg.includes('prefers-reduced-motion'), 'missing reduced-motion block');
    rule(!/<script|href=|xlink:|url\(http/i.test(svg), 'scripts or external references are not allowed');
    rule(svg.includes('data-art="2"'), 'art-bible pass not applied (run tools/upgrade-creatures.mjs)');
    rule(statSync(path).size <= MAX_BYTES, `larger than ${MAX_BYTES} bytes`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${count} sprites valid`);
