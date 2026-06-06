/**
 * Pure gear math: resolve equipped bonuses, forge/upgrade costs, and apply
 * bonuses (plus the prismatic variant boost) to a monster's stat block.
 */
import { GEAR_DEFS } from '../data/gear.data';
import { Monster } from '../models/monster.model';
import { GearDef, GearInstance, GearLoadout, GearSlot, GearStatBonus, MAX_GEAR_TIER } from '../models/gear.model';

const GEAR_BY_ID = new Map<string, GearDef>(GEAR_DEFS.map((def) => [def.id, def]));

/** Prismatic (shiny) variants get a flat multiplicative stat uplift. */
export const PRISMATIC_STAT_MULTIPLIER = 1.08;

export function getGearDef(defId: string): GearDef | undefined {
  return GEAR_BY_ID.get(defId);
}

export function getGearInstance(ownedGear: GearInstance[], instanceId: string | undefined): GearInstance | null {
  if (!instanceId) {
    return null;
  }
  return ownedGear.find((entry) => entry.instanceId === instanceId) ?? null;
}

/** Bonus a single gear instance grants at its tier. */
export function gearInstanceBonus(instance: GearInstance): GearStatBonus {
  const def = GEAR_BY_ID.get(instance.defId);
  if (!def) {
    return {};
  }
  const tier = clampTier(instance.tier);
  return {
    attack: (def.base.attack ?? 0) * tier,
    defense: (def.base.defense ?? 0) * tier,
    speed: (def.base.speed ?? 0) * tier,
    hp: (def.base.hp ?? 0) * tier,
  };
}

/** Combined bonus from everything equipped on a monster. */
export function totalGearBonus(monsterId: string, loadout: GearLoadout, ownedGear: GearInstance[]): Required<GearStatBonus> {
  const equipped = loadout[monsterId] ?? {};
  const total = { attack: 0, defense: 0, speed: 0, hp: 0 };
  for (const slot of Object.keys(equipped) as GearSlot[]) {
    const instance = getGearInstance(ownedGear, equipped[slot]);
    if (!instance) {
      continue;
    }
    const bonus = gearInstanceBonus(instance);
    total.attack += bonus.attack ?? 0;
    total.defense += bonus.defense ?? 0;
    total.speed += bonus.speed ?? 0;
    total.hp += bonus.hp ?? 0;
  }
  return total;
}

/**
 * Returns a monster clone with gear + prismatic bonuses folded into its stats.
 * Used for battle simulation and effective-power display; never mutates input.
 */
export function applyGearToMonster(monster: Monster, loadout: GearLoadout, ownedGear: GearInstance[]): Monster {
  const bonus = totalGearBonus(monster.id, loadout, ownedGear);
  const variant = monster.prismatic ? PRISMATIC_STAT_MULTIPLIER : 1;
  return {
    ...monster,
    evolutionTargets: [...monster.evolutionTargets],
    attack: Math.round((monster.attack + bonus.attack) * variant),
    defense: Math.round((monster.defense + bonus.defense) * variant),
    speed: Math.round((monster.speed + bonus.speed) * variant),
    hp: Math.round((monster.hp + bonus.hp) * variant),
  };
}

/** Forge cost for the next tier (tier 1 = base forgeCost, upgrades scale up). */
export function forgeCost(def: GearDef, currentTier: number): { coins: number; dnaShards: number } {
  const nextTier = currentTier + 1;
  const factor = 1 + (nextTier - 1) * 0.6;
  return {
    coins: Math.round(def.forgeCost.coins * factor),
    dnaShards: Math.round(def.forgeCost.dnaShards * factor),
  };
}

export function canAfford(cost: { coins: number; dnaShards: number }, coins: number, dnaShards: number): boolean {
  return coins >= cost.coins && dnaShards >= cost.dnaShards;
}

export function clampTier(tier: number): number {
  return Math.max(1, Math.min(MAX_GEAR_TIER, Math.round(tier)));
}

/** Short label like "+14 ATK / +18 HP" for UI. */
export function describeGearBonus(bonus: GearStatBonus): string {
  const parts: string[] = [];
  if (bonus.attack) parts.push(`+${Math.round(bonus.attack)} ATK`);
  if (bonus.defense) parts.push(`+${Math.round(bonus.defense)} DEF`);
  if (bonus.speed) parts.push(`+${Math.round(bonus.speed)} SPD`);
  if (bonus.hp) parts.push(`+${Math.round(bonus.hp)} HP`);
  return parts.join(' / ') || 'No bonus';
}
