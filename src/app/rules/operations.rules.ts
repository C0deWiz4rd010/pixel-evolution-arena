import { GEAR_DEFS } from '../data/gear.data';
import { GearDef, GearInstance, GearLoadout, GEAR_SLOTS, GearSlot } from '../models/gear.model';
import { Monster } from '../models/monster.model';
import { applyGearToMonster, canAfford, forgeCost, gearInstanceBonus, getGearDef } from './gear.rules';
import { getMonsterPower } from './squad.rules';

export interface SquadLoadoutPlan {
  loadout: GearLoadout;
  currentEquippedSlots: number;
  assignedSlots: number;
  totalSlots: number;
  currentCoveragePercent: number;
  coveragePercent: number;
  currentPower: number;
  projectedPower: number;
  powerGain: number;
}

export type ForgeQuickRecommendationKind = 'blocked' | 'equip' | 'forge' | 'upgrade' | 'open';

export interface ForgeQuickRecommendation {
  kind: ForgeQuickRecommendationKind;
  affordable: boolean;
  title: string;
  detail: string;
  actionLabel: string;
  metric: string;
  progressPercent: number;
  defId?: string;
  instanceId?: string;
}

type RoleId = 'vanguard' | 'core' | 'anchor';

const ROLE_ORDER: RoleId[] = ['vanguard', 'core', 'anchor'];

const ROLE_WEIGHTS: Record<RoleId, { attack: number; defense: number; speed: number; hp: number }> = {
  vanguard: { attack: 0.8, defense: 1.1, speed: 1, hp: 1.4 },
  core: { attack: 1.1, defense: 1, speed: 1.1, hp: 0.9 },
  anchor: { attack: 1.2, defense: 1.1, speed: 0.8, hp: 1 },
};

