import { describe, expect, it } from 'vitest';
import {
  buildResearchTree,
  canUnlockNode,
  dataFromBattle,
  deriveResearchModifiers,
  NEUTRAL_RESEARCH_MODIFIERS,
  scanGain,
  applyResearchYield,
  cheapestAvailableNode,
  MAX_RESERVE_SCANS_PER_BATTLE,
  pickReserveScanTargets,
  reserveScanGain,
} from './research.rules';
import { getResearchNode } from '../data/research.data';

describe('research.rules', () => {
  it('returns neutral modifiers with no nodes', () => {
    expect(deriveResearchModifiers([])).toEqual(NEUTRAL_RESEARCH_MODIFIERS);
  });

  it('accumulates coin bonuses across owned nodes', () => {
    const mods = deriveResearchModifiers(['res-yield-1', 'res-yield-3']);
    // +12% and +18%
    expect(mods.coinMultiplier).toBeCloseTo(1.3, 5);
  });

  it('resolves flags and flat data from tier-3 analysis node', () => {
    const mods = deriveResearchModifiers(['res-scan-3']);
    expect(mods.revealLocked).toBe(true);
    expect(mods.autoScanReserves).toBe(true);
    expect(mods.flatDataPerBattle).toBe(4);
  });

  it('scales battle data with threat, squad size, and first-contact enemies', () => {
    const base = dataFromBattle({
      won: true,
      threatMultiplier: 1,
      newEnemyCount: 0,
      squadSize: 3,
      modifiers: NEUTRAL_RESEARCH_MODIFIERS,
    });
    const withNewEnemies = dataFromBattle({
      won: true,
      threatMultiplier: 1,
      newEnemyCount: 2,
      squadSize: 3,
      modifiers: NEUTRAL_RESEARCH_MODIFIERS,
    });
    expect(withNewEnemies).toBeGreaterThan(base);
  });

  it('still yields data on a loss but less than a win', () => {
    const input = {
      threatMultiplier: 1.2,
      newEnemyCount: 1,
      squadSize: 2,
      modifiers: NEUTRAL_RESEARCH_MODIFIERS,
    };
    const win = dataFromBattle({ ...input, won: true });
    const loss = dataFromBattle({ ...input, won: false });
    expect(loss).toBeGreaterThan(0);
    expect(loss).toBeLessThan(win);
  });

  it('applies scan multiplier to scan gain', () => {
    const boosted = deriveResearchModifiers(['res-scan-1']); // +30%
    expect(scanGain(true, boosted)).toBeGreaterThan(scanGain(true, NEUTRAL_RESEARCH_MODIFIERS));
  });

  it('gates node unlocking by prerequisites and cost', () => {
    const tier2 = getResearchNode('res-yield-2')!;
    // Missing prerequisite res-yield-1.
    expect(canUnlockNode(tier2, new Set(), 999)).toBe(false);
    // Prereq owned but not enough Bio-Data.
    expect(canUnlockNode(tier2, new Set(['res-yield-1']), 0)).toBe(false);
    // Prereq owned and affordable.
    expect(canUnlockNode(tier2, new Set(['res-yield-1']), tier2.cost)).toBe(true);
    // Already owned cannot be re-unlocked.
    expect(canUnlockNode(tier2, new Set(['res-yield-1', 'res-yield-2']), 999)).toBe(false);
  });

  it('marks tree node status correctly', () => {
    const tree = buildResearchTree(['res-scan-1'], 40);
    const owned = tree.find((n) => n.def.id === 'res-scan-1');
    const available = tree.find((n) => n.def.id === 'res-yield-1');
    const locked = tree.find((n) => n.def.id === 'res-scan-3');
    expect(owned?.status).toBe('owned');
    expect(available?.status).toBe('available');
    expect(locked?.status).toBe('locked');
  });

  it('applies research yield to the paid coins and DNA', () => {
    const mods = { ...NEUTRAL_RESEARCH_MODIFIERS, coinMultiplier: 1.12, dnaMultiplier: 1.15 };
    const paid = applyResearchYield({ coins: 100, dnaShards: 20, xp: 35 }, mods);
    expect(paid).toEqual({ coins: 112, dnaShards: 23, xp: 35 });
  });

  it('caps passive reserve scans and prefers nearly finished profiles', () => {
    const targets = pickReserveScanTargets(['a', 'b', 'c', 'd', 'e'], { a: 10, b: 100, c: 80, d: 50, e: 0 });
    expect(targets).toEqual(['c', 'd', 'a']);
    expect(targets.length).toBe(MAX_RESERVE_SCANS_PER_BATTLE);
    expect(reserveScanGain(true, NEUTRAL_RESEARCH_MODIFIERS)).toBeLessThan(scanGain(true, NEUTRAL_RESEARCH_MODIFIERS));
  });

  it('recommends the cheapest available node', () => {
    const tree = buildResearchTree([], 999);
    const pick = cheapestAvailableNode(tree);
    const minCost = Math.min(...tree.filter((n) => n.status === 'available').map((n) => n.def.cost));
    expect(pick?.def.cost).toBe(minCost);
    expect(cheapestAvailableNode(buildResearchTree([], 0))).toBeNull();
  });
});
