/**
 * Bio-Data Research tree. Original, brand-safe names.
 *
 * The Research Lab is the "Datenbeschaffung" (data acquisition) meta-loop:
 * the player gathers Bio-Data by scanning squad creatures and cataloguing new
 * enemies, then spends it on permanent passive upgrades organised in branches.
 */

export type ResearchBranch = 'economy' | 'analysis' | 'combat';

/** Additive/multiplicative effect deltas a single node contributes. */
export interface ResearchEffect {
  /** Extra coin reward, e.g. 0.1 = +10%. */
  coinBonus?: number;
  /** Extra DNA reward, e.g. 0.1 = +10%. */
  dnaBonus?: number;
  /** Extra Bio-Data gathered per battle, e.g. 0.15 = +15%. */
  dataBonus?: number;
  /** Flat Bio-Data added to every battle payout. */
  flatDataPerBattle?: number;
  /** Faster creature scan progress, e.g. 0.25 = +25%. */
  scanBonus?: number;
  /** Extra item drop chance, absolute percentage points (e.g. 5 = +5pp). */
  itemChanceBonus?: number;
  /** Reveal exact locked evolution requirements everywhere. */
  revealLocked?: boolean;
  /** Passively scan reserve (non-squad) creatures after each battle. */
  autoScanReserves?: boolean;
}

export interface ResearchNodeDef {
  id: string;
  name: string;
  icon: string;
  branch: ResearchBranch;
  /** Tier 1..3 — higher tiers cost more and usually gate behind lower ones. */
  tier: 1 | 2 | 3;
  cost: number;
  detail: string;
  /** Node ids that must be unlocked first. */
  requires: string[];
  effect: ResearchEffect;
}

export const RESEARCH_BRANCH_META: Record<
  ResearchBranch,
  { label: string; tag: string; blurb: string }
> = {
  economy: { label: 'Yield Systems', tag: 'ECON', blurb: 'Convert data into richer battle payouts.' },
  analysis: { label: 'Scan Matrix', tag: 'SCAN', blurb: 'Accelerate data gathering and reveal intel.' },
  combat: { label: 'Field Ops', tag: 'OPS', blurb: 'Turn research into a combat and loot edge.' },
};

export const RESEARCH_NODES: ResearchNodeDef[] = [
  // --- Economy branch ---
  {
    id: 'res-yield-1',
    name: 'Coin Extraction',
    icon: 'CR',
    branch: 'economy',
    tier: 1,
    cost: 40,
    detail: 'Battle Coin rewards +12%.',
    requires: [],
    effect: { coinBonus: 0.12 },
  },
  {
    id: 'res-yield-2',
    name: 'Genome Refinery',
    icon: 'DN',
    branch: 'economy',
    tier: 2,
    cost: 90,
    detail: 'Battle DNA rewards +15%.',
    requires: ['res-yield-1'],
    effect: { dnaBonus: 0.15 },
  },
  {
    id: 'res-yield-3',
    name: 'Profit Cascade',
    icon: 'CR',
    branch: 'economy',
    tier: 3,
    cost: 180,
    detail: 'Battle Coin rewards +18% more.',
    requires: ['res-yield-2'],
    effect: { coinBonus: 0.18 },
  },

  // --- Analysis branch ---
  {
    id: 'res-scan-1',
    name: 'Deep Scanners',
    icon: 'SC',
    branch: 'analysis',
    tier: 1,
    cost: 35,
    detail: 'Creature scan progress +30%.',
    requires: [],
    effect: { scanBonus: 0.3 },
  },
  {
    id: 'res-scan-2',
    name: 'Data Amplifier',
    icon: 'DA',
    branch: 'analysis',
    tier: 2,
    cost: 85,
    detail: 'Bio-Data gathered per battle +25%.',
    requires: ['res-scan-1'],
    effect: { dataBonus: 0.25 },
  },
  {
    id: 'res-scan-3',
    name: 'Predictive Codex',
    icon: 'PC',
    branch: 'analysis',
    tier: 3,
    cost: 160,
    detail: 'Reveal exact locked evolution requirements and auto-scan reserves.',
    requires: ['res-scan-2'],
    effect: { revealLocked: true, autoScanReserves: true, flatDataPerBattle: 4 },
  },

  // --- Combat branch ---
  {
    id: 'res-ops-1',
    name: 'Salvage Drones',
    icon: 'IT',
    branch: 'combat',
    tier: 1,
    cost: 50,
    detail: 'Item drop chance +5%.',
    requires: [],
    effect: { itemChanceBonus: 5 },
  },
  {
    id: 'res-ops-2',
    name: 'Threat Modeling',
    icon: 'TM',
    branch: 'combat',
    tier: 2,
    cost: 110,
    detail: 'Battle Coin +8% and item drop chance +5%.',
    requires: ['res-ops-1'],
    effect: { coinBonus: 0.08, itemChanceBonus: 5 },
  },
  {
    id: 'res-ops-3',
    name: 'Bio-Overclock',
    icon: 'OV',
    branch: 'combat',
    tier: 3,
    cost: 200,
    detail: '+6 flat Bio-Data per battle and DNA rewards +12%.',
    requires: ['res-ops-2'],
    effect: { flatDataPerBattle: 6, dnaBonus: 0.12 },
  },
];

const RESEARCH_BY_ID = new Map(RESEARCH_NODES.map((node) => [node.id, node]));

export function getResearchNode(id: string): ResearchNodeDef | undefined {
  return RESEARCH_BY_ID.get(id);
}

export const RESEARCH_NODE_IDS = new Set(RESEARCH_NODES.map((node) => node.id));