export function buildSquadLoadoutPlan(squad: Monster[], ownedGear: GearInstance[], currentLoadout: GearLoadout): SquadLoadoutPlan {
  const totalSlots = squad.length * GEAR_SLOTS.length;
  const nextLoadout: GearLoadout = {};
  const usedInstanceIds = new Set<string>();
  const slotEntries = ownedGear
    .map((instance) => {
      const def = getGearDef(instance.defId);
      return def ? { instance, def, bonus: gearInstanceBonus(instance) } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  for (const [index, monster] of squad.entries()) {
    const role = ROLE_ORDER[Math.min(index, ROLE_ORDER.length - 1)];
    for (const slot of GEAR_SLOTS) {
      const candidate = slotEntries
        .filter((entry) => entry.def.slot === slot && !usedInstanceIds.has(entry.instance.instanceId))
        .sort((left, right) => scoreBonus(right.bonus, role) - scoreBonus(left.bonus, role))[0];
      if (!candidate) {
        continue;
      }
      nextLoadout[monster.id] = { ...(nextLoadout[monster.id] ?? {}), [slot]: candidate.instance.instanceId };
      usedInstanceIds.add(candidate.instance.instanceId);
    }
  }

  const currentEquippedSlots = countEquippedSlots(squad, currentLoadout);
  const assignedSlots = countEquippedSlots(squad, nextLoadout);
  const currentPower = totalPower(squad, currentLoadout, ownedGear);
  const projectedPower = totalPower(squad, nextLoadout, ownedGear);

  return {
    loadout: nextLoadout,
    currentEquippedSlots,
    assignedSlots,
    totalSlots,
    currentCoveragePercent: toPercent(currentEquippedSlots, totalSlots),
    coveragePercent: toPercent(assignedSlots, totalSlots),
    currentPower,
    projectedPower,
    powerGain: projectedPower - currentPower,
  };
}

export function recommendForgeQuickAction(params: {
  squad: Monster[];
  ownedGear: GearInstance[];
  currentLoadout: GearLoadout;
  coins: number;
  dnaShards: number;
}): ForgeQuickRecommendation {
  const { squad, ownedGear, currentLoadout, coins, dnaShards } = params;
  if (squad.length === 0) {
    return {
      kind: 'blocked',
      affordable: false,
      title: 'Load a squad first',
      detail: 'Forge guidance comes online once at least one squad slot is filled.',
      actionLabel: 'Open Squad',
      metric: '0/12 slots',
      progressPercent: 0,
    };
  }

  const plan = buildSquadLoadoutPlan(squad, ownedGear, currentLoadout);
  if (plan.assignedSlots > plan.currentEquippedSlots || plan.powerGain > 0) {
    return {
      kind: 'equip',
      affordable: true,
      title: 'Auto-equip the squad',
      detail: `Projected gain +${plan.powerGain} team power across ${plan.assignedSlots}/${plan.totalSlots} slots.`,
      actionLabel: 'Auto Equip',
      metric: `${plan.assignedSlots}/${plan.totalSlots} slots`,
      progressPercent: plan.coveragePercent,
    };
  }

  const missingSlots = collectMissingSlots(squad, plan.loadout);
  if (missingSlots.length > 0) {
    const bestForge = chooseForgeTarget(missingSlots);
    if (bestForge) {
      const cost = forgeCost(bestForge, 0);
      const affordable = canAfford(cost, coins, dnaShards);
      return {
        kind: affordable ? 'forge' : 'open',
        affordable,
        title: `${bestForge.name} is the next clean upgrade`,
        detail: affordable
          ? `Forge it now to close an open ${bestForge.slot.toUpperCase()} lane.`
          : `Needs ${cost.coins} CR / ${cost.dnaShards} DNA before this ${bestForge.slot.toUpperCase()} slot can come online.`,
        actionLabel: affordable ? 'Forge Now' : 'Open Forge',
        metric: `${cost.coins} CR / ${cost.dnaShards} DNA`,
        progressPercent: plan.coveragePercent,
        defId: bestForge.id,
      };
    }
  }

  const bestUpgrade = chooseUpgradeTarget(ownedGear, plan.loadout, squad, coins, dnaShards);
  if (bestUpgrade) {
    const cost = forgeCost(bestUpgrade.def, bestUpgrade.instance.tier);
    const affordable = canAfford(cost, coins, dnaShards);
    return {
      kind: affordable ? 'upgrade' : 'open',
      affordable,
      title: `${bestUpgrade.def.name} can push the next power spike`,
      detail: affordable
        ? `Upgrade the equipped ${bestUpgrade.def.slot.toUpperCase()} gear to tier ${bestUpgrade.instance.tier + 1}.`
        : `Upgrade path spotted, but it still needs ${cost.coins} CR / ${cost.dnaShards} DNA.`,
      actionLabel: affordable ? 'Upgrade Gear' : 'Open Forge',
      metric: `T${bestUpgrade.instance.tier} -> T${bestUpgrade.instance.tier + 1}`,
      progressPercent: 100,
      instanceId: bestUpgrade.instance.instanceId,
    };
  }

  return {
    kind: 'open',
    affordable: true,
    title: 'Loadout is stable',
    detail: 'Every current gear lane is covered. Use the Forge to chase higher tiers or alternate stat mixes.',
    actionLabel: 'Open Forge',
    metric: `${plan.assignedSlots}/${plan.totalSlots} slots`,
    progressPercent: 100,
  };
}

function chooseForgeTarget(missingSlots: Array<{ slot: GearSlot; role: RoleId }>): GearDef | null {
  const candidates = GEAR_DEFS.map((def) => ({
    def,
    score: missingSlots
      .filter((entry) => entry.slot === def.slot)
      .reduce((total, entry) => total + scoreBonus(def.base, entry.role), 0),
  }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.def ?? null;
}

function chooseUpgradeTarget(
  ownedGear: GearInstance[],
  loadout: GearLoadout,
  squad: Monster[],
  coins: number,
  dnaShards: number,
): { instance: GearInstance; def: GearDef } | null {
  const equippedIds = new Set<string>();
  for (const monster of squad) {
    const slots = loadout[monster.id];
    if (!slots) {
      continue;
    }
    for (const slot of GEAR_SLOTS) {
      const instanceId = slots[slot];
      if (instanceId) {
        equippedIds.add(instanceId);
      }
    }
  }

  const candidates = ownedGear
    .filter((instance) => equippedIds.has(instance.instanceId))
    .map((instance) => {
      const def = getGearDef(instance.defId);
      if (!def || instance.tier >= 5) {
        return null;
      }
      const cost = forgeCost(def, instance.tier);
      return {
        instance,
        def,
        affordable: canAfford(cost, coins, dnaShards),
        score: scoreBonus(gearInstanceBonus({ ...instance, tier: instance.tier + 1 }), inferRoleForSlot(def.slot)) / (cost.coins + cost.dnaShards * 16),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => Number(right.affordable) - Number(left.affordable) || right.score - left.score);

  const best = candidates[0];
  return best ? { instance: best.instance, def: best.def } : null;
}

function collectMissingSlots(squad: Monster[], loadout: GearLoadout): Array<{ slot: GearSlot; role: RoleId }> {
  const missing: Array<{ slot: GearSlot; role: RoleId }> = [];
  for (const [index, monster] of squad.entries()) {
    const role = ROLE_ORDER[Math.min(index, ROLE_ORDER.length - 1)];
    for (const slot of GEAR_SLOTS) {
      if (!loadout[monster.id]?.[slot]) {
        missing.push({ slot, role });
      }
    }
  }
  return missing;
}

function countEquippedSlots(squad: Monster[], loadout: GearLoadout): number {
  let count = 0;
  for (const monster of squad) {
    const slots = loadout[monster.id];
    if (!slots) {
      continue;
    }
    for (const slot of GEAR_SLOTS) {
      if (slots[slot]) {
        count += 1;
      }
    }
  }
  return count;
}

function totalPower(squad: Monster[], loadout: GearLoadout, ownedGear: GearInstance[]): number {
  return squad.reduce((total, monster) => total + getMonsterPower(applyGearToMonster(monster, loadout, ownedGear)), 0);
}

function scoreBonus(
  bonus: { attack?: number; defense?: number; speed?: number; hp?: number },
  role: RoleId,
): number {
  const weights = ROLE_WEIGHTS[role];
  return (
    (bonus.attack ?? 0) * weights.attack +
    (bonus.defense ?? 0) * weights.defense +
    (bonus.speed ?? 0) * weights.speed +
    (bonus.hp ?? 0) * weights.hp
  );
}

function inferRoleForSlot(slot: GearSlot): RoleId {
  switch (slot) {
    case 'plate':
      return 'vanguard';
    case 'drive':
      return 'core';
    default:
      return 'anchor';
  }
}

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}
