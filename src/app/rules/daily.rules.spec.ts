import { describe, expect, it } from 'vitest';
import {
  DailyBattleSignal,
  ensureDailyDirective,
  getDateKey,
  isDailyComplete,
  progressDaily,
  rollDailyDirective,
} from './daily.rules';

const winSignal: DailyBattleSignal = {
  won: true,
  criticalHit: false,
  flawless: false,
  overdriveUsed: false,
  category: 'standard',
  streakAfter: 1,
};

describe('daily directive rules', () => {
  it('formats a local YYYY-MM-DD date key', () => {
    expect(getDateKey(new Date(2026, 4, 29))).toBe('2026-05-29');
  });

  it('rolls the same directive deterministically for the same date key', () => {
    expect(rollDailyDirective('2026-05-29').objectiveId).toBe(rollDailyDirective('2026-05-29').objectiveId);
  });

  it('keeps today\'s directive but rolls a fresh one when the day changes', () => {
    const today = rollDailyDirective('2026-05-29');
    expect(ensureDailyDirective(today, '2026-05-29')).toBe(today);
    const next = ensureDailyDirective(today, '2026-05-30');
    expect(next.dateKey).toBe('2026-05-30');
    expect(next.progress).toBe(0);
  });

  it('advances a win-three objective only on wins and caps at the goal', () => {
    let state = { dateKey: '2026-05-29', objectiveId: 'win-three' as const, progress: 0, claimed: false };
    state = progressDaily(state, winSignal);
    state = progressDaily(state, { ...winSignal, won: false });
    expect(state.progress).toBe(1);
    state = progressDaily(state, winSignal);
    state = progressDaily(state, winSignal);
    expect(state.progress).toBe(3);
    expect(isDailyComplete(state)).toBe(true);
  });

  it('tracks a reach-streak objective by the highest streak seen', () => {
    let state = { dateKey: '2026-05-29', objectiveId: 'reach-streak' as const, progress: 0, claimed: false };
    state = progressDaily(state, { ...winSignal, streakAfter: 2 });
    state = progressDaily(state, { ...winSignal, streakAfter: 1 });
    expect(state.progress).toBe(2);
    state = progressDaily(state, { ...winSignal, streakAfter: 5 });
    expect(state.progress).toBe(3);
  });
});
