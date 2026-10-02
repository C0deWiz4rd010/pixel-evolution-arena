import { Injectable, signal } from '@angular/core';
import { Monster } from '../models/monster.model';
import { SaveStateData, SaveStateSnapshot, SAVE_STATE_VERSION, SavedMonsterProgress } from '../models/save-state.model';
import { RESEARCH_NODE_IDS } from '../data/research.data';

const SAVE_STORAGE_KEY = 'pixel-evolution-arena.save';
const SAVE_BACKUP_KEY = 'pixel-evolution-arena.save-backup';
const LEGACY_BATTLE_SPEED_KEY = 'pea-battle-speed';

export type SaveSyncState = 'ready' | 'unsupported' | 'error';
/** Why the stored save could not be used; the raw data is kept as a backup. */
export type SaveLoadIssue = 'corrupt' | 'newer-version' | null;

@Injectable({ providedIn: 'root' })
export class SaveStateService {
  readonly saveVersion = SAVE_STATE_VERSION;
  readonly syncState = signal<SaveSyncState>('ready');
  readonly lastSavedAt = signal<string | null>(null);
  readonly loadIssue = signal<SaveLoadIssue>(null);

  loadState(): SaveStateSnapshot | null {
    const storage = this.getStorage();
    if (!storage) {
      this.syncState.set('unsupported');
      return null;
    }

    try {
      // Battle speed used to live under its own key; it is now part of player settings.
      storage.removeItem(LEGACY_BATTLE_SPEED_KEY);
      const raw = storage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      const result = this.parseSnapshot(parsed);
      if (!result.snapshot) {
        // Never silently destroy progress: keep the unreadable save next to a fresh start.
        storage.setItem(SAVE_BACKUP_KEY, raw);
        storage.removeItem(SAVE_STORAGE_KEY);
        this.loadIssue.set(result.issue);
        this.lastSavedAt.set(null);
        this.syncState.set('ready');
        return null;
      }

      this.lastSavedAt.set(result.snapshot.savedAt);
      this.syncState.set('ready');
      return result.snapshot;
    } catch {
      this.syncState.set('error');
      return null;
    }
  }

  /** Validate, migrate and sanitize any untrusted snapshot (local save or imported code). */
  parseSnapshot(value: unknown): { snapshot: SaveStateSnapshot | null; issue: SaveLoadIssue } {
    if (!isSaveStateSnapshot(value)) {
      return { snapshot: null, issue: 'corrupt' };
    }
    if (value.saveVersion > SAVE_STATE_VERSION) {
      return { snapshot: null, issue: 'newer-version' };
    }
    const migrated = migrateSnapshot(value);
    return migrated ? { snapshot: migrated, issue: null } : { snapshot: null, issue: 'corrupt' };
  }

