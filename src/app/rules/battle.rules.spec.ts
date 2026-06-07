import { describe, expect, it } from 'vitest';
import {
  BATTLE_CATEGORIES,
  BATTLE_STANCES,
  OVERDRIVE_MAX,
  applyStreakBonus,
  buildReward,
  calculateEnemyBattleModifier,
  calculateStreakBonus,
  canArmOverdrive,
  chargeOverdrive,
  findCrossedMilestone,
  generateLossHint,
  getBattleCategoryProfile,
  getBattleStanceProfile,
  predictBattleOutlook,
  resolveBattle,
  winProbability,
} from './battle.rules';
import type { BattleReward } from '../models/battle.model';
import type { Monster } from '../models/monster.model';

describe('battle rules', () => {
  it('scales win rewards from the reward multiplier', () => {
    const result = resolveBattle({
      teamPower: 1200,
      enemyPower: 900,
      playerModifier: 0,
      enemyModifier: 0,
      rewardMultiplier: 1.2,
      randomBetween: () => 1,
    });

    expect(result.won).toBe(true);
    expect(result.criticalHit).toBe(true);
    expect(result.reward).toMatchObject({
      won: true,
      coins: 170,
      dnaShards: 11,
      xp: 50,
    });
  });

  it('keeps loss rewards useful without granting win values', () => {
    const result = resolveBattle({
      teamPower: 700,
      enemyPower: 1100,
      playerModifier: 0,
      enemyModifier: 0,
      rewardMultiplier: 1.35,
      randomBetween: () => 1,
    });

    expect(result.won).toBe(false);
    expect(result.reward).toMatchObject({
      won: false,
      coins: 32,
      dnaShards: 2,
      xp: 13,
    });
  });

  it('clamps the enemy modifier into the allowed combat range', () => {
    expect(calculateEnemyBattleModifier(0.25, 0.2)).toBe(0.32);
    expect(calculateEnemyBattleModifier(-0.25, -0.2)).toBe(-0.12);
  });

  it('exposes the three battle categories with distinct modifiers', () => {
    expect(BATTLE_CATEGORIES.map((category) => category.id)).toEqual(['training', 'standard', 'risk']);
    expect(getBattleCategoryProfile('training').rewardModifier).toBeLessThan(1);
    expect(getBattleCategoryProfile('standard').rewardModifier).toBe(1);
    expect(getBattleCategoryProfile('risk').rewardModifier).toBeGreaterThan(1);
  });

  it('falls back to standard when an unknown category id is requested', () => {
    expect(getBattleCategoryProfile('unknown' as never).id).toBe('standard');
  });

  it('returns a no-signal outlook when the squad is empty', () => {
    const outlook = predictBattleOutlook({
      teamPower: 0,
      enemyPower: 800,
      playerModifier: 0,
      enemyModifier: 0,
      hasSquad: false,
    });

    expect(outlook.tone).toBe('low');
    expect(outlook.label).toBe('No Signal');
    expect(outlook.ratio).toBe(0);
  });

  it('flags a strong outlook when the player squad clearly outpaces the enemy net', () => {
    const outlook = predictBattleOutlook({
      teamPower: 1400,
      enemyPower: 900,
      playerModifier: 0.1,
      enemyModifier: 0,
      hasSquad: true,
    });

    expect(outlook.tone).toBe('strong');
    expect(outlook.ratio).toBeGreaterThan(1.18);
  });

  it('flags an even outlook when both sides are within reach of each other', () => {
    const outlook = predictBattleOutlook({
      teamPower: 1000,
      enemyPower: 1020,
      playerModifier: 0,
      enemyModifier: 0,
      hasSquad: true,
    });

    expect(outlook.tone).toBe('even');
  });

  it('flags a low outlook when the enemy net outpaces the player squad', () => {
    const outlook = predictBattleOutlook({
      teamPower: 700,
      enemyPower: 1200,
      playerModifier: 0,
      enemyModifier: 0.1,
      hasSquad: true,
    });

    expect(outlook.tone).toBe('low');
  });

  it('grants no streak bonus on the first win of a streak', () => {
    const reward: BattleReward = { won: true, coins: 100, dnaShards: 10, xp: 40 };
    expect(calculateStreakBonus(1, reward)).toEqual({ coins: 0, xp: 0 });
  });

  it('scales streak bonus linearly with streak length up to the cap', () => {
    const reward: BattleReward = { won: true, coins: 100, dnaShards: 10, xp: 40 };
    expect(calculateStreakBonus(2, reward).coins).toBe(8);
    expect(calculateStreakBonus(3, reward).coins).toBe(16);
    expect(calculateStreakBonus(6, reward).coins).toBe(40);
    expect(calculateStreakBonus(20, reward).coins).toBe(40);
  });

  it('applies streak bonus by stacking coins and xp on the reward', () => {
    const reward: BattleReward = { won: true, coins: 120, dnaShards: 8, xp: 50 };
    const result = applyStreakBonus(reward, { coins: 24, xp: 10 }, 4);
    expect(result.coins).toBe(144);
    expect(result.xp).toBe(60);
    expect(result.streakAfter).toBe(4);
    expect(result.streakBonusCoins).toBe(24);
  });

  it('finds the first uncrossed milestone when wins cross a threshold', () => {
    expect(findCrossedMilestone(2, 3, [])).toBe(3);
    expect(findCrossedMilestone(2, 3, [3])).toBe(null);
    expect(findCrossedMilestone(4, 6, [3])).toBe(5);
    expect(findCrossedMilestone(10, 10, [])).toBe(null);
  });

  it('generates a squad-gap hint when the squad is incomplete', () => {
    const hint = generateLossHint({
      squad: [makeMonster('M001', 50, 50)],
      enemies: [],
      teamPower: 100,
      enemyPower: 100,
      typePressureLabel: 'Neutral coverage',
      squadSize: 1,
    });
    expect(hint).toMatch(/Squad gap/);
  });

  it('generates a train-or-replace hint when the power gap is large', () => {
    const weakest = makeMonster('M001', 20, 20);
    const stronger = makeMonster('M002', 80, 80);
    const hint = generateLossHint({
      squad: [stronger, weakest],
      enemies: [],
      teamPower: 800,
      enemyPower: 950,
      typePressureLabel: 'Neutral',
      squadSize: 3,
    });
    expect(hint).toMatch(/train or replace M001-name/);
  });

  it('falls back to a type-coverage hint when the gap is small', () => {
    const hint = generateLossHint({
      squad: [makeMonster('M001', 100, 100), makeMonster('M002', 100, 100), makeMonster('M003', 100, 100)],
      enemies: [],
      teamPower: 950,
      enemyPower: 970,
      typePressureLabel: 'Fire pressure leaks through',
      squadSize: 3,
    });
    expect(hint).toMatch(/Coverage signal/);
  });

  it('exposes a five-stance spread from berserk to bastion', () => {
    expect(BATTLE_STANCES.map((stance) => stance.id)).toEqual([
      'berserk',
      'aggressive',
      'balanced',
      'defensive',
      'bastion',
    ]);
    expect(getBattleStanceProfile('aggressive').attackMod).toBeGreaterThan(0);
    expect(getBattleStanceProfile('aggressive').mitigation).toBeLessThan(0);
    expect(getBattleStanceProfile('defensive').attackMod).toBeLessThan(0);
    expect(getBattleStanceProfile('defensive').mitigation).toBeGreaterThan(0);
    expect(getBattleStanceProfile('balanced')).toMatchObject({ attackMod: 0, mitigation: 0 });
  });

  it('makes berserk the top attacker and bastion the top defender', () => {
    const byAttack = [...BATTLE_STANCES].sort((a, b) => b.attackMod - a.attackMod);
    const byMitigation = [...BATTLE_STANCES].sort((a, b) => b.mitigation - a.mitigation);
    expect(byAttack[0].id).toBe('berserk');
    expect(byMitigation[0].id).toBe('bastion');
    // The all-in stance trades the most cover for the most offense.
    expect(getBattleStanceProfile('berserk').mitigation).toBeLessThan(getBattleStanceProfile('aggressive').mitigation);
  });

  it('falls back to the balanced stance for an unknown id', () => {
    expect(getBattleStanceProfile('unknown' as never).id).toBe('balanced');
  });

  it('charges overdrive faster on a win and caps it, then arms when full', () => {
    expect(chargeOverdrive(0, true)).toBe(34);
    expect(chargeOverdrive(0, false)).toBe(18);
    expect(chargeOverdrive(90, true)).toBe(OVERDRIVE_MAX);
    expect(canArmOverdrive(OVERDRIVE_MAX)).toBe(true);
    expect(canArmOverdrive(OVERDRIVE_MAX - 1)).toBe(false);
  });

  it('builds rewards identically to the resolveBattle path', () => {
    expect(buildReward(true, true, 1.2)).toMatchObject({ won: true, coins: 170, dnaShards: 11, xp: 50 });
    expect(buildReward(false, false, 1.35)).toMatchObject({ won: false, coins: 32, dnaShards: 2, xp: 13 });
  });
});

