import { describe, expect, it } from 'vitest';
import {
  EXPEDITION_ROWS,
  clearNode,
  generateExpedition,
  reachableNodes,
  relicBonus,
  rollRelicChoices,
} from './expedition.rules';

describe('expedition.rules', () => {
  it('generates a deterministic map for a given seed', () => {
    const a = generateExpedition(12345);
    const b = generateExpedition(12345);
    expect(a.map.map((n) => n.type)).toEqual(b.map.map((n) => n.type));
    expect(a.map.length).toBe(b.map.length);
  });

  it('has a single boss node on the final row', () => {
    const run = generateExpedition(999);
    const lastRow = run.map.filter((n) => n.row === EXPEDITION_ROWS - 1);
    expect(lastRow).toHaveLength(1);
    expect(lastRow[0].type).toBe('boss');
  });

  it('starts with the first-row nodes reachable', () => {
    const run = generateExpedition(7);
    const reachable = reachableNodes(run);
    expect(reachable.every((n) => n.row === 0)).toBe(true);
    expect(reachable.length).toBeGreaterThan(0);
  });

  it('advances reachability when a node is cleared', () => {
    const run = generateExpedition(42);
    const first = reachableNodes(run)[0];
    const next = clearNode(run, first.id);
    expect(next.currentNodeId).toBe(first.id);
    expect(next.map.find((n) => n.id === first.id)?.cleared).toBe(true);
    expect(next.reachableIds).toEqual(first.nextIds);
  });

  it('marks the run won when the boss node is cleared', () => {
    let run = generateExpedition(3);
    const boss = run.map.find((n) => n.type === 'boss')!;
    run = clearNode(run, boss.id);
    expect(run.status).toBe('won');
    expect(run.reachableIds).toEqual([]);
  });

  it('aggregates relic bonuses multiplicatively for reward', () => {
    const bonus = relicBonus(['relic-edge', 'relic-greed']);
    expect(bonus.attackBonus).toBeCloseTo(0.08, 5);
    expect(bonus.rewardMultiplier).toBeCloseTo(1.25, 5);
  });

  it('rolls three distinct relic choices', () => {
    const choices = rollRelicChoices(1, []);
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices.length).toBeLessThanOrEqual(3);
  });
});
