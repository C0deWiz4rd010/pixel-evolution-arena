import { describe, expect, it } from 'vitest';
import {
  COMBO_BONUS_GOOD,
  COMBO_BONUS_PERFECT,
  COMBO_GOOD_ZONE,
  COMBO_PERFECT_ZONE,
  resolveComboBeat,
} from './combo.rules';

describe('combo beat resolution', () => {
  it('returns a perfect tier at the dead center', () => {
    const result = resolveComboBeat(0.5);
    expect(result.tier).toBe('perfect');
    expect(result.bonus).toBe(COMBO_BONUS_PERFECT);
  });

  it('returns a good tier inside the wider band but outside the core', () => {
    const result = resolveComboBeat(COMBO_GOOD_ZONE.min + 0.01);
    expect(result.tier).toBe('good');
    expect(result.bonus).toBe(COMBO_BONUS_GOOD);
  });

  it('returns a miss outside the good band', () => {
    expect(resolveComboBeat(0.1).tier).toBe('miss');
    expect(resolveComboBeat(0.9)).toEqual({ tier: 'miss', bonus: 0 });
  });

  it('rewards precision more than a loose landing', () => {
    expect(COMBO_BONUS_PERFECT).toBeGreaterThan(COMBO_BONUS_GOOD);
  });

  it('nests the perfect zone strictly inside the good zone', () => {
    expect(COMBO_PERFECT_ZONE.min).toBeGreaterThan(COMBO_GOOD_ZONE.min);
    expect(COMBO_PERFECT_ZONE.max).toBeLessThan(COMBO_GOOD_ZONE.max);
  });
});
