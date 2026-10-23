#!/usr/bin/env node
/**
 * Applies the art-bible pass (tools/sprite-upgrade.mjs) to a creature sprite folder in place.
 *
 * Usage: node tools/upgrade-creatures.mjs generated-100   (then: node scripts/build-sprite-stills.mjs)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { upgradeSvg } from './sprite-upgrade.mjs';

const set = process.argv[2] ?? 'generated-100';
const dir = fileURLToPath(new URL(`../public/assets/creatures/${set}/`, import.meta.url));
let changed = 0;
for (const file of readdirSync(dir).filter((name) => name.endsWith('.svg'))) {
  const path = join(dir, file);
  const before = readFileSync(path, 'utf8');
  const after = upgradeSvg(before);
  if (after !== before) {
    writeFileSync(path, after, 'utf8');
    changed += 1;
  }
}
console.log(`Upgraded ${changed} sprites in ${set}`);
