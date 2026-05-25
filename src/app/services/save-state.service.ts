import { Injectable, signal } from '@angular/core';
import { Monster } from '../models/monster.model';
import { SaveStateData, SaveStateSnapshot, SAVE_STATE_VERSION, SavedMonsterProgress } from '../models/save-state.model';

const SAVE_STORAGE_KEY = 'pixel-evolution-arena.save';

export type SaveSyncState = 'ready' | 'unsupported' | 'error';

@Injectable({ providedIn: 'root' })
export class SaveStateService {
  readonly saveVersion = SAVE_STATE_VERSION;
  readonly syncState = signal<SaveSyncState>('ready');
  readonly lastSavedAt = signal<string | null>(null);

  loadState(): SaveStateSnapshot | null {
    const storage = this.getStorage();
    if (!storage) {
      this.syncState.set('unsupported');
      return null;
    }

    try {
      const raw = storage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!isSaveStateSnapshot(parsed) || parsed.saveVersion !== SAVE_STATE_VERSION) {
        storage.removeItem(SAVE_STORAGE_KEY);
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      this.lastSavedAt.set(parsed.savedAt);
      this.syncState.set('ready');
      return parsed;
    } catch {
      this.syncState.set('error');
      return null;
    }
  }

  saveState(data: SaveStateData): SaveStateSnapshot | null {
    const storage = this.getStorage();
    if (!storage) {
      this.syncState.set('unsupported');
      return null;
    }

    const snapshot: SaveStateSnapshot = {
      ...data,
      saveVersion: SAVE_STATE_VERSION,
      savedAt: new Date().toISOString(),
    };

    try {
      storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(snapshot));
      this.lastSavedAt.set(snapshot.savedAt);
      this.syncState.set('ready');
      return snapshot;
    } catch {
      this.syncState.set('error');
      return null;
    }
  }

  clearState(): void {
    const storage = this.getStorage();
    if (!storage) {
      this.syncState.set('unsupported');
      return;
    }

    try {
      storage.removeItem(SAVE_STORAGE_KEY);
      this.lastSavedAt.set(null);
      this.syncState.set('ready');
    } catch {
      this.syncState.set('error');
    }
  }

  restoreMonsters(baseMonsters: Monster[], savedMonsters: SavedMonsterProgress[]): Monster[] {
    const savedById = new Map(savedMonsters.map((monster) => [monster.id, monster]));

    return baseMonsters.map((monster) => {
      const saved = savedById.get(monster.id);

      return saved
        ? {
            ...monster,
            unlocked: saved.unlocked,
            level: saved.level,
            xp: saved.xp,
            maxXp: saved.maxXp,
            attack: saved.attack,
            defense: saved.defense,
            speed: saved.speed,
            hp: saved.hp,
          }
        : { ...monster, evolutionTargets: [...monster.evolutionTargets] };
    });
  }

  private getStorage(): Storage | null {
    try {
      return 'localStorage' in globalThis ? globalThis.localStorage : null;
    } catch {
      return null;
    }
  }
}

function isSaveStateSnapshot(value: unknown): value is SaveStateSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SaveStateSnapshot>;
  return (
    typeof candidate.saveVersion === 'number' &&
    typeof candidate.savedAt === 'string' &&
    !!candidate.player &&
    Array.isArray(candidate.monsters) &&
    Array.isArray(candidate.battleLogs)
  );
}
