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

    expect(snapshot?.saveVersion).toBe(1);
    expect(service.syncState()).toBe('ready');

    const loaded = service.loadState();
    expect(loaded?.player.coins).toBe(999);
    expect(loaded?.battleLogs[0].text).toBe('Saved battle log.');
    expect(service.lastSavedAt()).toBeTypeOf('string');
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
