// @ts-check
/**
 * Art-bible pass shared by every creature sprite (playable generator + generated-100 set).
 *
 *  1. Aura plates: the flat rectangles tagged `.glow` were animated to near-full opacity by the glow keyframes,
 *     which drew a hard colored box behind high-tier creatures. They become soft chamfered octagons with their
 *     own low-opacity `aura` pulse.
 *  2. Readable scale: Baby / In-Training / Rookie art only filled a quarter of the 128 canvas, so the body is
 *     scaled up around the ground line. Stage progression stays monotonic (bigger and more hardware per stage).
 *
 * The transform is idempotent (marked with data-art="2").
 */

const STAGE_SCALE = { Baby: 1.45, 'In-Training': 1.32, Rookie: 1.15 };
const GROUND_Y = 116;

/** @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c */
function octagon(x, y, w, h, c) {
  const pts = [
    [x + c, y],
    [x + w - c, y],
    [x + w, y + c],
    [x + w, y + h - c],
    [x + w - c, y + h],
    [x + c, y + h],
    [x, y + h - c],
    [x, y + c],
  ];
  return pts.map(([px, py]) => `${px},${py}`).join(' ');
}

/** @param {string} svg */
export function upgradeSvg(svg) {
  if (svg.includes('data-art="2"')) return svg;
  let out = svg.replace('<svg ', '<svg data-art="2" ');

  // 1. aura plates -> soft octagons
  out = out.replace(
    /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*?) fill="(#[0-9a-fA-F]{6})" class="glow" opacity="0\.(0\d?)"\/>/g,
    (match, x, y, w, h, rest, fill) => {
      if (Number(w) < 50 || Number(h) < 50) return match;
      const inset = 2;
      return `<polygon points="${octagon(Number(x) + inset, Number(y) + inset, Number(w) - inset * 2, Number(h) - inset * 2, 12)}" fill="${fill}" class="aura"/>`;
    },
  );
  if (out.includes('class="aura"')) {
    out = out.replace(
      /(\.glow \{[^}]*\})/,
      '$1\n    .aura { opacity: 0.08; animation: aura 3.2s ease-in-out infinite; }\n    @keyframes aura { 0%, 100% { opacity: 0.05; } 50% { opacity: 0.12; } }',
    );
    out = out.replace(/(@media \(prefers-reduced-motion: reduce\) \{ )/, '$1.aura { animation: none; } ');
  }

  // 2. scale small stages up around the ground line
  const stage = /data-stage="([^"]+)"/.exec(out)?.[1] ?? '';
  const scale = STAGE_SCALE[/** @type {keyof typeof STAGE_SCALE} */ (stage)];
  if (scale) {
    const open = /(<g class="idle"[^>]*>)/;
    const match = open.exec(out);
    if (match) {
      const start = match.index + match[0].length;
      const end = out.lastIndexOf('</g>');
      const inner = out.slice(start, end);
      out = `${out.slice(0, start)}<g transform="translate(64 ${GROUND_Y}) scale(${scale}) translate(-64 -${GROUND_Y})">${inner}</g>${out.slice(end)}`;
    }
  }
  return out;
}
