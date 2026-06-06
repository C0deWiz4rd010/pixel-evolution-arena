import { describe, expect, it } from 'vitest';
import {
  applyStatus,
  createStatus,
  dotDamage,
  hasStatus,
  incomingDamageReduction,
  outgoingDamageMultiplier,
  regenHeal,
  tickStatuses,
} from './status.rules';

describe('status rules', () => {
  it('creates a status seeded with its definition duration and magnitude', () => {
    const burn = createStatus('burn');
    expect(burn).toEqual({ id: 'burn', remaining: 3, magnitude: 0.06 });
  });

  it('refreshes an existing status instead of stacking duplicates', () => {
    let statuses = applyStatus([], 'poison');
    statuses = tickStatuses(statuses); // remaining 3 -> 2
    statuses = applyStatus(statuses, 'poison');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].remaining).toBe(3);
  });

  it('sums damage-over-time across dot effects by max hp fraction', () => {
    const statuses = applyStatus(applyStatus([], 'burn'), 'poison');
    // burn 6% + poison 5% of 200 hp = 12 + 10 = 22
    expect(dotDamage(statuses, 200)).toBe(22);
  });

  it('heals from regen by max hp fraction', () => {
    const statuses = applyStatus([], 'regen');
    expect(regenHeal(statuses, 200)).toBe(16);
  });

  it('caps incoming damage reduction from shields at 60%', () => {
    const statuses = [createStatus('shield'), { id: 'shield' as const, remaining: 2, magnitude: 0.4 }];
    expect(incomingDamageReduction(statuses)).toBe(0.6);
  });

  it('raises outgoing damage with rally and lowers it with shock/chill', () => {
    expect(outgoingDamageMultiplier(applyStatus([], 'rally'))).toBeCloseTo(1.25);
    expect(outgoingDamageMultiplier(applyStatus([], 'shock'))).toBeCloseTo(0.78);
    expect(outgoingDamageMultiplier(applyStatus([], 'chill'))).toBeCloseTo(0.84);
  });

  it('decrements remaining duration and drops expired statuses', () => {
    let statuses = applyStatus([], 'shock'); // duration 2
    statuses = tickStatuses(statuses);
    expect(hasStatus(statuses, 'shock')).toBe(true);
    statuses = tickStatuses(statuses);
    expect(hasStatus(statuses, 'shock')).toBe(false);
  });
});
