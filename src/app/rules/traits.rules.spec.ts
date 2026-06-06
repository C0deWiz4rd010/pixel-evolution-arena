import { describe, expect, it } from 'vitest';
import { activeSquadTraits, squadTraitBonus } from './traits.rules';

describe('traits.rules', () => {
  it('returns no traits for an empty squad', () => {
    expect(activeSquadTraits([])).toEqual([]);
    const bonus = squadTraitBonus([]);
    expect(bonus.attackBonus).toBe(0);
    expect(bonus.mitigation).toBe(0);
  });

  it('dedupes traits by type', () => {
    const traits = activeSquadTraits([{ type: 'Fire' }, { type: 'Fire' }, { type: 'Water' }]);
    expect(traits).toHaveLength(2);
  });

  it('sums distinct trait bonuses', () => {
    const bonus = squadTraitBonus([{ type: 'Fire' }, { type: 'Beast' }]);
    // Ignition +0.06 attack, Ferocity +0.07 attack
    expect(bonus.attackBonus).toBeCloseTo(0.13, 5);
  });

  it('does not double-count a repeated type', () => {
    const single = squadTraitBonus([{ type: 'Fire' }]);
    const doubled = squadTraitBonus([{ type: 'Fire' }, { type: 'Fire' }]);
    expect(doubled.attackBonus).toBe(single.attackBonus);
  });
});
