import { describe, expect, it } from 'vitest';
import { buildMissionControlCards, MissionControlSnapshot } from './mission-control.rules';

const baseSnapshot: MissionControlSnapshot = {
  squadSize: 3,
  teamPower: 980,
  enemyPower: 860,
  winChancePercent: 76,
  itemChancePercent: 33,
  nextWinCoins: 150,
  nextWinXp: 44,
  readyEvolutionName: null,
  nextEvolutionName: 'Splashfang',
  nextEvolutionPercent: 75,
  nextEvolutionBlocker: 'Level',
  unlockedCount: 22,
  totalMonsters: 71,
  dailyLabel: 'Win 3 battles',
  dailyProgress: 1,
  dailyGoal: 3,
  dailyComplete: false,
  battleIntelTotal: 4,
  battleIntelWinRate: 75,
  battleTrend: 'steady',
  claimableChapterTitle: null,
  expeditionReady: true,
  forgeReady: false,
};

describe('mission control rules', () => {
  it('blocks the loop on an empty squad and routes to auto squad', () => {
    const cards = buildMissionControlCards({ ...baseSnapshot, squadSize: 0, teamPower: 0, winChancePercent: 0 });

    expect(cards[0]).toMatchObject({
      title: 'Load a squad first',
      tone: 'blocked',
      actionId: 'auto-squad',
    });
    expect(cards[2]).toMatchObject({
      title: 'Battle blocked',
      actionId: 'auto-squad',
    });
  });

  it('prioritizes a ready evolution over routine farming', () => {
    const cards = buildMissionControlCards({
      ...baseSnapshot,
      readyEvolutionName: 'Cinderpaw',
      nextEvolutionName: 'Cinderpaw',
      nextEvolutionPercent: 100,
    });

    expect(cards[0]).toMatchObject({
      title: 'Cinderpaw is ready',
      tone: 'ready',
      actionId: 'evolve-ready',
    });
    expect(cards[1]).toMatchObject({
      metric: '100% sync',
      actionLabel: 'Evolve Now',
    });
  });

  it('surfaces battle payout when the squad is ready', () => {
    const cards = buildMissionControlCards(baseSnapshot);

    expect(cards[2]).toMatchObject({
      title: 'Reward window live',
      metric: '980/860 PW',
      actionId: 'run-battle',
    });
    expect(cards[2].detail).toContain('+150 CR');
    expect(cards[2].detail).toContain('33% item');
  });

  it('routes meta focus to claimable chapter before side loops', () => {
    const cards = buildMissionControlCards({
      ...baseSnapshot,
      dailyComplete: true,
      claimableChapterTitle: 'Chapter 2 - Signal Bloom',
      expeditionReady: true,
      forgeReady: true,
    });

    expect(cards[4]).toMatchObject({
      title: 'Chapter 2 - Signal Bloom claim ready',
      tone: 'ready',
      actionId: 'claim-chapter',
    });
  });
});
