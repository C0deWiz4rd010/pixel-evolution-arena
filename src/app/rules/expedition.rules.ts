/**
 * Pure Expedition logic: deterministic map generation from a seed, reachability,
 * and relic aggregation. State transitions return new objects (no mutation) so
 * the service can drop them straight into a signal.
 */
import { getRelicDef, RELIC_DEFS } from '../data/relics.data';
import { ExpeditionNode, ExpeditionNodeType, ExpeditionState } from '../models/expedition.model';

export const EXPEDITION_ROWS = 7;
export const EXPEDITION_BASE_HP = 100;

export interface RelicBonus {
  attackBonus: number;
  mitigation: number;
  rewardMultiplier: number;
  healOnWin: number;
  coresOnClear: number;
}

/** Small, fast seeded PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickType(rng: () => number, row: number): ExpeditionNodeType {
  if (row === 0) {
    return 'battle';
  }
  if (row === EXPEDITION_ROWS - 1) {
    return 'boss';
  }
  const roll = rng();
  // Mid rows: mostly battles, sprinkled with support + elite nodes.
  if (roll < 0.46) return 'battle';
  if (roll < 0.62) return 'elite';
  if (roll < 0.74) return 'shop';
  if (roll < 0.86) return 'rest';
  return 'event';
}

export function generateExpedition(seed: number, maxHp = EXPEDITION_BASE_HP): ExpeditionState {
  const rng = mulberry32(seed);
  const map: ExpeditionNode[] = [];
  const rows: ExpeditionNode[][] = [];

  for (let row = 0; row < EXPEDITION_ROWS; row += 1) {
    const count = row === 0 ? 2 : row === EXPEDITION_ROWS - 1 ? 1 : 2 + (rng() < 0.5 ? 1 : 0);
    const rowNodes: ExpeditionNode[] = [];
    for (let col = 0; col < count; col += 1) {
      const node: ExpeditionNode = {
        id: `n${row}-${col}`,
        type: pickType(rng, row),
        row,
        col,
        nextIds: [],
        cleared: false,
      };
      rowNodes.push(node);
      map.push(node);
    }
    rows.push(rowNodes);
  }

  // Connect each node to 1–2 nodes on the next row (nearest by column).
  for (let row = 0; row < EXPEDITION_ROWS - 1; row += 1) {
    const current = rows[row];
    const next = rows[row + 1];
    for (const node of current) {
      const sorted = [...next].sort(
        (a, b) => Math.abs(a.col - node.col) - Math.abs(b.col - node.col),
      );
      const edges = Math.min(next.length, 1 + (rng() < 0.5 ? 1 : 0));
      node.nextIds = sorted.slice(0, edges).map((n) => n.id);
    }
    // Guarantee every next-row node is reachable from somewhere.
    for (const target of next) {
      const hasIncoming = current.some((n) => n.nextIds.includes(target.id));
      if (!hasIncoming) {
        const closest = [...current].sort(
          (a, b) => Math.abs(a.col - target.col) - Math.abs(b.col - target.col),
        )[0];
        closest.nextIds.push(target.id);
      }
    }
  }

  const startIds = rows[0].map((n) => n.id);
  return {
    seed,
    map,
    currentNodeId: null,
    reachableIds: startIds,
    relicIds: [],
    hp: maxHp,
    maxHp,
    depth: 0,
    rewardCores: 0,
    status: 'active',
    lastEvent: 'Expedition launched. Choose your first node.',
  };
}

export function getNode(state: ExpeditionState, nodeId: string): ExpeditionNode | undefined {
  return state.map.find((node) => node.id === nodeId);
}

/** Nodes the player may move into right now. */
export function reachableNodes(state: ExpeditionState): ExpeditionNode[] {
  return state.reachableIds.map((id) => getNode(state, id)).filter((n): n is ExpeditionNode => Boolean(n));
}

/** Marks a node cleared, advances reachability and depth. Returns new state. */
export function clearNode(state: ExpeditionState, nodeId: string): ExpeditionState {
  const node = getNode(state, nodeId);
  if (!node) {
    return state;
  }
  const map = state.map.map((n) => (n.id === nodeId ? { ...n, cleared: true } : n));
  const reachableIds = node.row >= EXPEDITION_ROWS - 1 ? [] : [...node.nextIds];
  const status: ExpeditionState['status'] = node.type === 'boss' ? 'won' : state.status;
  return {
    ...state,
    map,
    currentNodeId: nodeId,
    reachableIds,
    depth: Math.max(state.depth, node.row + 1),
    status,
  };
}

export function relicBonus(relicIds: string[]): RelicBonus {
  const total: RelicBonus = { attackBonus: 0, mitigation: 0, rewardMultiplier: 1, healOnWin: 0, coresOnClear: 0 };
  for (const id of relicIds) {
    const def = getRelicDef(id);
    if (!def) {
      continue;
    }
    total.attackBonus += def.effect.attackBonus ?? 0;
    total.mitigation += def.effect.mitigation ?? 0;
    total.rewardMultiplier *= def.effect.rewardMultiplier ?? 1;
    total.healOnWin += def.effect.healOnWin ?? 0;
    total.coresOnClear += def.effect.coresOnClear ?? 0;
  }
  return total;
}

/** Three distinct relic choices for a reward, seeded off the node + run. */
export function rollRelicChoices(seed: number, owned: string[]): string[] {
  const rng = mulberry32(seed);
  const pool = RELIC_DEFS.map((r) => r.id);
  const chosen: string[] = [];
  let guard = 0;
  while (chosen.length < 3 && guard < 50) {
    guard += 1;
    const id = pool[Math.floor(rng() * pool.length)];
    if (!chosen.includes(id)) {
      chosen.push(id);
    }
  }
  // Prefer not-yet-owned relics first, but allow duplicates if pool is small.
  const fresh = chosen.filter((id) => !owned.includes(id));
  return (fresh.length >= 3 ? fresh : chosen).slice(0, 3);
}