describe('winProbability', () => {
  it('is exactly 50% for equal bases', () => {
    expect(winProbability(100, 100)).toBeCloseTo(0.5, 6);
  });

  it('saturates toward the dominant side', () => {
    expect(winProbability(1000, 100)).toBe(1);
    expect(winProbability(100, 1000)).toBe(0);
  });

  it('handles degenerate bases', () => {
    expect(winProbability(0, 100)).toBe(0);
    expect(winProbability(100, 0)).toBe(1);
  });

  it('increases monotonically with the player base', () => {
    const a = winProbability(90, 100);
    const b = winProbability(100, 100);
    const c = winProbability(110, 100);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(a).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });

  it('matches a brute-force grid integration of the roll model', () => {
    const playerBase = 118;
    const enemyBase = 100;
    const min = 0.86;
    const max = 1.18;
    const steps = 400;
    let wins = 0;
    let total = 0;
    for (let i = 0; i < steps; i += 1) {
      const x = min + ((i + 0.5) / steps) * (max - min);
      for (let j = 0; j < steps; j += 1) {
        const y = min + ((j + 0.5) / steps) * (max - min);
        if (playerBase * x >= enemyBase * y) {
          wins += 1;
        }
        total += 1;
      }
    }
    expect(winProbability(playerBase, enemyBase)).toBeCloseTo(wins / total, 2);
  });
});

