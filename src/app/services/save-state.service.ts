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
      if (!isSaveStateSnapshot(parsed)) {
        storage.removeItem(SAVE_STORAGE_KEY);
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      const migrated = migrateSnapshot(parsed);
      if (!migrated) {
        storage.removeItem(SAVE_STORAGE_KEY);
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      this.lastSavedAt.set(migrated.savedAt);
      this.syncState.set('ready');
      return migrated;
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

function migrateSnapshot(snapshot: SaveStateSnapshot): SaveStateSnapshot | null {
  if (snapshot.saveVersion === SAVE_STATE_VERSION) {
    return ensurePlayerDefaults(snapshot);
  }

  if (snapshot.saveVersion >= 1 && snapshot.saveVersion < SAVE_STATE_VERSION) {
    return ensurePlayerDefaults({ ...snapshot, saveVersion: SAVE_STATE_VERSION });
  }

  return null;
}

function ensurePlayerDefaults(snapshot: SaveStateSnapshot): SaveStateSnapshot {
  const player = snapshot.player as Partial<SaveStateSnapshot['player']>;
  return {
    ...snapshot,
    player: {
      coins: typeof player.coins === 'number' ? player.coins : 0,
      dnaShards: typeof player.dnaShards === 'number' ? player.dnaShards : 0,
      battlesFought: typeof player.battlesFought === 'number' ? player.battlesFought : 0,
      battlesWon: typeof player.battlesWon === 'number' ? player.battlesWon : 0,
      selectedMonsterId: player.selectedMonsterId ?? null,
      squadIds: Array.isArray(player.squadIds) ? [...player.squadIds] : [],
      inventory: Array.isArray(player.inventory) ? [...player.inventory] : [],
      winStreak: typeof player.winStreak === 'number' ? player.winStreak : 0,
      bestWinStreak: typeof player.bestWinStreak === 'number' ? player.bestWinStreak : 0,
      claimedMilestones: Array.isArray(player.claimedMilestones) ? [...player.claimedMilestones] : [],
      squadPresets: Array.isArray(player.squadPresets)
        ? player.squadPresets.map((preset) => ({
            id: String(preset.id ?? ''),
            name: String(preset.name ?? ''),
            squadIds: Array.isArray(preset.squadIds) ? [...preset.squadIds] : [],
          }))
        : [],
      pinnedChaseId: typeof player.pinnedChaseId === 'string' ? player.pinnedChaseId : null,
      claimedStageMilestones: Array.isArray(player.claimedStageMilestones)
        ? player.claimedStageMilestones.map((entry) => String(entry))
        : [],
      audioEnabled: typeof player.audioEnabled === 'boolean' ? player.audioEnabled : false,
      overdriveCharge: typeof player.overdriveCharge === 'number' ? clamp(player.overdriveCharge, 0, 100) : 0,
      claimedAchievements: Array.isArray(player.claimedAchievements)
        ? player.claimedAchievements.map((entry) => String(entry))
        : [],
      combatStats: sanitizeCombatStats(player.combatStats),
      dailyDirective: sanitizeDailyDirective(player.dailyDirective),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeCombatStats(stats: unknown): SaveStateSnapshot['player']['combatStats'] {
  const candidate = (stats ?? {}) as Partial<SaveStateSnapshot['player']['combatStats']>;
  const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0);
  return {
    criticalWins: num(candidate.criticalWins),
    overdrivesUsed: num(candidate.overdrivesUsed),
    itemsUsed: num(candidate.itemsUsed),
    flawlessWins: num(candidate.flawlessWins),
    gauntletBestWave: num(candidate.gauntletBestWave),
  };
}

function sanitizeDailyDirective(directive: unknown): SaveStateSnapshot['player']['dailyDirective'] {
  if (!directive || typeof directive !== 'object') {
    return null;
  }
  const candidate = directive as Partial<NonNullable<SaveStateSnapshot['player']['dailyDirective']>>;
  if (typeof candidate.dateKey !== 'string' || typeof candidate.objectiveId !== 'string') {
    return null;
  }
  return {
    dateKey: candidate.dateKey,
    objectiveId: candidate.objectiveId,
    progress: typeof candidate.progress === 'number' ? Math.max(0, candidate.progress) : 0,
    claimed: candidate.claimed === true,
  };
}
