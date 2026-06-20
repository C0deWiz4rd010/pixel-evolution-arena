// @ts-check
/**
 * Procedural pixel-creature SVG generator for Pixel Evolution Arena.
 *
 * Generates one original, brand-safe, animated pixel sprite per playable
 * monster. Art is driven by three axes so the whole roster stays cohesive
 * while every creature reads as its own thing:
 *   - TYPE  -> palette + signature motif (flames, fins, gears, horns, ...)
 *   - STAGE -> body archetype, scale, and how much extra hardware it carries
 *   - NAME  -> deterministic seed that jitters eyes, horns, studs, posture
 *
 * Output: public/assets/creatures/playable/mNNN-slug.svg  (128x128)
 *
 * Run: node tools/generate-creatures.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'creatures', 'playable');

/** @typedef {{id:string,name:string,stage:string,type:string}} Roster */
/** @type {Roster[]} */
const ROSTER = [
  { id: 'M001', name: 'Bubblit', stage: 'Baby', type: 'Water' },
  { id: 'M002', name: 'Sproutbit', stage: 'Baby', type: 'Nature' },
  { id: 'M003', name: 'Emberling', stage: 'Baby', type: 'Fire' },
  { id: 'M004', name: 'Shadepuff', stage: 'Baby', type: 'Dark' },
  { id: 'M005', name: 'Sparkit', stage: 'Baby', type: 'Light' },
  { id: 'M006', name: 'Pebblip', stage: 'Baby', type: 'Beast' },
  { id: 'M007', name: 'Aquabun', stage: 'In-Training', type: 'Water' },
  { id: 'M008', name: 'Leafbyte', stage: 'In-Training', type: 'Nature' },
  { id: 'M009', name: 'Cinderpaw', stage: 'In-Training', type: 'Fire' },
  { id: 'M010', name: 'Nightnub', stage: 'In-Training', type: 'Dark' },
  { id: 'M011', name: 'Lumipup', stage: 'In-Training', type: 'Light' },
  { id: 'M012', name: 'Gearmite', stage: 'In-Training', type: 'Machine' },
  { id: 'M013', name: 'Oozelet', stage: 'In-Training', type: 'Toxic' },
  { id: 'M014', name: 'Splashfang', stage: 'Rookie', type: 'Water' },
  { id: 'M015', name: 'Thornkit', stage: 'Rookie', type: 'Nature' },
  { id: 'M016', name: 'Pyroclaw', stage: 'Rookie', type: 'Fire' },
  { id: 'M017', name: 'Shadowimp', stage: 'Rookie', type: 'Dark' },
  { id: 'M018', name: 'Voltbeak', stage: 'Rookie', type: 'Light' },
  { id: 'M019', name: 'Gearfox', stage: 'Rookie', type: 'Machine' },
  { id: 'M020', name: 'Mossnail', stage: 'Rookie', type: 'Nature' },
  { id: 'M021', name: 'Venomote', stage: 'Rookie', type: 'Toxic' },
  { id: 'M022', name: 'Cragcub', stage: 'Rookie', type: 'Beast' },
  { id: 'M023', name: 'Tideraptor', stage: 'Champion', type: 'Water' },
  { id: 'M024', name: 'Bramblehorn', stage: 'Champion', type: 'Nature' },
  { id: 'M025', name: 'Blazehound', stage: 'Champion', type: 'Fire' },
  { id: 'M026', name: 'Duskraider', stage: 'Champion', type: 'Dark' },
  { id: 'M027', name: 'Gearfox MkII', stage: 'Champion', type: 'Machine' },
  { id: 'M028', name: 'Voltgryphon', stage: 'Champion', type: 'Light' },
  { id: 'M029', name: 'Sludgebloom', stage: 'Champion', type: 'Toxic' },
  { id: 'M030', name: 'Ironmoss', stage: 'Champion', type: 'Machine' },
  { id: 'M031', name: 'Fangquartz', stage: 'Champion', type: 'Beast' },
  { id: 'M032', name: 'Stormjaw', stage: 'Ultimate', type: 'Water' },
  { id: 'M033', name: 'Thornrex', stage: 'Ultimate', type: 'Nature' },
  { id: 'M034', name: 'Infernodon', stage: 'Ultimate', type: 'Fire' },
  { id: 'M035', name: 'Nightreaver', stage: 'Ultimate', type: 'Dark' },
  { id: 'M036', name: 'Aurorawing', stage: 'Ultimate', type: 'Light' },
  { id: 'M037', name: 'Toximander', stage: 'Ultimate', type: 'Toxic' },
  { id: 'M038', name: 'Mechabison', stage: 'Ultimate', type: 'Machine' },
  { id: 'M039', name: 'Leviacore', stage: 'Mega', type: 'Water' },
  { id: 'M040', name: 'Solarthorn', stage: 'Mega', type: 'Nature' },
  { id: 'M041', name: 'ObsidianZero', stage: 'Mega', type: 'Dark' },
  { id: 'M042', name: 'Helioforge', stage: 'Mega', type: 'Fire' },
  { id: 'M043', name: 'Galewarden', stage: 'Mega', type: 'Light' },
  { id: 'M044', name: 'Virulisk', stage: 'Mega', type: 'Toxic' },
  { id: 'M045', name: 'AstralNova', stage: 'Special', type: 'Light' },
  { id: 'M046', name: 'MechaTitan', stage: 'Special', type: 'Machine' },
  { id: 'M047', name: 'VoidSeraph', stage: 'Special', type: 'Dark' },
  { id: 'M048', name: 'Chronodrake', stage: 'Special', type: 'Beast' },
  { id: 'M049', name: 'Bloomgeist', stage: 'Special', type: 'Nature' },
  { id: 'M050', name: 'Prismyr', stage: 'Special', type: 'Light' },
  { id: 'M051', name: 'Wispfade', stage: 'In-Training', type: 'Dark' },
  { id: 'M052', name: 'Mirefade', stage: 'Rookie', type: 'Dark' },
  { id: 'M053', name: 'Hollowveil', stage: 'Champion', type: 'Dark' },
  { id: 'M054', name: 'Wraithlord', stage: 'Ultimate', type: 'Dark' },
  { id: 'M055', name: 'Nullruler', stage: 'Mega', type: 'Dark' },
  { id: 'M056', name: 'Antinexus', stage: 'Special', type: 'Dark' },
  { id: 'M057', name: 'Glowmoth', stage: 'In-Training', type: 'Light' },
  { id: 'M058', name: 'Halofly', stage: 'Rookie', type: 'Light' },
  { id: 'M059', name: 'Auraknight', stage: 'Champion', type: 'Light' },
  { id: 'M060', name: 'Solareaper', stage: 'Ultimate', type: 'Light' },
  { id: 'M061', name: 'Empyreal', stage: 'Mega', type: 'Light' },
  { id: 'M062', name: 'Cosmosaint', stage: 'Special', type: 'Light' },
  { id: 'M063', name: 'Tempestguard', stage: 'Special', type: 'Water' },
  { id: 'M064', name: 'Magmastorm', stage: 'Special', type: 'Fire' },
  { id: 'M065', name: 'Worldsbane', stage: 'Special', type: 'Toxic' },
  { id: 'M066', name: 'Rockpup', stage: 'In-Training', type: 'Beast' },
  { id: 'M067', name: 'StoneCrown', stage: 'Mega', type: 'Beast' },
  { id: 'M068', name: 'OmegaFrame', stage: 'Mega', type: 'Machine' },
  { id: 'M069', name: 'TidalWolf', stage: 'Rookie', type: 'Water' },
  { id: 'M070', name: 'FrostFang', stage: 'Champion', type: 'Water' },
  { id: 'M071', name: 'IceColossus', stage: 'Ultimate', type: 'Water' },
];

