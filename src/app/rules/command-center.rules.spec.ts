import { describe, expect, it } from 'vitest';
import {
  buildBossPrepCards,
  buildCommandCenterCards,
  buildMedalFocusCards,
  buildSystemCheckCards,
} from './command-center.rules';

describe('command center rules', () => {
  it('prioritizes ready evolution and chapter claim cards', () => {
    const cards = buildCommandCenterCards({
      squadSize: 3,
      dailyLabel: 'Win 3 battles',
      dailyDetail: 'Stack a short victory chain.',
      dailyProgress: 1,
      dailyGoal: 3,
      dailyComplete: false,
      readyEvolutionName: 'Splashfang',
      nextEvolutionName: 'Splashfang',
      nextEvolutionPercent: 100,
      claimableChapterTitle: 'Chapter 1 - Ignition',
      nextChapterTitle: 'Chapter 1 - Ignition',
      nextChapterProgress: 3,
      nextChapterGoal: 3,
      nextChapterPercent: 100,
      expeditionStatus: 'idle',
      expeditionDepth: 0,
      expeditionMaxDepth: 7,
      expeditionHp: 0,
      expeditionMaxHp: 0,
      expeditionCores: 0,
      forgeTitle: 'Auto-equip available',
      forgeDetail: 'A clean loadout upgrade is ready.',
      forgeMetric: '+44 PW',
      forgeReady: true,
    });

    expect(cards[1]).toMatchObject({
      title: 'Splashfang can go online',
      actionId: 'evolve-ready',
      tone: 'ready',
    });
    expect(cards[2]).toMatchObject({
      title: 'Chapter 1 - Ignition ready to claim',
      actionId: 'claim-chapter',
      tone: 'ready',
    });
  });

  it('builds medal focus around streaks and codex completion', () => {
    const cards = buildMedalFocusCards({
      dailyLabel: 'Win 3 battles',
      dailyProgress: 3,
      dailyGoal: 3,
      dailyComplete: true,
      bestStreak: 4,
      nextStreakMilestone: 5,
      bossesDefeated: 1,
      totalBosses: 3,
      unlockedMonsters: 22,
      totalMonsters: 71,
    });

    expect(cards[0].tone).toBe('ready');
    expect(cards[1]).toMatchObject({
      metric: 'Best x4',
      actionId: 'run-battle',
    });
    expect(cards[3].metric).toContain('locked');
  });

  it('returns a single boss window card when no boss is active', () => {
    const cards = buildBossPrepCards({
      bossName: null,
      bossTelegraph: null,
      bossCounter: null,
      bossRewardCoins: 0,
      bossRewardDna: 0,
      teamPower: 420,
      enemyPower: 0,
      battleTrend: 'steady',
      overdriveReady: false,
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toContain('No named boss');
  });

  it('marks sync errors as warning system checks', () => {
    const cards = buildSystemCheckCards({
      saveStatus: 'ERROR',
      lastSavedLabel: 'save failed',
      exportReady: false,
      colorblindMode: false,
      combatBeats: false,
      effectIntensity: 1,
      audioEnabled: false,
    });

    expect(cards[0]).toMatchObject({
      title: 'ERROR',
      tone: 'warning',
      actionId: 'save-now',
    });
  });
});