  /** Raw JSON of the last save that could not be loaded, if one was kept. */
  readBackup(): string | null {
    try {
      return this.getStorage()?.getItem(SAVE_BACKUP_KEY) ?? null;
    } catch {
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
    const savedById = new Map(
      savedMonsters.filter((monster) => monster && typeof monster.id === 'string').map((monster) => [monster.id, monster]),
    );

    return baseMonsters.map((monster) => {
      const saved = savedById.get(monster.id);
      if (!saved) {
        return { ...monster, evolutionTargets: [...monster.evolutionTargets] };
      }
      // Untrusted numbers fall back to the roster baseline instead of poisoning stats with NaN.
      return {
        ...monster,
        unlocked: saved.unlocked === true,
        level: Math.round(finiteAtLeast(saved.level, 1, monster.level)),
        xp: finiteAtLeast(saved.xp, 0, 0),
        maxXp: finiteAtLeast(saved.maxXp, 1, monster.maxXp),
        attack: finiteAtLeast(saved.attack, 1, monster.attack),
        defense: finiteAtLeast(saved.defense, 1, monster.defense),
        speed: finiteAtLeast(saved.speed, 1, monster.speed),
        hp: finiteAtLeast(saved.hp, 1, monster.hp),
        prismatic: saved.prismatic === true,
      };
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

type SaveMigration = (snapshot: SaveStateSnapshot) => SaveStateSnapshot;

/**
 * Structural upgrades keyed by the version they upgrade FROM. Versions without an entry only
 * added optional fields, which `ensurePlayerDefaults` fills in after the chain has run.
 */
const SAVE_MIGRATIONS: Partial<Record<number, SaveMigration>> = {
  // v11 -> v12 introduced Bio-Data, scan progress and research nodes (all defaulted).
};

function migrateSnapshot(snapshot: SaveStateSnapshot): SaveStateSnapshot | null {
  if (snapshot.saveVersion < 1 || snapshot.saveVersion > SAVE_STATE_VERSION) {
    return null;
  }
  let current = snapshot;
  for (let version = snapshot.saveVersion; version < SAVE_STATE_VERSION; version++) {
    const step = SAVE_MIGRATIONS[version];
    current = { ...(step ? step(current) : current), saveVersion: version + 1 };
  }
  return ensurePlayerDefaults(current);
}

function ensurePlayerDefaults(snapshot: SaveStateSnapshot): SaveStateSnapshot {
  const player = snapshot.player as Partial<SaveStateSnapshot['player']>;
  return {
    ...snapshot,
    player: {
      coins: nonNegative(player.coins),
      dnaShards: nonNegative(player.dnaShards),
      battlesFought: nonNegative(player.battlesFought),
      battlesWon: nonNegative(player.battlesWon),
      selectedMonsterId: typeof player.selectedMonsterId === 'string' ? player.selectedMonsterId : null,
      squadIds: stringArray(player.squadIds),
      inventory: stringArray(player.inventory),
      winStreak: nonNegative(player.winStreak),
      bestWinStreak: nonNegative(player.bestWinStreak),
      claimedMilestones: Array.isArray(player.claimedMilestones) ? [...player.claimedMilestones] : [],
      squadPresets: Array.isArray(player.squadPresets)
        ? player.squadPresets.map((preset) => ({
            id: String(preset.id ?? ''),
            name: String(preset.name ?? ''),
            squadIds: stringArray(preset.squadIds),
          }))
        : [],
      pinnedChaseId: typeof player.pinnedChaseId === 'string' ? player.pinnedChaseId : null,
      claimedStageMilestones: Array.isArray(player.claimedStageMilestones)
        ? player.claimedStageMilestones.map((entry) => String(entry))
        : [],
      audioEnabled: typeof player.audioEnabled === 'boolean' ? player.audioEnabled : false,
      overdriveCharge: clamp(nonNegative(player.overdriveCharge), 0, 100),
      claimedAchievements: Array.isArray(player.claimedAchievements)
        ? player.claimedAchievements.map((entry) => String(entry))
        : [],
      combatStats: sanitizeCombatStats(player.combatStats),
      monsterMastery: sanitizeMonsterMastery(player.monsterMastery),
      dailyDirective: sanitizeDailyDirective(player.dailyDirective),
      recentBattles: sanitizeRecentBattles(player.recentBattles),
      ownedGear: Array.isArray(player.ownedGear)
        ? player.ownedGear
            .filter((entry) => entry && typeof entry.instanceId === 'string' && typeof entry.defId === 'string')
            .map((entry) => ({ instanceId: String(entry.instanceId), defId: String(entry.defId), tier: clamp(Number(entry.tier) || 1, 1, 5) }))
        : [],
      gearLoadout: sanitizeGearLoadout(player.gearLoadout),
      defeatedBosses: Array.isArray(player.defeatedBosses) ? player.defeatedBosses.map((entry) => String(entry)) : [],
      claimedChapters: Array.isArray(player.claimedChapters) ? player.claimedChapters.map((entry) => String(entry)) : [],
      encounteredEnemies: Array.isArray(player.encounteredEnemies) ? player.encounteredEnemies.map((entry) => String(entry)) : [],
      tutorialDone: player.tutorialDone === true,
      settings: sanitizeSettings(player.settings),
      expedition: sanitizeExpedition(player.expedition),
      expeditionCores: nonNegative(player.expeditionCores),
      bioData: nonNegative(player.bioData),
      totalBioData: nonNegative(player.totalBioData),
      scanProgress: sanitizeScanProgress(player.scanProgress),
      researchNodes: sanitizeResearchNodes(player.researchNodes),
    },
  };
}

function sanitizeScanProgress(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      result[id] = clamp(num, 0, 100);
    }
  }
  return result;
}

function sanitizeResearchNodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string' && RESEARCH_NODE_IDS.has(entry))));
}

function sanitizeExpedition(value: unknown): SaveStateSnapshot['player']['expedition'] {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<NonNullable<SaveStateSnapshot['player']['expedition']>>;
  if (!Array.isArray(candidate.map) || typeof candidate.seed !== 'number') {
    return null;
  }
  return value as SaveStateSnapshot['player']['expedition'];
}

function sanitizeGearLoadout(value: unknown): SaveStateSnapshot['player']['gearLoadout'] {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const result: SaveStateSnapshot['player']['gearLoadout'] = {};
  for (const [monsterId, slots] of Object.entries(value as Record<string, unknown>)) {
    if (!slots || typeof slots !== 'object') {
      continue;
    }
    const entry: Record<string, string> = {};
    for (const [slot, instanceId] of Object.entries(slots as Record<string, unknown>)) {
      if (typeof instanceId === 'string' && (slot === 'core' || slot === 'plate' || slot === 'drive' || slot === 'relic')) {
        entry[slot] = instanceId;
      }
    }
    result[monsterId] = entry;
  }
  return result;
}

function sanitizeSettings(value: unknown): SaveStateSnapshot['player']['settings'] {
  const candidate = (value ?? {}) as Partial<SaveStateSnapshot['player']['settings']>;
  const accent = candidate.accentTheme;
  const lang = candidate.language;
  const visualStyle = candidate.visualStyle;
  const typographyProfile = candidate.typographyProfile;
  return {
    masterVolume: typeof candidate.masterVolume === 'number' ? clamp(candidate.masterVolume, 0, 1) : 0.7,
    colorblindMode: candidate.colorblindMode === true,
    effectIntensity: typeof candidate.effectIntensity === 'number' ? clamp(candidate.effectIntensity, 0, 1) : 1,
    accentTheme: accent === 'ember' || accent === 'mono' ? accent : 'aurora',
    language: lang === 'de' ? 'de' : 'en',
    visualStyle:
      visualStyle === 'pixel-arcade' || visualStyle === 'tactical-minimal' ? visualStyle : 'collector-tech',
    typographyProfile:
      typographyProfile === 'pixel' || typographyProfile === 'tech-sans' ? typographyProfile : 'dual-font',
    combatBeats: candidate.combatBeats === true,
    battleControlMode:
      candidate.battleControlMode === 'assist' || candidate.battleControlMode === 'auto'
        ? candidate.battleControlMode
        : 'director',
    battleSpeed: candidate.battleSpeed === 2 || candidate.battleSpeed === 4 ? candidate.battleSpeed : 1,
    battleRecommendations: candidate.battleRecommendations !== false,
    motionMode: candidate.motionMode === 'reduced' ? 'reduced' : 'system',
    musicEnabled: candidate.musicEnabled === true,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Finite, non-negative number or 0 (rejects NaN, Infinity, strings and negatives). */
function nonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finiteAtLeast(value: unknown, min: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
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

function sanitizeMonsterMastery(value: unknown): SaveStateSnapshot['player']['monsterMastery'] {
  if (!value || typeof value !== 'object') return {};
  const result: SaveStateSnapshot['player']['monsterMastery'] = {};
  for (const [monsterId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Record<string, unknown>;
    result[monsterId] = {
      battleXp: Math.max(0, Number(candidate['battleXp']) || 0),
      signatureProgress: Math.max(0, Math.min(5, Number(candidate['signatureProgress']) || 0)),
      completedGoals: Array.isArray(candidate['completedGoals'])
        ? candidate['completedGoals'].map(String)
        : [],
      unlockedMoves: Array.isArray(candidate['unlockedMoves']) ? candidate['unlockedMoves'].map(String) : [],
    };
  }
  return result;
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

function sanitizeRecentBattles(value: unknown): SaveStateSnapshot['player']['recentBattles'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry): SaveStateSnapshot['player']['recentBattles'][number] => {
      const candidate = entry as Record<string, unknown>;
      const mode: SaveStateSnapshot['player']['recentBattles'][number]['mode'] =
        candidate['mode'] === 'gauntlet' ? 'gauntlet' : 'standard';
      const category: SaveStateSnapshot['player']['recentBattles'][number]['category'] =
        candidate['category'] === 'training' || candidate['category'] === 'risk'
          ? candidate['category']
          : 'standard';

      return {
        id: typeof candidate['id'] === 'string' ? candidate['id'] : `battle-${Math.random().toString(36).slice(2)}`,
        timestamp: typeof candidate['timestamp'] === 'string' ? candidate['timestamp'] : new Date(0).toISOString(),
        won: candidate['won'] === true,
        mode,
        category,
        formationName:
          typeof candidate['formationName'] === 'string' ? candidate['formationName'] : 'Unknown Formation',
        threatLabel: typeof candidate['threatLabel'] === 'string' ? candidate['threatLabel'] : 'Unknown Threat',
        teamPower: typeof candidate['teamPower'] === 'number' ? Math.max(0, candidate['teamPower']) : 0,
        enemyPower: typeof candidate['enemyPower'] === 'number' ? Math.max(0, candidate['enemyPower']) : 0,
        coins: typeof candidate['coins'] === 'number' ? Math.max(0, candidate['coins']) : 0,
        dnaShards: typeof candidate['dnaShards'] === 'number' ? Math.max(0, candidate['dnaShards']) : 0,
        xp: typeof candidate['xp'] === 'number' ? Math.max(0, candidate['xp']) : 0,
        streakAfter: typeof candidate['streakAfter'] === 'number' ? Math.max(0, candidate['streakAfter']) : 0,
        orders: Array.isArray(candidate['orders'])
          ? candidate['orders'].filter((order): order is 'focus' | 'protect' | 'charge' => order === 'focus' || order === 'protect' || order === 'charge').slice(0, 2)
          : [],
        pulse: candidate['pulse'] === 'break' || candidate['pulse'] === 'surge' ? candidate['pulse'] : 'guard',
        survivors: Array.isArray(candidate['survivors']) ? candidate['survivors'].filter((id): id is string => typeof id === 'string').slice(0, 3) : [],
        rounds: typeof candidate['rounds'] === 'number' ? Math.max(0, Math.min(8, Math.round(candidate['rounds']))) : 0,
        controlMode: candidate['controlMode'] === 'assist' || candidate['controlMode'] === 'auto' ? candidate['controlMode'] : 'director',
      };
    })
    .slice(0, 12);
}