/** Palette per element: [outline, shadow/dark, base, light/belly, glow accent] */
const PALETTE = {
  Nature: { out: '#06180f', dark: '#13693a', base: '#39c66f', light: '#c4ff8f', glow: '#b7ff5f', spark: '#eaffd0' },
  Fire: { out: '#260803', dark: '#8a2208', base: '#ff6a1f', light: '#ffd23f', glow: '#ff9c24', spark: '#fff1c2' },
  Water: { out: '#041826', dark: '#0d5278', base: '#21a3da', light: '#9aedff', glow: '#36d6ff', spark: '#e3fbff' },
  Dark: { out: '#070310', dark: '#241548', base: '#6f54f0', light: '#c79bff', glow: '#d95dff', spark: '#f0d8ff' },
  Light: { out: '#2a2206', dark: '#9a7a14', base: '#ffce3a', light: '#fff4bd', glow: '#ffe884', spark: '#fffbe6' },
  Machine: { out: '#091318', dark: '#34505c', base: '#7fa6b6', light: '#d4ecf5', glow: '#37e0ff', spark: '#eafaff' },
  Beast: { out: '#1c0f06', dark: '#7a451d', base: '#c8813c', light: '#f2cd92', glow: '#ffb24d', spark: '#fff0d6' },
  Toxic: { out: '#0c1a05', dark: '#3a2266', base: '#9ad42a', light: '#dcff7a', glow: '#c084fc', spark: '#f1ffcf' },
};

