import { describe, expect, it } from 'vitest';
import { buildTacticalDirectives, estimateRouteWins, RouteEtaInput, TacticalDirectiveSnapshot } from './tactical-directive.rules';

const routeBase: RouteEtaInput = {
  targetName: 'Splashfang',
  ready: false,
  percent: 75,
  levelGap: 1,
  xpToLevel: 70,
  coinGap: 0,
  dnaGap: 0,
  itemMissing: false,
  winCoins: 120,
  winDna: 8,
  winXp: 35,
  itemChancePercent: 25,
};

const snapshotBase: TacticalDirectiveSnapshot = {
  route: routeBase,
  squad: {
    squadSize: 3,
    candidateName: 'Cinderpaw',
    weakestName: 'Aquabun',
    powerGain: 44,
  },
  winChancePercent: 74,
  nextWinCoins: 120,
  nextWinDna: 8,
  nextWinXp: 35,
  itemChancePercent: 25,
  claimableChapterTitle: null,
  expeditionReady: false,
  forgeReady: false,
  dailyLabel: 'Win 3 battles',
  dailyProgress: 1,
  dailyGoal: 3,
  dailyComplete: false,
};

describe('tactical directive rules', () => {
  it('estimates wins from the slowest route blocker', () => {
    expect(estimateRouteWins(routeBase)).toBe(2);
    expect(estimateRouteWins({ ...routeBase, levelGap: 0, xpToLevel: 0, dnaGap: 25 })).toBe(4);
    expect(estimateRouteWins({ ...routeBase, itemMissing: true, itemChancePercent: 25 })).toBe(4);
  });

  it('marks ready routes as immediate evolve directives', () => {
    const cards = buildTacticalDirectives({
      ...snapshotBase,
      route: { ...routeBase, ready: true, percent: 100, levelGap: 0, xpToLevel: 0 },
    });

    expect(cards[0]).toMatchObject({
      title: 'Splashfang is ready now',
      metric: '0 wins',
      actionId: 'evolve-ready',
      tone: 'ready',
    });
  });

  it('surfaces reserve swaps when power gain exists', () => {
    const cards = buildTacticalDirectives(snapshotBase);

    expect(cards[1]).toMatchObject({
      title: 'Swap in Cinderpaw',
      metric: '+44 PW',
      actionId: 'auto-squad',
    });
  });

  it('prioritizes claimable chapter payout over routine daily progress', () => {
    const cards = buildTacticalDirectives({
      ...snapshotBase,
      claimableChapterTitle: 'Chapter 3 - Core Bloom',
      dailyComplete: false,
    });

    expect(cards[3]).toMatchObject({
      title: 'Chapter 3 - Core Bloom ready',
      actionId: 'claim-chapter',
      tone: 'ready',
    });
  });
});
