import { describe, expect, it } from 'vitest';
import { Monster } from '../models/monster.model';
import { EnemyMonster } from '../models/battle.model';
import { advanceBattleSession, applyBattleDecision, battleResult, createBattleSession, recommendedDecision, simulateRecommendedBattle } from './tactical-director.rules';

function monster(id: string, attack = 70, hp = 180, speed = 60): Monster {
  return { id, name: id, icon: '?', type: 'Fire', stage: 'Rookie', level: 5, xp: 0, maxXp: 100, attack, defense: 50, speed, hp, rarity: 'Common', unlocked: true, evolutionTargets: [] };
}

function enemy(id: string, attack = 65, hp = 170, speed = 50): EnemyMonster {
  return { id, name: id, icon: '?', type: 'Nature', attack, defense: 45, speed, hp };
}

function params(seed = 42) {
  return { squad: [monster('A'), monster('B')], enemies: [enemy('X'), enemy('Y')], seed, playerAttackModifier: 0.08, enemyAttackModifier: 0, playerMitigation: 0, overdriveCharge: 0, overdriveArmed: false };
}

describe('tactical director battle', () => {
  it('is deterministic for a fixed seed and resolves from real HP', () => {
    const a = simulateRecommendedBattle(params());
    const b = simulateRecommendedBattle(params());
    expect(a).toEqual(b);
    expect(a.events.some((event) => typeof event.targetHp === 'number')).toBe(true);
    expect(a.rounds).toBeLessThanOrEqual(8);
  });

  it('pauses after opening for a squad order', () => {
    const state = advanceBattleSession(createBattleSession(params()));
    expect(state.round).toBe(2);
    expect(state.pendingDecision).toBe('order');
    expect(recommendedDecision(state).kind).toBe('order');
  });

  it('runs order, pulse, second order, then completes', () => {
    let state = advanceBattleSession(createBattleSession(params(7)));
    state = applyBattleDecision(state, { kind: 'order', id: 'focus', targetId: 'X' });
    state = advanceBattleSession(state);
    expect(state.pendingDecision).toBe('pulse');
    state = applyBattleDecision(state, { kind: 'pulse', id: 'guard' });
    state = advanceBattleSession(state);
    if (!state.completed) {
      expect(state.pendingDecision).toBe('order');
      state = applyBattleDecision(state, { kind: 'order', id: 'charge' });
      state = advanceBattleSession(state);
    }
    expect(state.completed).toBe(true);
    expect(battleResult(state).pulseChoice).toBe('guard');
  });

  it('makes build overdrive add charge and break cancel an enemy action', () => {
    let state = advanceBattleSession(createBattleSession(params(11)));
    state = applyBattleDecision(state, { kind: 'order', id: 'charge' });
    expect(state.overdriveCharge).toBeGreaterThanOrEqual(30);
    state = advanceBattleSession(state);
    if (!state.completed) {
      state = applyBattleDecision(state, { kind: 'pulse', id: 'break' });
      expect(state.skipNextEnemyAction).toBe(true);
    }
  });
});
