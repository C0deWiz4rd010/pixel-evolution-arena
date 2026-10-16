import { describe, expect, it } from 'vitest';
import { MONSTERS } from '../data/monsters.data';
import { Monster } from '../models/monster.model';
import { buildReward } from './battle.rules';
import { applyXpToMonster } from './xp.rules';

/** Wins needed for one chain monster to climb Baby -> first Mega with no drills and no other XP source. */
function winsToFirstMega(startId: string, xpPerWin: number): number {
  const byId = new Map(MONSTERS.map((monster) => [monster.id, monster] as const));
  let current: Monster = { ...byId.get(startId)! };
  let wins = 0;
  for (let guard = 0; guard < 5000; guard += 1) {
    if (current.stage === 'Mega') return wins;
    const targets = current.evolutionTargets.map((id) => byId.get(id)!).filter(Boolean);
    const next = targets.find((target) => (target.requirements?.level ?? 0) <= current.level && !target.requirements?.mastery);
    if (next) {
      current = { ...next, level: Math.max(1, current.level - 2), xp: 0 };
      continue;
    }
    current = applyXpToMonster([current], current.id, xpPerWin).updatedMonsters[0];
    wins += 1;
  }
  return Number.POSITIVE_INFINITY;
}

describe('progression pacing', () => {
  it('reports wins to first Mega for each starter chain', () => {
    const xp = buildReward(true, false, 1).xp;
    const report = ['M001', 'M002', 'M003', 'M004'].map((id) => [id, winsToFirstMega(id, xp)]);
    console.log('wins to first Mega @', xp, 'xp/win:', JSON.stringify(report));
    // Design target: roughly 25-40 pure wins for a first Mega; drills, streaks and tougher formations only speed this up.
    for (const [, wins] of report) {
      expect(wins).toBeGreaterThanOrEqual(20);
      expect(wins).toBeLessThanOrEqual(45);
    }
  });
});

import { EnemyMonster } from '../models/battle.model';
import { engineWinProbability, ENEMY_TIER_RATIO, expectedSquadPower, scaleEnemiesToPower } from './battle.rules';
import { getMonsterPower } from './squad.rules';
import { simulateRecommendedBattle } from './tactical-director.rules';

function squadOf(scale: number): Monster[] {
  const base = [
    { attack: 40, defense: 30, speed: 34, hp: 150 },
    { attack: 34, defense: 36, speed: 30, hp: 170 },
    { attack: 46, defense: 24, speed: 40, hp: 130 },
  ];
  return base.map((stats, index) => ({
    id: `p${index}`, name: `p${index}`, icon: '?', type: 'Fire', stage: 'Rookie', level: 5, xp: 0, maxXp: 100, rarity: 'Common', unlocked: true, evolutionTargets: [],
    attack: Math.round(stats.attack * scale), defense: Math.round(stats.defense * scale), speed: Math.round(stats.speed * scale), hp: Math.round(stats.hp * scale),
  }));
}

function foesOf(scale: number): EnemyMonster[] {
  return squadOf(scale).map((monster, index) => ({ id: `e${index}`, name: `e${index}`, icon: '?', type: 'Nature', attack: monster.attack, defense: monster.defense, speed: monster.speed, hp: monster.hp }));
}

function engineWinRate(ratioScale: number, runs = 120): { ratio: number; engine: number; forecast: number } {
  const squad = squadOf(1);
  const enemies = foesOf(ratioScale);
  const teamPower = squad.reduce((sum, monster) => sum + getMonsterPower(monster), 0);
  const enemyPower = enemies.reduce((sum, foe) => sum + getMonsterPower(foe), 0);
  let wins = 0;
  for (let seed = 1; seed <= runs; seed += 1) {
    const result = simulateRecommendedBattle({ squad, enemies, seed: seed * 7919, playerAttackModifier: 0, enemyAttackModifier: 0, playerMitigation: 0, overdriveCharge: 0, overdriveArmed: false });
    if (result.won) wins += 1;
  }
  return { ratio: teamPower / enemyPower, engine: wins / runs, forecast: engineWinProbability(teamPower, enemyPower) };
}

describe('forecast vs engine', () => {
  it('prints the engine win rate against the closed-form forecast', () => {
    const rows = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.35].map((scale) => engineWinRate(scale));
    console.log('FORECAST', JSON.stringify(rows.map((row) => [row.ratio.toFixed(2), row.engine.toFixed(2), row.forecast.toFixed(2)])));
    for (const row of rows) {
      expect(Math.abs(row.engine - row.forecast), `ratio ${row.ratio.toFixed(2)}`).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('power curve', () => {
  it('prints chain power by win count', () => {
    const byId = new Map(MONSTERS.map((monster) => [monster.id, monster] as const));
    let current: Monster = { ...byId.get('M003')! };
    const points: number[][] = [];
    for (let wins = 0; wins <= 120; wins += 1) {
      for (;;) {
        const next = current.evolutionTargets.map((id) => byId.get(id)!).find((target) => target && (target.requirements?.level ?? 0) <= current.level && !target.requirements?.mastery && target.stage !== 'Special');
        if (!next) break;
        current = { ...next, level: Math.max(1, current.level - 2), xp: 0 };
      }
      if (wins % 5 === 0) points.push([wins, getMonsterPower(current), current.level]);
      current = applyXpToMonster([current], current.id, 35).updatedMonsters[0];
    }
    console.log('POWER', JSON.stringify(points));
  });
});

describe('enemy scaling', () => {
  it('keeps formation power on target and win odds ordered by tier', () => {
    const squad = squadOf(1);
    const teamPower = squad.reduce((sum, monster) => sum + getMonsterPower(monster), 0);
    const odds = (['Scout', 'Standard', 'Elite', 'Boss'] as const).map((tier) => {
      const enemies = scaleEnemiesToPower(foesOf(1), teamPower * ENEMY_TIER_RATIO[tier]);
      const power = enemies.reduce((sum, foe) => sum + getMonsterPower(foe), 0);
      expect(Math.abs(power / (teamPower * ENEMY_TIER_RATIO[tier]) - 1)).toBeLessThan(0.03);
      let wins = 0;
      for (let seed = 1; seed <= 80; seed += 1) {
        if (simulateRecommendedBattle({ squad, enemies, seed: seed * 104729, playerAttackModifier: 0, enemyAttackModifier: 0, playerMitigation: 0, overdriveCharge: 0, overdriveArmed: false }).won) wins += 1;
      }
      return wins / 80;
    });
    console.log('TIER WIN RATES', JSON.stringify(odds));
    expect(odds[0]).toBeGreaterThanOrEqual(odds[1]);
    expect(odds[1]).toBeGreaterThan(odds[3]);
  });

  it('grows the expected squad power monotonically with wins', () => {
    let previous = 0;
    for (const wins of [0, 3, 8, 15, 30, 60, 150, 500]) {
      const value = expectedSquadPower(wins);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
