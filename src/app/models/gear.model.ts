/**
 * Persistent per-monster equipment. Distinct from one-shot combat consumables:
 * gear stays equipped between battles and feeds directly into monster power.
 */
export type GearSlot = 'core' | 'plate' | 'drive' | 'relic';

export interface GearStatBonus {
  attack?: number;
  defense?: number;
  speed?: number;
  hp?: number;
}

/** A forgeable gear blueprint. Forged instances scale its base bonus by tier. */
export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  icon: string;
  detail: string;
  /** Bonus granted at tier 1; each tier adds another `base` worth. */
  base: GearStatBonus;
  /** Coin + DNA cost to forge tier 1. Upgrades scale this up. */
  forgeCost: { coins: number; dnaShards: number };
}

/** An owned, forged gear instance with an upgrade tier (1..MAX). */
export interface GearInstance {
  instanceId: string;
  defId: string;
  tier: number;
}

/** monsterId -> slot -> gear instanceId. */
export type GearLoadout = Record<string, Partial<Record<GearSlot, string>>>;

export const MAX_GEAR_TIER = 5;
export const GEAR_SLOTS: GearSlot[] = ['core', 'plate', 'drive', 'relic'];
