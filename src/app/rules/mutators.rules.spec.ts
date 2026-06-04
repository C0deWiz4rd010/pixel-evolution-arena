import { describe, expect, it } from 'vitest';
import { MUTATORS, getMutatorForBattle } from '../data/mutators.data';
import { resolveMutator } from './mutators.rules';

describe('mutators.rules', () => {
  it('is neutral with no mutator', () => {
    const mod = resolveMutator(null, ['Fire']);
    expect(mod).toEqual({ playerAttackBonus: 0, playerMitigation: 0, enemyModifier: 0 });
  });

  it('grants the favored bonus only when the squad has the favored type', () => {
    const solar = MUTATORS.find((m) => m.id === 'mut-solar')!;
    expect(resolveMutator(solar, ['Fire']).playerAttackBonus).toBe(solar.favoredAttackBonus);
    expect(resolveMutator(solar, ['Water']).playerAttackBonus).toBe(0);
  });

  it('applies global mitigation/enemy modifiers regardless of type', () => {
    const nullZone = MUTATORS.find((m) => m.id === 'mut-null')!;
    const mod = resolveMutator(nullZone, ['Beast']);
    expect(mod.playerMitigation).toBe(nullZone.playerMitigation);
    expect(mod.enemyModifier).toBe(nullZone.enemyModifier);
  });

  it('returns Stable Grid for the first battle', () => {
    expect(getMutatorForBattle(1).id).toBe('mut-stable');
  });
});