describe('predictBattleOutlook win chance', () => {
  it('exposes a win-chance percentage that tracks the matchup', () => {
    const strong = predictBattleOutlook({ teamPower: 600, enemyPower: 300, playerModifier: 0, enemyModifier: 0, hasSquad: true });
    const weak = predictBattleOutlook({ teamPower: 300, enemyPower: 600, playerModifier: 0, enemyModifier: 0, hasSquad: true });
    expect(strong.winChancePercent).toBe(100);
    expect(weak.winChancePercent).toBe(0);
    expect(predictBattleOutlook({ teamPower: 400, enemyPower: 400, playerModifier: 0, enemyModifier: 0, hasSquad: true }).winChancePercent).toBe(50);
  });

  it('returns zero win chance without a squad', () => {
    expect(predictBattleOutlook({ teamPower: 0, enemyPower: 400, playerModifier: 0, enemyModifier: 0, hasSquad: false }).winChance).toBe(0);
  });
});

function makeMonster(id: string, attack: number, defense: number): Monster {
  return {
    id,
    name: `${id}-name`,
    stage: 'Rookie',
    type: 'Nature',
    icon: '?',
    level: 5,
    xp: 0,
    maxXp: 100,
    attack,
    defense,
    speed: 30,
    hp: 100,
    rarity: 'Common',
    unlocked: true,
    evolutionTargets: [],
  };
}

