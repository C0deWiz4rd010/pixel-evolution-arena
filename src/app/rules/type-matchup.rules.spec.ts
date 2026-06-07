import { describe, expect, it } from 'vitest';
import { MonsterType } from '../models/monster.model';
import {
  evaluateTypePressure,
  getTypeMatchupValue,
  getTypeStrengths,
  getTypeWeaknesses,
} from './type-matchup.rules';

const ALL_TYPES: MonsterType[] = ['Nature', 'Fire', 'Water', 'Dark', 'Light', 'Machine', 'Beast', 'Toxic'];

describe('type matchup rules', () => {
  it('reports direct strengths and weaknesses', () => {
    expect(getTypeMatchupValue('Water', 'Fire')).toBe(1);
    expect(getTypeMatchupValue('Water', 'Nature')).toBe(-1);
    expect(getTypeMatchupValue('Water', 'Light')).toBe(0);
  });

  it('summarizes a strong attacker advantage', () => {
    const result = evaluateTypePressure(['Water', 'Light', 'Nature'], ['Fire', 'Dark', 'Toxic']);

    expect(['Type edge secured', 'Contested type grid']).toContain(result.label);
    expect(result.strongCount).toBeGreaterThan(0);
    expect(result.modifier).toBeGreaterThan(0);
  });

  it('is symmetric: if A beats B then B is weak to A', () => {
    for (const attacker of ALL_TYPES) {
      for (const defender of ALL_TYPES) {
        if (attacker === defender) {
          continue;
        }
        if (getTypeMatchupValue(attacker, defender) === 1) {
          expect(getTypeMatchupValue(defender, attacker)).toBe(-1);
        }
      }
    }
  });

  it('has no contradictions (never strong and weak against the same type)', () => {
    for (const attacker of ALL_TYPES) {
      const strengths = getTypeStrengths(attacker);
      const weaknesses = getTypeWeaknesses(attacker);
      for (const opponent of strengths) {
        expect(weaknesses).not.toContain(opponent);
      }
    }
  });

  it('is balanced: every type has exactly 2 strengths, 2 weaknesses, 3 neutral', () => {
    for (const type of ALL_TYPES) {
      expect(getTypeStrengths(type)).toHaveLength(2);
      expect(getTypeWeaknesses(type)).toHaveLength(2);

      const neutral = ALL_TYPES.filter(
        (other) => other !== type && getTypeMatchupValue(type, other) === 0,
      );
      expect(neutral).toHaveLength(3);
    }
  });

  it('derives weaknesses as the exact inverse of strengths', () => {
    for (const type of ALL_TYPES) {
      for (const strong of getTypeStrengths(type)) {
        expect(getTypeWeaknesses(strong)).toContain(type);
      }
    }
  });
});
