/**
 * Creature sprites ship in two flavours: animated originals and frozen "still" copies built by
 * `scripts/build-sprite-stills.mjs`. Grids and lists use stills so dozens of <img> tags do not run
 * infinite SVG animations; hero, detail and battle views keep the animated original.
 */
const STILL_SETS = ['playable', 'generated-100'] as const;

export function stillSprite(url: string | null | undefined): string {
  if (!url) return '';
  for (const set of STILL_SETS) {
    const marker = `/creatures/${set}/`;
    if (url.includes(marker)) return url.replace(marker, `/creatures/${set}-still/`);
  }
  return url;
}

/** Animated original unless motion is reduced, in which case the still copy. */
export function heroSprite(url: string | null | undefined, motionReduced: boolean): string {
  return motionReduced ? stillSprite(url) : (url ?? '');
}
