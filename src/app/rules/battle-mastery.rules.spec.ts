import { describe, expect, it } from 'vitest';
import { Monster } from '../models/monster.model';
import { BattleEvent } from './combat.engine';
import { applyMasteryAward, awardBattleMastery, emptyMonsterMastery } from './battle-mastery.rules';

const aquabun: Monster = {
  id: 'M007',
  name: 'Aquabun',
  stage: 'In-Training',
  type: 'Water',
  icon: 'AQ',
  level: 3,
  xp: 0,
  maxXp: 130,
  attack: 30,
  defense: 24,
  speed: 34,
  hp: 104,
  rarity: 'Common',
  unlocked: true,
  evolutionTargets: [],
};

const waterHits: BattleEvent[] = [
  { kind: 'strike', side: 'player', actorName: 'Aquabun', moveType: 'Water', amount: 18 },
  { kind: 'strike', side: 'player', actorName: 'Aquabun', moveType: 'Water', amount: 22 },
];

describe('battle mastery rules', () => {
  it('rewards completed type goals and persists signature progress', () => {
    const award = awardBattleMastery(aquabun, undefined, waterHits, true, 'break');
    expect(award.goalCompleted).toBe(true);
    expect(award.points).toBeGreaterThan(10);
    const next = applyMasteryAward(undefined, award);
    expect(next.battleXp).toBe(award.points);
    expect(next.signatureProgress).toBe(1);
    expect(next.completedGoals).toContain('water-hits');
  });

  it('makes Surge grant more mastery than Guard', () => {
    const guard = awardBattleMastery(aquabun, undefined, waterHits, true, 'guard');
    const surge = awardBattleMastery(aquabun, undefined, waterHits, true, 'surge');
    expect(surge.points).toBeGreaterThan(guard.points);
  });

  it('unlocks a type move when crossing the mastery threshold', () => {
    const current = { ...emptyMonsterMastery(), battleXp: 20 };
    const award = awardBattleMastery(aquabun, current, waterHits, true, 'surge');
    expect(award.unlockedMove).toBe('Aqua Guard');
    expect(applyMasteryAward(current, award).unlockedMoves).toContain('Aqua Guard');
  });
});
