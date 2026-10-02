import {
  RESEARCH_NODES,
  ResearchBranch,
  ResearchNodeDef,
  getResearchNode,
} from '../data/research.data';

/** Aggregated, resolved modifiers from every unlocked research node. */
export interface ResearchModifiers {
  coinMultiplier: number;
  dnaMultiplier: number;
  dataMultiplier: number;
  scanMultiplier: number;
  flatDataPerBattle: number;
  itemChanceBonus: number;
  revealLocked: boolean;
  autoScanReserves: boolean;
}

export const NEUTRAL_RESEARCH_MODIFIERS: ResearchModifiers = {
  coinMultiplier: 1,
  dnaMultiplier: 1,
  dataMultiplier: 1,
  scanMultiplier: 1,
  flatDataPerBattle: 0,
  itemChanceBonus: 0,
  revealLocked: false,
  autoScanReserves: false,
};

/** Fold all unlocked node effects into one modifier bundle. */
export function deriveResearchModifiers(unlockedIds: readonly string[]): ResearchModifiers {
  const mods: ResearchModifiers = { ...NEUTRAL_RESEARCH_MODIFIERS };
  for (const id of unlockedIds) {
    const node = getResearchNode(id);
    if (!node) {
      continue;
    }
    const e = node.effect;
    if (e.coinBonus) mods.coinMultiplier += e.coinBonus;
    if (e.dnaBonus) mods.dnaMultiplier += e.dnaBonus;
    if (e.dataBonus) mods.dataMultiplier += e.dataBonus;
    if (e.scanBonus) mods.scanMultiplier += e.scanBonus;
    if (e.flatDataPerBattle) mods.flatDataPerBattle += e.flatDataPerBattle;
    if (e.itemChanceBonus) mods.itemChanceBonus += e.itemChanceBonus;
    if (e.revealLocked) mods.revealLocked = true;
    if (e.autoScanReserves) mods.autoScanReserves = true;
  }
  return mods;
}

export interface DataFromBattleInput {
  won: boolean;
  /** Reward danger multiplier from the threat profile (1 = calm). */
  threatMultiplier: number;
  /** Number of enemies catalogued for the first time this battle. */
  newEnemyCount: number;
  /** Squad size taking part in the run. */
  squadSize: number;
  modifiers: ResearchModifiers;
}

/**
 * Bio-Data gathered from a single arena battle.
 * Losses still yield a reduced amount so scanning always progresses.
 */
export function dataFromBattle(input: DataFromBattleInput): number {
  const base = 6 + input.squadSize * 2;
  const threat = Math.max(1, input.threatMultiplier);
  const firstContact = Math.max(0, input.newEnemyCount) * 12;
  const raw = (base * threat + firstContact) * (input.won ? 1 : 0.4);
  const scaled = raw * input.modifiers.dataMultiplier + input.modifiers.flatDataPerBattle;
  return Math.max(1, Math.round(scaled));
}

/** Scan-progress percentage points a squad member earns from one battle. */
export function scanGain(won: boolean, modifiers: ResearchModifiers): number {
  const base = won ? 14 : 7;
  return Math.round(base * modifiers.scanMultiplier);
}

/** Reserve creatures passively scanned per battle once Auto-Scan is online. */
export const MAX_RESERVE_SCANS_PER_BATTLE = 3;

/** Reserves scan at half the squad rate so Auto-Scan cannot flood Bio-Data. */
export function reserveScanGain(won: boolean, modifiers: ResearchModifiers): number {
  return Math.max(1, Math.round(scanGain(won, modifiers) / 2));
}

/**
 * Pick the reserve creatures Auto-Scan works on this battle: the closest to a
 * full profile first, so the passive scan finishes profiles instead of spreading thin.
 */
export function pickReserveScanTargets(
  reserveIds: readonly string[],
  scanProgress: Readonly<Record<string, number>>,
  limit = MAX_RESERVE_SCANS_PER_BATTLE,
): string[] {
  return reserveIds
    .filter((id) => (scanProgress[id] ?? 0) < 100)
    .sort((a, b) => (scanProgress[b] ?? 0) - (scanProgress[a] ?? 0) || a.localeCompare(b))
    .slice(0, Math.max(0, limit));
}

/** Coin/DNA yield after research multipliers — the amounts actually paid out. */
export function applyResearchYield<T extends { coins: number; dnaShards: number }>(
  reward: T,
  modifiers: ResearchModifiers,
): T {
  return {
    ...reward,
    coins: Math.round(reward.coins * modifiers.coinMultiplier),
    dnaShards: Math.round(reward.dnaShards * modifiers.dnaMultiplier),
  };
}

/** The cheapest unlockable node (ties broken by tier, then data order). */
export function cheapestAvailableNode(views: readonly ResearchNodeView[]): ResearchNodeView | null {
  let best: ResearchNodeView | null = null;
  for (const view of views) {
    if (view.status !== 'available') continue;
    if (!best || view.def.cost < best.def.cost || (view.def.cost === best.def.cost && view.def.tier < best.def.tier)) {
      best = view;
    }
  }
  return best;
}

/** One-time Bio-Data windfall when a creature reaches a fully scanned profile. */
export const FULL_SCAN_BONUS = 25;

/** Bio-Data burst granted when a creature evolves (new form = new data). */
export const EVOLUTION_DATA_BONUS = 30;

export type ResearchNodeStatus = 'owned' | 'available' | 'locked' | 'unaffordable';

export interface ResearchNodeView {
  def: ResearchNodeDef;
  status: ResearchNodeStatus;
  /** Names of prerequisite nodes still missing (for locked nodes). */
  missingRequires: string[];
}

/** Whether a node can be unlocked right now given owned nodes and balance. */
export function canUnlockNode(
  node: ResearchNodeDef,
  unlockedIds: ReadonlySet<string>,
  bioData: number,
): boolean {
  if (unlockedIds.has(node.id)) {
    return false;
  }
  if (!node.requires.every((req) => unlockedIds.has(req))) {
    return false;
  }
  return bioData >= node.cost;
}

/** Build a per-node status view for the Research Lab UI. */
export function buildResearchTree(
  unlockedIds: readonly string[],
  bioData: number,
): ResearchNodeView[] {
  const unlocked = new Set(unlockedIds);
  return RESEARCH_NODES.map((def) => {
    let status: ResearchNodeStatus;
    if (unlocked.has(def.id)) {
      status = 'owned';
    } else if (!def.requires.every((req) => unlocked.has(req))) {
      status = 'locked';
    } else if (bioData < def.cost) {
      status = 'unaffordable';
    } else {
      status = 'available';
    }
    const missingRequires = def.requires
      .filter((req) => !unlocked.has(req))
      .map((req) => getResearchNode(req)?.name ?? req);
    return { def, status, missingRequires };
  });
}

export function researchNodesByBranch(views: ResearchNodeView[]): Record<ResearchBranch, ResearchNodeView[]> {
  const groups: Record<ResearchBranch, ResearchNodeView[]> = {
    economy: [],
    analysis: [],
    combat: [],
  };
  for (const view of views) {
    groups[view.def.branch].push(view);
  }
  for (const branch of Object.keys(groups) as ResearchBranch[]) {
    groups[branch].sort((a, b) => a.def.tier - b.def.tier);
  }
  return groups;
}
