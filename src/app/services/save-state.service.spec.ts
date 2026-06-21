import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MONSTERS } from '../data/monsters.data';
import { serializeMonsterProgress } from '../models/save-state.model';
import { SaveStateService } from './save-state.service';

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('save state service', () => {
  const originalStorage = globalThis.localStorage;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: originalStorage,
    });
  });

  it('saves and restores a snapshot with version metadata', () => {
    const service = new SaveStateService();
    const firstMonster = MONSTERS[0];

    const snapshot = service.saveState({
      player: {
        coins: 999,
        dnaShards: 12,
        battlesFought: 3,
        battlesWon: 2,
        selectedMonsterId: firstMonster.id,
        squadIds: [firstMonster.id],
        inventory: ['Armor Core'],
        winStreak: 2,
        bestWinStreak: 4,
        claimedMilestones: [3],
        squadPresets: [
          {
            id: 'preset-1',
            name: 'Starter Trio',
            squadIds: [firstMonster.id],
          },
        ],
        pinnedChaseId: firstMonster.id,
        claimedStageMilestones: ['Baby'],
      },
      monsters: [serializeMonsterProgress(firstMonster)],
      battleLogs: [{ text: 'Saved battle log.', type: 'info' }],
      lastReward: { coins: 120, dnaShards: 8, xp: 35, won: true },
      lastBattleThreat: {
        id: 'standard',
        label: 'Calm Circuit',
        detail: 'Baseline arena conditions with no danger spike.',
        enemyModifier: 0,
        rewardModifier: 1,
        itemBonus: 0,
      },
    });

    expect(snapshot?.saveVersion).toBe(11);
    expect(service.syncState()).toBe('ready');

    const loaded = service.loadState();
    expect(loaded?.player.coins).toBe(999);
    expect(loaded?.player.winStreak).toBe(2);
    expect(loaded?.player.bestWinStreak).toBe(4);
    expect(loaded?.player.claimedMilestones).toEqual([3]);
    expect(loaded?.player.squadPresets[0].name).toBe('Starter Trio');
    expect(loaded?.player.pinnedChaseId).toBe(firstMonster.id);
    expect(loaded?.player.claimedStageMilestones).toEqual(['Baby']);
    expect(loaded?.battleLogs[0].text).toBe('Saved battle log.');
    expect(service.lastSavedAt()).toBeTypeOf('string');
  });

  it('migrates a v1 snapshot by filling in streak and milestone defaults', () => {
    globalThis.localStorage.setItem(
      'pixel-evolution-arena.save',
      JSON.stringify({
        saveVersion: 1,
        savedAt: new Date().toISOString(),
        player: {
          coins: 500,
          dnaShards: 20,
          battlesFought: 5,
          battlesWon: 3,
          selectedMonsterId: MONSTERS[0].id,
          squadIds: [MONSTERS[0].id],
          inventory: ['Armor Core'],
        },
        monsters: [serializeMonsterProgress(MONSTERS[0])],
        battleLogs: [{ text: 'Legacy log.', type: 'info' }],
        lastReward: null,
        lastBattleThreat: null,
      }),
    );

    const service = new SaveStateService();
    const loaded = service.loadState();

    expect(loaded?.saveVersion).toBe(11);
    expect(loaded?.player.coins).toBe(500);
    expect(loaded?.player.winStreak).toBe(0);
    expect(loaded?.player.bestWinStreak).toBe(0);
    expect(loaded?.player.claimedMilestones).toEqual([]);
    expect(loaded?.player.squadPresets).toEqual([]);
    expect(loaded?.player.pinnedChaseId).toBeNull();
    expect(loaded?.player.claimedStageMilestones).toEqual([]);
    // v6 defaults for the hybrid-combat / meta fields.
    expect(loaded?.player.overdriveCharge).toBe(0);
    expect(loaded?.player.claimedAchievements).toEqual([]);
    expect(loaded?.player.combatStats).toEqual({
      criticalWins: 0,
      overdrivesUsed: 0,
      itemsUsed: 0,
      flawlessWins: 0,
      gauntletBestWave: 0,
    });
    expect(loaded?.player.dailyDirective).toBeNull();
  });

  it('migrates a v2 snapshot by attaching an empty preset list', () => {
    globalThis.localStorage.setItem(
      'pixel-evolution-arena.save',
      JSON.stringify({
        saveVersion: 2,
        savedAt: new Date().toISOString(),
        player: {
          coins: 700,
          dnaShards: 30,
          battlesFought: 8,
          battlesWon: 5,
          selectedMonsterId: MONSTERS[0].id,
          squadIds: [MONSTERS[0].id],
          inventory: ['Shadow Gem'],
          winStreak: 1,
          bestWinStreak: 3,
          claimedMilestones: [3],
        },
        monsters: [serializeMonsterProgress(MONSTERS[0])],
        battleLogs: [],
        lastReward: null,
        lastBattleThreat: null,
      }),
    );

    const service = new SaveStateService();
    const loaded = service.loadState();

    expect(loaded?.saveVersion).toBe(11);
    expect(loaded?.player.squadPresets).toEqual([]);
    expect(loaded?.player.winStreak).toBe(1);
    expect(loaded?.player.pinnedChaseId).toBeNull();
    expect(loaded?.player.claimedStageMilestones).toEqual([]);
  });

  it('migrates a v3 snapshot by filling in pin and stage-milestone defaults', () => {
    globalThis.localStorage.setItem(
      'pixel-evolution-arena.save',
      JSON.stringify({
        saveVersion: 3,
        savedAt: new Date().toISOString(),
        player: {
          coins: 900,
          dnaShards: 40,
          battlesFought: 12,
          battlesWon: 7,
          selectedMonsterId: MONSTERS[0].id,
          squadIds: [MONSTERS[0].id],
          inventory: [],
          winStreak: 0,
          bestWinStreak: 4,
          claimedMilestones: [3, 5],
          squadPresets: [],
        },
        monsters: [serializeMonsterProgress(MONSTERS[0])],
        battleLogs: [],
        lastReward: null,
        lastBattleThreat: null,
      }),
    );

    const service = new SaveStateService();
    const loaded = service.loadState();

    expect(loaded?.saveVersion).toBe(11);
    expect(loaded?.player.pinnedChaseId).toBeNull();
    expect(loaded?.player.claimedStageMilestones).toEqual([]);
    expect(loaded?.player.claimedMilestones).toEqual([3, 5]);
  });

  it('restores saved monster progress onto the base roster', () => {
    const service = new SaveStateService();
    const savedMonster = {
      ...serializeMonsterProgress(MONSTERS[0]),
      level: 7,
      xp: 44,
      unlocked: true,
    };

    const restored = service.restoreMonsters(MONSTERS, [savedMonster]);

    expect(restored[0].level).toBe(7);
    expect(restored[0].xp).toBe(44);
    expect(restored[1].evolutionTargets).toEqual(MONSTERS[1].evolutionTargets);
  });

  it('clears incompatible saves instead of loading them', () => {
    globalThis.localStorage.setItem(
      'pixel-evolution-arena.save',
      JSON.stringify({
        saveVersion: 99,
        savedAt: new Date().toISOString(),
        player: {},
        monsters: [],
        battleLogs: [],
      }),
    );

    const service = new SaveStateService();
    const loaded = service.loadState();

    expect(loaded).toBeNull();
    expect(globalThis.localStorage.getItem('pixel-evolution-arena.save')).toBeNull();
  });
});
