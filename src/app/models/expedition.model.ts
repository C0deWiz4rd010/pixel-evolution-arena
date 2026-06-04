/**
 * Expedition (roguelite) run state. A run is a branching node-map the player
 * descends row by row, fighting with their normal squad but under run-only
 * Relics and a shared run-health budget. Everything here is cleared when the
 * run ends; only banked Cores persist (in PlayerState.expeditionCores).
 */
export type ExpeditionNodeType = 'battle' | 'elite' | 'boss' | 'shop' | 'rest' | 'event';

export interface ExpeditionNode {
  id: string;
  type: ExpeditionNodeType;
  /** Depth from the start (0-based). */
  row: number;
  /** Lane index for layout. */
  col: number;
  /** Outgoing edges to nodes on the next row. */
  nextIds: string[];
  cleared: boolean;
}

export interface ExpeditionState {
  seed: number;
  map: ExpeditionNode[];
  /** Node the player currently occupies, or null before the first pick. */
  currentNodeId: string | null;
  /** Node IDs the player may move into next. */
  reachableIds: string[];
  /** Collected relic definition IDs. */
  relicIds: string[];
  /** Run-health budget (a defeat chips this; 0 ends the run). */
  hp: number;
  maxHp: number;
  /** Deepest row reached. */
  depth: number;
  /** Cores accrued this run (paid out on a successful clear). */
  rewardCores: number;
  status: 'active' | 'won' | 'lost';
  /** Last node-resolution message for the UI. */
  lastEvent?: string;
}

export interface ExpeditionRelicDef {
  id: string;
  name: string;
  icon: string;
  detail: string;
  effect: {
    /** Additional player attack modifier in run battles. */
    attackBonus?: number;
    /** Additional incoming-damage mitigation in run battles. */
    mitigation?: number;
    /** Multiplies coin/DNA/XP rewards from run battles. */
    rewardMultiplier?: number;
    /** Heals this fraction of run maxHp after each won battle. */
    healOnWin?: number;
    /** Extra Cores added to the run payout on clear. */
    coresOnClear?: number;
  };
}
