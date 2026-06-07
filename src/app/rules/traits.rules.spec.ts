import { describe, expect, it } from 'vitest';
import { activeSquadTraits, squadCompositionTrait, squadTraitBonus, totalSquadTraitBonus } from './traits.rules';

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

  it('awards Mono Resonance for an all-one-type squad', () => {
    const comp = squadCompositionTrait([{ type: 'Fire' }, { type: 'Fire' }, { type: 'Fire' }]);
    expect(comp?.id).toBe('mono-resonance');
    expect(comp?.attackBonus).toBe(0.06);
  });

  it('awards Spectrum Matrix for three distinct types', () => {
    const comp = squadCompositionTrait([{ type: 'Fire' }, { type: 'Water' }, { type: 'Beast' }]);
    expect(comp?.id).toBe('spectrum-matrix');
    expect(comp?.mitigation).toBe(0.04);
  });

  it('awards no composition bonus for a mixed two-type-of-three squad', () => {
    expect(squadCompositionTrait([{ type: 'Fire' }, { type: 'Fire' }, { type: 'Water' }])).toBeNull();
  });

  it('folds the composition bonus into the total trait bonus', () => {
    const squad = [{ type: 'Fire' as const }, { type: 'Fire' as const }, { type: 'Fire' as const }];
    const base = squadTraitBonus(squad);
    const total = totalSquadTraitBonus(squad);
    // Ignition (deduped to one) + Mono Resonance +0.06.
    expect(total.attackBonus).toBeCloseTo(base.attackBonus + 0.06, 5);
  });
});
