// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { setupGameTestBed } from '../../testing/game-test-bed';
import { GEAR_DEFS } from '../data/gear.data';
import { RESEARCH_NODES } from '../data/research.data';
import { AchievementsStore } from './achievements.store';
import { GameStore } from './game-store.service';
import { GearStore } from './gear.store';
import { ResearchStore } from './research.store';
import { SquadStore } from './squad.store';

describe('domain stores', () => {
  beforeEach(() => setupGameTestBed());

  it('SquadStore adds, blocks duplicates and caps the squad at three', () => {
    const store = TestBed.inject(GameStore);
    const squad = TestBed.inject(SquadStore);
    store.monsters.update((monsters) => monsters.map((monster, index) => (index < 5 ? { ...monster, unlocked: true } : monster)));
    store.player.update((player) => ({ ...player, squadIds: [] }));
    const ids = store.monsters().slice(0, 5).map((monster) => monster.id);

    squad.addToSquad(ids[0]);
    squad.addToSquad(ids[0]);
    squad.addToSquad(ids[1]);
    squad.addToSquad(ids[2]);
    squad.addToSquad(ids[3]);
    expect(store.player().squadIds).toEqual(ids.slice(0, 3));

    squad.removeFromSquad(ids[1]);
    expect(store.player().squadIds).toEqual([ids[0], ids[2]]);
  });

  it('SquadStore auto-build fills every slot with unlocked creatures', () => {
    const store = TestBed.inject(GameStore);
    const squad = TestBed.inject(SquadStore);
    store.player.update((player) => ({ ...player, squadIds: [] }));
    squad.autoBuildBestSquad();
    const unlocked = store.monsters().filter((monster) => monster.unlocked).length;
    expect(store.player().squadIds).toHaveLength(Math.min(3, unlocked));
    expect(store.squad().every((monster) => monster.unlocked)).toBe(true);
  });

  it('GearStore forges with enough resources, equips once and raises effective stats', () => {
    const store = TestBed.inject(GameStore);
    const gear = TestBed.inject(GearStore);
    store.player.update((player) => ({ ...player, coins: 99999, dnaShards: 9999 }));
    const def = GEAR_DEFS[0];
    gear.forgeGear(def.id);
    const instance = store.player().ownedGear[0];
    expect(instance.defId).toBe(def.id);

    const lead = store.squad()[0];
    const before = gear.getEffectiveMonster(lead);
    gear.equipGear(lead.id, instance.instanceId);
    gear.equipGear(store.squad()[1].id, instance.instanceId);
    const equippedOn = Object.entries(store.player().gearLoadout).filter(([, slots]) => Object.values(slots).includes(instance.instanceId));
    expect(equippedOn.map(([monsterId]) => monsterId)).toEqual([store.squad()[1].id]);

    gear.equipGear(lead.id, instance.instanceId);
    const after = gear.getEffectiveMonster(lead);
    const statSum = (m: typeof lead) => m.attack + m.defense + m.speed + m.hp;
    expect(statSum(after)).toBeGreaterThan(statSum(before));
  });

  it('GearStore refuses to forge without resources', () => {
    const store = TestBed.inject(GameStore);
    const gear = TestBed.inject(GearStore);
    store.player.update((player) => ({ ...player, coins: 0, dnaShards: 0 }));
    gear.forgeGear(GEAR_DEFS[0].id);
    expect(store.player().ownedGear).toHaveLength(0);
  });

  it('ResearchStore spends Bio-Data and applies the node modifiers', () => {
    const store = TestBed.inject(GameStore);
    const research = TestBed.inject(ResearchStore);
    const node = RESEARCH_NODES.find((entry) => entry.requires.length === 0 && entry.effect.coinBonus)!;
    expect(research.unlockResearch(node.id)).toBe(false);

    store.player.update((player) => ({ ...player, bioData: node.cost + 5 }));
    expect(research.recommendedResearch()).not.toBeNull();
    expect(research.unlockResearch(node.id)).toBe(true);
    expect(store.player().bioData).toBe(5);
    expect(research.researchModifiers().coinMultiplier).toBeGreaterThan(1);
    expect(research.unlockResearch(node.id)).toBe(false);
  });

  it('AchievementsStore pays out a completed medal exactly once via its effect', () => {
    const store = TestBed.inject(GameStore);
    const medals = TestBed.inject(AchievementsStore);
    TestBed.tick();
    const coinsBefore = store.player().coins;
    store.player.update((player) => ({ ...player, battlesWon: 500, bestWinStreak: 50 }));
    TestBed.tick();
    const claimed = store.player().claimedAchievements.length;
    expect(claimed).toBeGreaterThan(0);
    expect(store.player().coins).toBeGreaterThan(coinsBefore);
    TestBed.tick();
    expect(store.player().claimedAchievements.length).toBe(claimed);
    expect(medals.unlockedAchievementCount()).toBe(claimed);
  });
});
