import { describe, expect, it } from 'vitest';
import { evaluateTypePressure, getTypeMatchupValue } from './type-matchup.rules';

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
    expect(result.modifier).toBeGreaterThan(0.06);
  });
});
