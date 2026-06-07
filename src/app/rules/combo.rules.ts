/**
 * Combat-beat timing minigame: the player locks a sweeping marker in a target
 * band before a battle. Landing it grants a capped attack bonus for the next
 * run. Two nested zones reward precision — a tight Perfect core inside a wider
 * Good band — turning a binary hit/miss into a skill curve.
 *
 * Pure + leaf so it stays trivially testable and free of UI/state imports.
 */

export type ComboTier = 'perfect' | 'good' | 'miss';

export interface ComboZone {
  readonly min: number;
  readonly max: number;
}

/** Wider band: a solid landing. */
export const COMBO_GOOD_ZONE: ComboZone = { min: 0.38, max: 0.62 };
/** Tight core inside the good band: a precise landing. */
export const COMBO_PERFECT_ZONE: ComboZone = { min: 0.46, max: 0.54 };

export const COMBO_BONUS_GOOD = 0.05;
export const COMBO_BONUS_PERFECT = 0.1;

export interface ComboBeatResult {
  tier: ComboTier;
  /** Additive attack modifier applied to the next battle. */
  bonus: number;
}

const TIER_BONUS: Record<ComboTier, number> = {
  perfect: COMBO_BONUS_PERFECT,
  good: COMBO_BONUS_GOOD,
  miss: 0,
};

function inZone(marker: number, zone: ComboZone): boolean {
  return marker >= zone.min && marker <= zone.max;
}

/** Maps a marker position (0..1) to a tier and its bonus. */
export function resolveComboBeat(marker: number): ComboBeatResult {
  if (inZone(marker, COMBO_PERFECT_ZONE)) {
    return { tier: 'perfect', bonus: TIER_BONUS.perfect };
  }
  if (inZone(marker, COMBO_GOOD_ZONE)) {
    return { tier: 'good', bonus: TIER_BONUS.good };
  }
  return { tier: 'miss', bonus: TIER_BONUS.miss };
}

export function comboTierBonus(tier: ComboTier): number {
  return TIER_BONUS[tier];
}
