import { describe, expect, it } from 'vitest';
import { getMonsterTrainingDrills, getSquadTrainingDrill } from './training.rules';

describe('training rules', () => {
  it('scales monster drill cost and xp by stage', () => {
    const baby = getMonsterTrainingDrills('Baby');
    const mega = getMonsterTrainingDrills('Mega');

    expect(baby[0]).toMatchObject({ id: 'pulse', costCoins: 38, xpGain: 18 });
    expect(mega[1].costCoins).toBeGreaterThan(baby[1].costCoins);
    expect(mega[1].xpGain).toBeGreaterThan(baby[1].xpGain);
  });

  it('builds a squad calibration drill from the highest squad stage', () => {
    const starter = getSquadTrainingDrill([{ stage: 'Baby' }, { stage: 'In-Training' }]);
    const advanced = getSquadTrainingDrill([{ stage: 'Champion' }, { stage: 'Ultimate' }, { stage: 'Mega' }]);

    expect(starter.label).toBe('Calibration Sim');
    expect(advanced.costCoins).toBeGreaterThan(starter.costCoins);
    expect(advanced.xpGain).toBeGreaterThan(starter.xpGain);
  });
});
