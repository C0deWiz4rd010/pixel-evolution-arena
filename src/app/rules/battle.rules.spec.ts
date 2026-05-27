import { describe, expect, it } from 'vitest';
import {
  BATTLE_CATEGORIES,
  applyStreakBonus,
  calculateEnemyBattleModifier,
  calculateStreakBonus,
  findCrossedMilestone,
  generateLossHint,
  getBattleCategoryProfile,
  predictBattleOutlook,
  resolveBattle,
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
    expect(result.reward).toMatchObject({
      won: true,
      coins: 144,
      dnaShards: 10,
      xp: 42,
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

