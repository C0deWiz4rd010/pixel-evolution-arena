import { describe, expect, it } from 'vitest';
import { getTacticalPulseOption, recommendTacticalPulse } from './tactical-pulse.rules';

describe('tactical pulse rules', () => {
  it('recommends protection for weak forecasts and surge for strong ones', () => {
    expect(recommendTacticalPulse(20)).toBe('guard');
    expect(recommendTacticalPulse(58)).toBe('break');
    expect(recommendTacticalPulse(82)).toBe('surge');
  });

  it('keeps each choice mechanically distinct', () => {
    expect(getTacticalPulseOption('guard').mitigation).toBeGreaterThan(getTacticalPulseOption('break').mitigation);
    expect(getTacticalPulseOption('surge').attackMod).toBeGreaterThan(getTacticalPulseOption('break').attackMod);
    expect(getTacticalPulseOption('surge').masteryMultiplier).toBeGreaterThan(1);
  });
});
