import { describe, expect, it } from 'vitest';
import { summarizeBattleRecords } from './battle-intel.rules';
import { RecentBattleRecord } from '../models/player-state.model';

function record(overrides: Partial<RecentBattleRecord>): RecentBattleRecord {
  return {
    id: 'r1',
    timestamp: '2026-06-07T00:00:00.000Z',
    won: true,
    mode: 'standard',
    category: 'standard',
    formationName: 'Scout Patrol',
    threatLabel: 'Calm Circuit',
    teamPower: 400,
    enemyPower: 350,
    coins: 120,
    dnaShards: 8,
    xp: 35,
    streakAfter: 1,
    ...overrides,
  };
}

describe('battle intel rules', () => {
  it('returns an empty summary when there are no records', () => {
    expect(summarizeBattleRecords([])).toMatchObject({
      total: 0,
      trend: 'empty',
      preferredMode: null,
      preferredCategory: null,
    });
  });

  it('builds a hot summary from strong recent wins', () => {
    const summary = summarizeBattleRecords([
      record({ id: 'r1', won: true, mode: 'gauntlet', category: 'risk', coins: 170, xp: 41 }),
      record({ id: 'r2', won: true, mode: 'gauntlet', category: 'risk', coins: 168, xp: 40 }),
      record({ id: 'r3', won: true, mode: 'standard', category: 'standard', coins: 132, xp: 35 }),
      record({ id: 'r4', won: false, mode: 'standard', category: 'training', coins: 30, xp: 12 }),
    ]);

    expect(summary).toMatchObject({
      total: 4,
      wins: 3,
      losses: 1,
      winRate: 75,
      trend: 'hot',
      preferredMode: 'gauntlet',
      preferredCategory: 'risk',
    });
    expect(summary.averageCoins).toBeGreaterThan(100);
  });

  it('marks the trend cold when losses dominate the recent window', () => {
    const summary = summarizeBattleRecords([
      record({ id: 'r1', won: false, coins: 30, xp: 12 }),
      record({ id: 'r2', won: false, coins: 26, xp: 10, category: 'training' }),
      record({ id: 'r3', won: true, coins: 120, xp: 35 }),
    ]);

    expect(summary.trend).toBe('cold');
    expect(summary.trendLabel).toContain('Stabilize');
  });
});
