import { describe, expect, it } from 'vitest';
import { AfterActionSnapshot, buildAfterActionQueue } from './after-action.rules';

const baseSnapshot: AfterActionSnapshot = {
  hasBattleResult: true,
  won: true,
  coins: 120,
  dnaShards: 8,
  xp: 35,
  itemName: null,
  readyEvolutionName: null,
  claimableChapterTitle: null,
  squadSize: 3,
  winChancePercent: 74,
  forgeReady: false,
  forgeTitle: 'Forge stable',
  expeditionStatus: 'idle',
  expeditionCores: 0,
  dailyComplete: false,
};

describe('after action rules', () => {
  it('starts with a seed battle action before any battle result exists', () => {
    const cards = buildAfterActionQueue({ ...baseSnapshot, hasBattleResult: false });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'seed-battle',
      actionId: 'run-battle',
      tone: 'battle',
    });
  });

  it('prioritizes ready evolution and claimable chapter after a battle', () => {
    const cards = buildAfterActionQueue({
      ...baseSnapshot,
      readyEvolutionName: 'Splashfang',
      claimableChapterTitle: 'Chapter 1 - Ignition',
    });

    expect(cards[0]).toMatchObject({ id: 'evolve-spend', actionId: 'evolve-ready', priority: 120 });
    expect(cards[1]).toMatchObject({ id: 'claim-chapter', actionId: 'claim-chapter', priority: 110 });
  });

  it('keeps losses useful with a retry action and squad patch guidance', () => {
    const cards = buildAfterActionQueue({
      ...baseSnapshot,
      won: false,
      squadSize: 1,
      winChancePercent: 32,
    });

    expect(cards.some((card) => card.id === 'patch-squad')).toBe(true);
    expect(cards.some((card) => card.id === 'run-again' && card.actionLabel === 'Retry')).toBe(true);
  });

  it('limits the queue to the three highest-priority actions', () => {
    const cards = buildAfterActionQueue({
      ...baseSnapshot,
      readyEvolutionName: 'Cinderpaw',
      claimableChapterTitle: 'Chapter 2 - Signal Bloom',
      squadSize: 2,
      forgeReady: true,
      expeditionStatus: 'reward',
      expeditionCores: 7,
    });

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.id)).toEqual(['evolve-spend', 'claim-chapter', 'expedition-relay']);
  });
});
