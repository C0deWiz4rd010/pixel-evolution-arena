import { describe, expect, it } from 'vitest';
import { BattleContractSnapshot, buildBattleContracts } from './battle-contract.rules';

const baseSnapshot: BattleContractSnapshot = {
  squadSize: 3,
  winChancePercent: 68,
  nextWinCoins: 140,
  nextWinDna: 9,
  nextWinXp: 42,
  itemChancePercent: 28,
  winStreak: 0,
  overdriveReady: false,
  dailyObjectiveId: 'win-three',
  dailyLabel: 'Daily Sweep',
  dailyProgress: 1,
  dailyGoal: 3,
  dailyComplete: false,
  routeTargetName: 'Splashfang',
  routeReady: false,
  routePercent: 72,
  routeWinsNeeded: 2,
  claimableChapterTitle: null,
  safeItemName: 'Repair Cell',
  pushItemName: 'Focus Capsule',
};

describe('battle contract rules', () => {
  it('blocks contracts when no squad is loaded', () => {
    const contracts = buildBattleContracts({ ...baseSnapshot, squadSize: 0 });

    expect(contracts).toHaveLength(1);
    expect(contracts[0]).toMatchObject({ id: 'load-squad', disabled: true, tone: 'blocked' });
  });

  it('prioritizes safety when the win chance is unstable', () => {
    const contracts = buildBattleContracts({ ...baseSnapshot, winChancePercent: 38, squadSize: 2 });

    expect(contracts[0]).toMatchObject({
      id: 'safety-contract',
      stanceId: 'defensive',
      categoryId: 'training',
    });
  });

  it('prioritizes risk setup for risk daily objectives when viable', () => {
    const contracts = buildBattleContracts({
      ...baseSnapshot,
      dailyObjectiveId: 'win-risk',
      dailyLabel: 'High Stakes',
      winChancePercent: 72,
    });

    expect(contracts[0]).toMatchObject({
      id: 'daily-contract',
      stanceId: 'aggressive',
      categoryId: 'risk',
      itemName: 'Focus Capsule',
    });
  });

  it('keeps close evolution routes near the top', () => {
    const contracts = buildBattleContracts({
      ...baseSnapshot,
      dailyComplete: true,
      routeWinsNeeded: 1,
      routeTargetName: 'Cinderpaw',
    });

    expect(contracts.some((contract) => contract.id === 'evolution-contract')).toBe(true);
    expect(contracts[0].id).toBe('evolution-contract');
  });

  it('limits visible contract choices to three cards', () => {
    const contracts = buildBattleContracts({
      ...baseSnapshot,
      winChancePercent: 84,
      winStreak: 3,
      routeWinsNeeded: 4,
      overdriveReady: true,
    });

    expect(contracts).toHaveLength(3);
  });
});