const STAGE_TIER = { Baby: 0, 'In-Training': 1, Rookie: 2, Champion: 3, Ultimate: 4, Mega: 5, Special: 6 };

/** Deterministic hash -> seed */
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** mulberry32 PRNG */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n) => Math.round(n * 100) / 100;
function chamfer(cx, top, w, h, c) {
  // chamfered rounded-rect polygon centred on cx, spanning [top, top+h]
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = top;
  const y1 = top + h;
  return [
    `${r2(x0 + c)},${r2(y0)}`,
    `${r2(x1 - c)},${r2(y0)}`,
    `${r2(x1)},${r2(y0 + c)}`,
    `${r2(x1)},${r2(y1 - c)}`,
    `${r2(x1 - c)},${r2(y1)}`,
    `${r2(x0 + c)},${r2(y1)}`,
    `${r2(x0)},${r2(y1 - c)}`,
    `${r2(x0)},${r2(y0 + c)}`,
  ].join(' ');
}

function buildSvg(mon) {
  const p = PALETTE[mon.type];
  const tier = STAGE_TIER[mon.stage];
  const rand = rng(hashSeed(mon.id + mon.name));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (a, b) => a + rand() * (b - a);

  // --- proportions scale with stage tier, then a seeded archetype warps the
  //     silhouette so two same-stage creatures never share a body shape ---
  const scale = 0.78 + tier * 0.05; // baby smallest, special biggest
  const archetype = pick(['round', 'stout', 'lithe', 'tall', 'round', 'stout']);
  const aspect = {
    round: { w: 1.2, h: 0.82 },
    stout: { w: 1.06, h: 0.95 },
    lithe: { w: 0.86, h: 1.08 },
    tall: { w: 0.76, h: 1.24 },
  }[archetype];
  const bodyW = Math.round((34 + tier * 2) * scale * aspect.w + between(-1, 2));
  const bodyH = Math.round((28 + tier * 5) * scale * aspect.h);
  const cx = 64;
  const groundY = 112;
  const bodyTop = groundY - bodyH - (tier >= 3 ? 8 : 4);
  const bodyC = pick([4, 5, 6, 7]);

  // head sits on top of body for higher tiers; merged blob for babies
  const hasHead = tier >= 1 && rand() > 0.15;
  const headW = Math.round(bodyW * between(0.62, 0.82));
  const headH = Math.round(headW * between(0.78, 0.95));
  const headTop = bodyTop - headH + Math.round(headH * 0.32);
  const headCx = cx;
  const headCy = headTop + headH / 2;

  // face anchor: where eyes go (head if present, else upper body)
  const faceTop = hasHead ? headTop : bodyTop + Math.round(bodyH * 0.18);
  const faceW = hasHead ? headW : bodyW;
  const faceCy = hasHead ? headCy : bodyTop + Math.round(bodyH * 0.34);

  const layers = [];
  const back = []; // behind body (wings, aura, tail)
  const front = []; // on top (face, studs, motifs)

  // ---------- AURA (high tiers) ----------
  if (tier >= 4) {
    const ar = bodyW / 2 + 14;
    back.push(
      `<rect x="${r2(cx - ar)}" y="${r2(bodyTop - 16)}" width="${r2(ar * 2)}" height="${r2(bodyH + 30)}" rx="6" fill="${p.glow}" class="glow" opacity="0.07"/>`,
    );
  }

  // ---------- GROUND SHADOW ----------
  layers.push(`<rect x="${r2(cx - bodyW / 2 - 2)}" y="${groundY + 2}" width="${r2(bodyW + 4)}" height="6" rx="3" fill="#000000" opacity="0.24"/>`);

  // ---------- WINGS (light/dark/water flyers at high tiers) ----------
  const wingTypes = ['Light', 'Dark', 'Water', 'Toxic'];
  const wantWings = tier >= 4 && (wingTypes.includes(mon.type) || rand() > 0.6);
  if (wantWings) {
    const wy = bodyTop + bodyH * 0.18;
    const ww = 22 + tier * 2;
    const wh = bodyH * 0.7;
    // left + right mirrored angular wings
    back.push(
      `<polygon class="wing wl" points="${r2(cx - bodyW / 2 + 4)},${r2(wy)} ${r2(cx - bodyW / 2 - ww)},${r2(wy - 6)} ${r2(cx - bodyW / 2 - ww + 6)},${r2(wy + wh)} ${r2(cx - bodyW / 2 + 6)},${r2(wy + wh * 0.6)}" fill="${p.dark}"/>`,
      `<polygon class="wing wl" points="${r2(cx - bodyW / 2 + 2)},${r2(wy + 3)} ${r2(cx - bodyW / 2 - ww + 5)},${r2(wy + 2)} ${r2(cx - bodyW / 2 - ww + 9)},${r2(wy + wh * 0.7)} ${r2(cx - bodyW / 2 + 4)},${r2(wy + wh * 0.5)}" fill="${p.base}" opacity="0.85"/>`,
      `<polygon class="wing wr" points="${r2(cx + bodyW / 2 - 4)},${r2(wy)} ${r2(cx + bodyW / 2 + ww)},${r2(wy - 6)} ${r2(cx + bodyW / 2 + ww - 6)},${r2(wy + wh)} ${r2(cx + bodyW / 2 - 6)},${r2(wy + wh * 0.6)}" fill="${p.dark}"/>`,
      `<polygon class="wing wr" points="${r2(cx + bodyW / 2 - 2)},${r2(wy + 3)} ${r2(cx + bodyW / 2 + ww - 5)},${r2(wy + 2)} ${r2(cx + bodyW / 2 + ww - 9)},${r2(wy + wh * 0.7)} ${r2(cx + bodyW / 2 - 4)},${r2(wy + wh * 0.5)}" fill="${p.base}" opacity="0.85"/>`,
    );
  }

  // ---------- TAIL (beast/water/dark) ----------
  if (['Beast', 'Water', 'Dark', 'Fire'].includes(mon.type) && tier >= 2 && rand() > 0.4) {
    const ty = groundY - 10;
    const side = rand() > 0.5 ? 1 : -1;
    const bx = cx + side * (bodyW / 2 - 2);
    back.push(
      `<polygon class="tail" points="${r2(bx)},${r2(ty - 6)} ${r2(bx + side * 16)},${r2(ty - 18)} ${r2(bx + side * 12)},${r2(ty - 2)} ${r2(bx + side * 18)},${r2(ty + 4)}" fill="${p.dark}"/>`,
      `<rect x="${r2(bx + side * 13)}" y="${r2(ty - 16)}" width="5" height="5" fill="${p.glow}" class="glow"/>`,
    );
  }

  // ---------- BODY ----------
  layers.push(`<polygon points="${chamfer(cx, bodyTop, bodyW, bodyH, bodyC)}" fill="${p.dark}"/>`);
  const innerW = bodyW - 6;
  const innerH = bodyH - 6;
  layers.push(`<polygon points="${chamfer(cx, bodyTop + 3, innerW, innerH, Math.max(2, bodyC - 1))}" fill="${p.base}"/>`);
  // belly highlight
  layers.push(`<rect x="${r2(cx - innerW * 0.32)}" y="${r2(bodyTop + 6)}" width="${r2(innerW * 0.45)}" height="${r2(innerH * 0.22)}" rx="2" fill="${p.light}" opacity="0.7"/>`);

  // ---------- FEET (tier >= 2) ----------
  if (tier >= 2) {
    const fw = 9;
    front.push(
      `<rect x="${r2(cx - bodyW / 2 + 3)}" y="${groundY - 7}" width="${fw}" height="8" rx="2" fill="${p.dark}"/>`,
      `<rect x="${r2(cx + bodyW / 2 - 3 - fw)}" y="${groundY - 7}" width="${fw}" height="8" rx="2" fill="${p.dark}"/>`,
      `<rect x="${r2(cx - bodyW / 2 + 5)}" y="${groundY - 4}" width="3" height="3" fill="${p.glow}" class="glow"/>`,
      `<rect x="${r2(cx + bodyW / 2 - 8)}" y="${groundY - 4}" width="3" height="3" fill="${p.glow}" class="glow"/>`,
    );
  }

  // ---------- ARMS (tier >= 3) ----------
  if (tier >= 3) {
    const ay = bodyTop + bodyH * 0.4;
    front.push(
      `<rect x="${r2(cx - bodyW / 2 - 5)}" y="${r2(ay)}" width="7" height="${r2(bodyH * 0.4)}" rx="2" fill="${p.dark}"/>`,
      `<rect x="${r2(cx + bodyW / 2 - 2)}" y="${r2(ay)}" width="7" height="${r2(bodyH * 0.4)}" rx="2" fill="${p.dark}"/>`,
    );
    // claws for beast/dark
    if (['Beast', 'Dark', 'Fire'].includes(mon.type)) {
      const cyl = ay + bodyH * 0.4;
      front.push(
        `<polygon points="${r2(cx - bodyW / 2 - 5)},${r2(cyl)} ${r2(cx - bodyW / 2 - 7)},${r2(cyl + 6)} ${r2(cx - bodyW / 2 + 2)},${r2(cyl)}" fill="${p.spark}"/>`,
        `<polygon points="${r2(cx + bodyW / 2 + 5)},${r2(cyl)} ${r2(cx + bodyW / 2 + 7)},${r2(cyl + 6)} ${r2(cx + bodyW / 2 - 2)},${r2(cyl)}" fill="${p.spark}"/>`,
      );
    }
  }

  // ---------- HEAD ----------
  if (hasHead) {
    layers.push(`<polygon points="${chamfer(headCx, headTop, headW, headH, Math.max(3, bodyC - 1))}" fill="${p.dark}"/>`);
    layers.push(`<polygon points="${chamfer(headCx, headTop + 2, headW - 5, headH - 5, Math.max(2, bodyC - 2))}" fill="${p.base}"/>`);
  }

  // ---------- TYPE MOTIFS (head-mounted) ----------
  const motifTop = faceTop;
  switch (mon.type) {
    case 'Nature': {
      // leaf pair sprout
      front.push(
        `<polygon class="bob-leaf" points="${r2(cx - 2)},${r2(motifTop)} ${r2(cx - 16)},${r2(motifTop - 8)} ${r2(cx - 4)},${r2(motifTop - 12)}" fill="${p.light}"/>`,
        `<polygon class="bob-leaf" points="${r2(cx + 2)},${r2(motifTop)} ${r2(cx + 16)},${r2(motifTop - 8)} ${r2(cx + 4)},${r2(motifTop - 12)}" fill="${p.glow}"/>`,
        `<rect x="${r2(cx - 1)}" y="${r2(motifTop - 12)}" width="3" height="14" fill="${p.dark}"/>`,
      );
      break;
    }
    case 'Fire': {
      // flame crest
      front.push(
        `<polygon class="glow flame" points="${r2(cx)},${r2(motifTop - 18)} ${r2(cx - 9)},${r2(motifTop)} ${r2(cx + 9)},${r2(motifTop)}" fill="${p.glow}"/>`,
        `<polygon class="glow flame" points="${r2(cx)},${r2(motifTop - 11)} ${r2(cx - 5)},${r2(motifTop)} ${r2(cx + 5)},${r2(motifTop)}" fill="${p.light}"/>`,
        `<rect x="${r2(cx - 14)}" y="${r2(motifTop - 6)}" width="3" height="3" fill="${p.glow}" class="ember"/>`,
        `<rect x="${r2(cx + 12)}" y="${r2(motifTop - 9)}" width="3" height="3" fill="${p.light}" class="ember"/>`,
      );
      break;
    }
    case 'Water': {
      // dorsal fin + droplet
      front.push(
        `<polygon points="${r2(cx - 8)},${r2(motifTop)} ${r2(cx)},${r2(motifTop - 14)} ${r2(cx + 8)},${r2(motifTop)}" fill="${p.dark}"/>`,
        `<polygon points="${r2(cx - 4)},${r2(motifTop)} ${r2(cx)},${r2(motifTop - 9)} ${r2(cx + 4)},${r2(motifTop)}" fill="${p.light}"/>`,
        `<rect x="${r2(cx - 18)}" y="${r2(motifTop - 4)}" width="3" height="3" fill="${p.spark}" class="scan"/>`,
      );
      break;
    }
    case 'Dark': {
      // twin horns + visor
      front.push(
        `<polygon points="${r2(cx - faceW / 2 + 3)},${r2(motifTop + 2)} ${r2(cx - faceW / 2 - 5)},${r2(motifTop - 12)} ${r2(cx - faceW / 2 + 9)},${r2(motifTop - 2)}" fill="${p.dark}"/>`,
        `<polygon points="${r2(cx + faceW / 2 - 3)},${r2(motifTop + 2)} ${r2(cx + faceW / 2 + 5)},${r2(motifTop - 12)} ${r2(cx + faceW / 2 - 9)},${r2(motifTop - 2)}" fill="${p.dark}"/>`,
        `<rect x="${r2(cx - faceW / 2 - 4)}" y="${r2(motifTop - 12)}" width="3" height="3" fill="${p.glow}" class="glow"/>`,
        `<rect x="${r2(cx + faceW / 2 + 1)}" y="${r2(motifTop - 12)}" width="3" height="3" fill="${p.glow}" class="glow"/>`,
      );
      break;
    }
    case 'Light': {
      // halo ring
      front.push(
        `<ellipse class="glow halo" cx="${cx}" cy="${r2(motifTop - 10)}" rx="${r2(faceW * 0.42)}" ry="4" fill="none" stroke="${p.glow}" stroke-width="3"/>`,
        `<rect x="${r2(cx - 1)}" y="${r2(motifTop - 18)}" width="3" height="6" fill="${p.spark}" class="glow"/>`,
      );
      break;
    }
    case 'Machine': {
      // antenna + side bolts
      front.push(
        `<rect x="${r2(cx - 1)}" y="${r2(motifTop - 16)}" width="3" height="14" fill="${p.dark}"/>`,
        `<rect x="${r2(cx - 3)}" y="${r2(motifTop - 20)}" width="7" height="7" rx="1" fill="${p.glow}" class="glow"/>`,
        `<rect x="${r2(cx - faceW / 2 - 3)}" y="${r2(faceCy - 2)}" width="4" height="4" fill="${p.light}"/>`,
        `<rect x="${r2(cx + faceW / 2 - 1)}" y="${r2(faceCy - 2)}" width="4" height="4" fill="${p.light}"/>`,
      );
      break;
    }
    case 'Beast': {
      // ears + fangs
      front.push(
        `<polygon points="${r2(cx - faceW / 2 + 2)},${r2(motifTop + 4)} ${r2(cx - faceW / 2 - 2)},${r2(motifTop - 10)} ${r2(cx - faceW / 2 + 12)},${r2(motifTop)}" fill="${p.dark}"/>`,
        `<polygon points="${r2(cx + faceW / 2 - 2)},${r2(motifTop + 4)} ${r2(cx + faceW / 2 + 2)},${r2(motifTop - 10)} ${r2(cx + faceW / 2 - 12)},${r2(motifTop)}" fill="${p.dark}"/>`,
        `<polygon points="${r2(cx - faceW / 2 + 4)},${r2(motifTop + 2)} ${r2(cx - faceW / 2 + 1)},${r2(motifTop - 6)} ${r2(cx - faceW / 2 + 9)},${r2(motifTop + 1)}" fill="${p.light}"/>`,
        `<polygon points="${r2(cx + faceW / 2 - 4)},${r2(motifTop + 2)} ${r2(cx + faceW / 2 - 1)},${r2(motifTop - 6)} ${r2(cx + faceW / 2 - 9)},${r2(motifTop + 1)}" fill="${p.light}"/>`,
      );
      break;
    }
    case 'Toxic': {
      // back spikes + drip
      front.push(
        `<polygon points="${r2(cx - 10)},${r2(motifTop)} ${r2(cx - 6)},${r2(motifTop - 11)} ${r2(cx - 2)},${r2(motifTop)}" fill="${p.glow}"/>`,
        `<polygon points="${r2(cx + 2)},${r2(motifTop)} ${r2(cx + 6)},${r2(motifTop - 13)} ${r2(cx + 10)},${r2(motifTop)}" fill="${p.glow}"/>`,
        `<rect x="${r2(cx + faceW / 2 - 6)}" y="${r2(faceCy + 6)}" width="4" height="6" rx="2" fill="${p.glow}" class="drip"/>`,
      );
      break;
    }
  }

  // ---------- CROWN / EXTRA HARDWARE for Mega/Special ----------
  if (tier >= 5) {
    front.push(
      `<polygon points="${r2(cx - 12)},${r2(motifTop - 2)} ${r2(cx - 8)},${r2(motifTop - 12)} ${r2(cx - 4)},${r2(motifTop - 2)} ${r2(cx)},${r2(motifTop - 14)} ${r2(cx + 4)},${r2(motifTop - 2)} ${r2(cx + 8)},${r2(motifTop - 12)} ${r2(cx + 12)},${r2(motifTop - 2)}" fill="${p.spark}" class="glow" opacity="0.9"/>`,
    );
  }

  // ---------- FACE: eyes + mouth ----------
  const eyeStyle = pick(['twin', 'twin', 'twin', 'cyclops', 'visor']);
  const eyeY = r2(faceCy - 1);
  if (eyeStyle === 'cyclops') {
    front.push(
      `<g class="eyes"><rect x="${r2(cx - 6)}" y="${eyeY - 4}" width="12" height="9" rx="2" fill="${p.out}"/>` +
        `<rect x="${r2(cx - 3)}" y="${eyeY - 1}" width="6" height="5" fill="${p.glow}" class="glow"/></g>`,
    );
  } else if (eyeStyle === 'visor') {
    front.push(
      `<g class="eyes"><rect x="${r2(cx - faceW * 0.34)}" y="${eyeY - 2}" width="${r2(faceW * 0.68)}" height="6" rx="2" fill="${p.out}"/>` +
        `<rect x="${r2(cx - faceW * 0.3)}" y="${eyeY - 1}" width="${r2(faceW * 0.6)}" height="3" fill="${p.glow}" class="glow"/></g>`,
    );
  } else {
    const sp = Math.max(7, faceW * 0.22);
    front.push(
      `<g class="eyes">` +
        `<rect x="${r2(cx - sp - 3)}" y="${eyeY - 3}" width="7" height="8" rx="1" fill="${p.out}"/>` +
        `<rect x="${r2(cx + sp - 4)}" y="${eyeY - 3}" width="7" height="8" rx="1" fill="${p.out}"/>` +
        `<rect x="${r2(cx - sp - 1)}" y="${eyeY - 1}" width="3" height="4" fill="${p.glow}" class="glow"/>` +
        `<rect x="${r2(cx + sp - 2)}" y="${eyeY - 1}" width="3" height="4" fill="${p.glow}" class="glow"/>` +
        `</g>`,
    );
  }
  // mouth
  if (tier <= 1) {
    front.push(`<rect x="${r2(cx - 3)}" y="${eyeY + 8}" width="6" height="2" rx="1" fill="${p.out}" opacity="0.8"/>`);
  } else {
    front.push(
      `<polygon points="${r2(cx - 5)},${eyeY + 8} ${r2(cx + 5)},${eyeY + 8} ${r2(cx + 3)},${eyeY + 12} ${r2(cx - 3)},${eyeY + 12}" fill="${p.out}" opacity="0.85"/>`,
    );
    if (['Beast', 'Dark', 'Fire'].includes(mon.type)) {
      front.push(
        `<rect x="${r2(cx - 4)}" y="${eyeY + 8}" width="2" height="3" fill="${p.spark}"/>`,
        `<rect x="${r2(cx + 2)}" y="${eyeY + 8}" width="2" height="3" fill="${p.spark}"/>`,
      );
    }
  }

  // ---------- BELLY STUDS (tech glow) ----------
  const studCount = 1 + Math.floor(rand() * 3);
  const studYbase = bodyTop + bodyH * 0.5;
  for (let i = 0; i < studCount; i++) {
    const sx = cx - (studCount - 1) * 5 + i * 10;
    front.push(`<rect x="${r2(sx - 1.5)}" y="${r2(studYbase + (i % 2) * 4)}" width="4" height="8" rx="1" fill="${p.glow}" class="glow" opacity="0.8"/>`);
  }

  // scanline sweep over body
  front.push(`<rect class="scan" x="${r2(cx - bodyW / 2 + 2)}" y="${r2(bodyTop)}" width="${r2(bodyW - 4)}" height="3" fill="${p.spark}" opacity="0.2"/>`);

  const speedBob = (2.8 - tier * 0.12).toFixed(2);
  const body = `${back.join('\n    ')}\n    ${layers.join('\n    ')}\n    ${front.join('\n    ')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" shape-rendering="crispEdges" role="img" aria-labelledby="title desc" data-creature-id="${mon.id}" data-stage="${mon.stage}" data-type="${mon.type}">
  <title id="title">${mon.name} sprite</title>
  <desc id="desc">Original ${mon.stage} ${mon.type} pixel creature for Pixel Evolution Arena.</desc>
  <style><![CDATA[
    * { shape-rendering: crispEdges; }
    .idle { transform-box: fill-box; transform-origin: center bottom; animation: bob ${speedBob}s steps(2, end) infinite; }
    .eyes { transform-box: fill-box; transform-origin: center; animation: blink ${(3.8 + (tier % 3) * 0.6).toFixed(1)}s steps(1, end) infinite; }
    .glow { animation: glow 2.2s steps(2, end) infinite; }
    .scan { transform-box: fill-box; animation: scan 3.1s linear infinite; }
    .wing { transform-box: fill-box; transform-origin: center; animation: flap 1.6s ease-in-out infinite; }
    .wr { transform-origin: left center; }
    .wl { transform-origin: right center; }
    .flame { transform-box: fill-box; transform-origin: center bottom; animation: flick 0.5s steps(2, end) infinite; }
    .ember { animation: glow 0.9s steps(2, end) infinite; }
    .halo { animation: glow 2.6s ease-in-out infinite; }
    .drip { transform-box: fill-box; animation: drip 2.4s ease-in infinite; }
    .bob-leaf { transform-box: fill-box; transform-origin: center bottom; animation: sway 3.4s ease-in-out infinite; }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    @keyframes blink { 0%, 46%, 54%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.12); } }
    @keyframes glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    @keyframes scan { 0% { transform: translateY(0); opacity: 0.05; } 50% { opacity: 0.35; } 100% { transform: translateY(${bodyH - 4}px); opacity: 0.05; } }
    @keyframes flap { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.7); } }
    @keyframes flick { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.18) translateY(-2px); } }
    @keyframes drip { 0%, 60% { transform: translateY(0); opacity: 0.9; } 90% { transform: translateY(6px); opacity: 0; } 100% { opacity: 0; } }
    @keyframes sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
    @media (prefers-reduced-motion: reduce) { .idle, .eyes, .glow, .scan, .wing, .flame, .ember, .halo, .drip, .bob-leaf { animation: none; } }
  ]]></style>
  <rect width="128" height="128" fill="none"/>
  <g class="idle" stroke="${p.out}" stroke-width="0">
    ${body}
  </g>
</svg>
`;
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// fresh dir
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const mon of ROSTER) {
  const file = `${mon.id.toLowerCase()}-${slug(mon.name)}.svg`;
  writeFileSync(join(OUT_DIR, file), buildSvg(mon), 'utf8');
  manifest.push({ id: mon.id, file });
}
writeFileSync(join(OUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated ${ROSTER.length} creature sprites into ${OUT_DIR}`);
