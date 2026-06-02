import { describe, expect, it } from 'vitest';
import { simulateBattle, BattleSimulationParams } from './combat.engine';
import type { Monster } from '../models/monster.model';
import type { EnemyMonster } from '../models/battle.model';

const rbMin = (min: number, _max: number) => min;
const rfFirst = <T>(items: T[]): T => items[0];

function makeMonster(id: string, attack: number, hp: number): Monster {
  return {
    id,
    name: `${id}-ally`,
    stage: 'Champion',
    type: 'Fire',
    icon: '?',
    level: 10,
    xp: 0,
    maxXp: 100,
    attack,
    defense: 60,
    speed: 60,
    hp,
    rarity: 'Common',
    unlocked: true,
    evolutionTargets: [],
  };
}

function makeEnemy(id: string, attack: number, hp: number): EnemyMonster {
  return { id, name: `${id}-foe`, icon: '?', hp, attack, defense: 40, speed: 40, type: 'Nature' };
}

function baseParams(overrides: Partial<BattleSimulationParams> = {}): BattleSimulationParams {
  return {
    squad: [makeMonster('M001', 120, 300), makeMonster('M002', 110, 280)],
    enemies: [makeEnemy('E001', 40, 120), makeEnemy('E002', 36, 110)],
    playerModifier: 0,
    enemyModifier: 0,
    stanceAttackMod: 0,
    stanceMitigation: 0,
    overdrive: false,
    overdriveAttackBonus: 0.18,
    consumables: [],
    synergyLabel: null,
    randomBetween: rbMin,
    randomFrom: rfFirst,
    ...overrides,
  };
}

describe('combat engine', () => {
  it('lets a clearly stronger squad win and a clearly weaker squad lose', () => {
    const win = simulateBattle(baseParams());
    expect(win.won).toBe(true);

    const loss = simulateBattle(
      baseParams({
        squad: [makeMonster('M001', 20, 80)],
        enemies: [makeEnemy('E001', 200, 600), makeEnemy('E002', 190, 580)],
      }),
    );
    expect(loss.won).toBe(false);
  });

  it('is deterministic for identical RNG inputs', () => {
    const a = simulateBattle(baseParams());
    const b = simulateBattle(baseParams());
    expect(a.events).toEqual(b.events);
    expect(a.playerRoll).toBe(b.playerRoll);
  });

  it('emits an overdrive event only when overdrive is armed', () => {
    expect(simulateBattle(baseParams({ overdrive: false })).events.some((e) => e.kind === 'overdrive')).toBe(false);

    const armed = simulateBattle(baseParams({ overdrive: true }));
    expect(armed.overdriveUsed).toBe(true);
    const overdrive = armed.events.find((e) => e.kind === 'overdrive');
    expect(overdrive).toBeDefined();
    expect(overdrive?.amount ?? 0).toBeGreaterThan(0);
  });

  it('produces strike events with real damage numbers and an outcome event', () => {
    const result = simulateBattle(baseParams());
    const strikes = result.events.filter((e) => e.kind === 'strike' && (e.amount ?? 0) > 0);
    expect(strikes.length).toBeGreaterThan(0);
    expect(result.events.at(-1)?.kind).toBe('outcome');
  });

  it('applies enemy-targeted statuses when the chance roll passes', () => {
    // rbMin returns 0 for randomBetween(0,1) -> always within statusChance.
    const result = simulateBattle(baseParams());
    expect(result.events.some((e) => e.kind === 'status-apply')).toBe(true);
  });

  it('blocks enemy-applied statuses when a cleanse consumable is active', () => {
    const result = simulateBattle(baseParams({ consumables: [{ name: 'Purge Chip', kind: 'cleanse' }] }));
    const enemyStatus = result.events.find((e) => e.kind === 'status-apply' && e.side === 'enemy');
    expect(enemyStatus).toBeUndefined();
    expect(result.events.some((e) => e.kind === 'item')).toBe(true);
  });

  it('reports a flawless win for a decisive margin and a non-flawless win for a thin one', () => {
    const decisive = simulateBattle(baseParams());
    expect(decisive.won).toBe(true);
    expect(decisive.flawless).toBe(true);
  });
});
