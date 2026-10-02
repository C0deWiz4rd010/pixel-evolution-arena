import { MONSTERS } from '../data/monsters.data';
import { BattleLog } from '../models/battle.model';
import { Monster, MonsterRarity } from '../models/monster.model';
import { CombatStats, DEFAULT_SETTINGS, PlayerState } from '../models/player-state.model';

/*
 * Starter state, deep-clone helpers and pure save utilities shared by the game stores.
 * Nothing in here touches Angular; every function is deterministic and unit-testable.
 */

export const STARTER_PLAYER_STATE: PlayerState = {
  coins: 1200,
  dnaShards: 45,
  battlesFought: 0,
  battlesWon: 0,
  selectedMonsterId: 'M007',
  squadIds: ['M007', 'M008'],
  inventory: ['Shadow Gem', 'Ancient Gear'],
  winStreak: 0,
  bestWinStreak: 0,
  claimedMilestones: [],
  squadPresets: [],
  pinnedChaseId: null,
  claimedStageMilestones: [],
  audioEnabled: false,
  overdriveCharge: 0,
  claimedAchievements: [],
  combatStats: { criticalWins: 0, overdrivesUsed: 0, itemsUsed: 0, flawlessWins: 0, gauntletBestWave: 0 },
  monsterMastery: {},
  dailyDirective: null,
  recentBattles: [],
  ownedGear: [],
  gearLoadout: {},
  defeatedBosses: [],
  claimedChapters: [],
  encounteredEnemies: [],
  tutorialDone: false,
  settings: { ...DEFAULT_SETTINGS },
  expedition: null,
  expeditionCores: 0,
  bioData: 0,
  totalBioData: 0,
  scanProgress: {},
  researchNodes: [],
};

export const STARTER_COMBAT_STATS: CombatStats = { criticalWins: 0, overdrivesUsed: 0, itemsUsed: 0, flawlessWins: 0, gauntletBestWave: 0 };

export const MAX_SQUAD_PRESETS = 3;
export const MAX_LOADOUT = 2;
export const STAGE_MILESTONE_REWARD = { coins: 200, dnaShards: 10 } as const;
export const MAX_RECENT_BATTLES = 12;

export const STARTER_BATTLE_LOGS: BattleLog[] = [
  { text: 'Digital arena online. Build your squad and start a battle.', type: 'system' },
  { text: 'Tip: Aquabun can evolve early if you spend starter resources.', type: 'info' },
];

export const STARTER_MONSTERS: Monster[] = MONSTERS.map(cloneMonster);
export const STARTER_MONSTER_IDS = new Set(STARTER_MONSTERS.map((monster) => monster.id));

export function createStarterMonsters(): Monster[] {
  return STARTER_MONSTERS.map(cloneMonster);
}

export function createStarterPlayerState(): PlayerState {
  return clonePlayerState(STARTER_PLAYER_STATE);
}

export function createStarterBattleLogs(): BattleLog[] {
  return cloneBattleLogs(STARTER_BATTLE_LOGS);
}

export function cloneMonster(monster: Monster): Monster {
  return {
    ...monster,
    evolutionTargets: [...monster.evolutionTargets],
  };
}

export function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    squadIds: [...player.squadIds],
    inventory: [...player.inventory],
    claimedMilestones: [...player.claimedMilestones],
    squadPresets: player.squadPresets.map((preset) => ({ ...preset, squadIds: [...preset.squadIds] })),
    claimedStageMilestones: [...player.claimedStageMilestones],
    claimedAchievements: [...player.claimedAchievements],
    combatStats: { ...player.combatStats },
    monsterMastery: cloneMonsterMastery(player.monsterMastery ?? {}),
    dailyDirective: player.dailyDirective ? { ...player.dailyDirective } : null,
    recentBattles: player.recentBattles.map((entry) => ({ ...entry })),
    ownedGear: player.ownedGear.map((entry) => ({ ...entry })),
    gearLoadout: cloneGearLoadout(player.gearLoadout),
    defeatedBosses: [...player.defeatedBosses],
    claimedChapters: [...player.claimedChapters],
    encounteredEnemies: [...player.encounteredEnemies],
    tutorialDone: player.tutorialDone,
    settings: { ...player.settings },
    expedition: player.expedition ? cloneExpedition(player.expedition) : null,
    expeditionCores: player.expeditionCores,
    bioData: player.bioData,
    totalBioData: player.totalBioData,
    scanProgress: { ...player.scanProgress },
    researchNodes: [...player.researchNodes],
  };
}

export function cloneExpedition(state: NonNullable<PlayerState['expedition']>): NonNullable<PlayerState['expedition']> {
  return {
    ...state,
    relicIds: [...state.relicIds],
    reachableIds: [...state.reachableIds],
    map: state.map.map((node) => ({ ...node, nextIds: [...node.nextIds] })),
  };
}

export function cloneGearLoadout(loadout: PlayerState['gearLoadout']): PlayerState['gearLoadout'] {
  const result: PlayerState['gearLoadout'] = {};
  for (const [monsterId, slots] of Object.entries(loadout)) {
    result[monsterId] = { ...slots };
  }
  return result;
}

export function cloneMonsterMastery(mastery: PlayerState['monsterMastery']): PlayerState['monsterMastery'] {
  return Object.fromEntries(
    Object.entries(mastery).map(([monsterId, progress]) => [
      monsterId,
      {
        battleXp: Math.max(0, progress.battleXp ?? 0),
        signatureProgress: Math.max(0, Math.min(5, progress.signatureProgress ?? 0)),
        completedGoals: [...(progress.completedGoals ?? [])],
        unlockedMoves: [...(progress.unlockedMoves ?? [])],
      },
    ]),
  );
}

export function cloneBattleLogs(logs: BattleLog[]): BattleLog[] {
  return logs.map((log) => ({ ...log }));
}

/**
 * Bind an already structurally sanitized player (see SaveStateService.parseSnapshot) to the
 * current roster: drop ids that no longer exist so stale saves cannot reference ghost creatures.
 */
export function sanitizePlayerState(player: PlayerState): PlayerState {
  const known = (id: string | null | undefined): id is string => !!id && STARTER_MONSTER_IDS.has(id);
  const cloned = clonePlayerState(player);
  return {
    ...cloned,
    selectedMonsterId: known(player.selectedMonsterId) ? player.selectedMonsterId : STARTER_PLAYER_STATE.selectedMonsterId,
    squadIds: Array.from(new Set(cloned.squadIds.filter(known))).slice(0, 3),
    squadPresets: cloned.squadPresets
      .map((preset) => ({ ...preset, squadIds: preset.squadIds.filter(known).slice(0, 3) }))
      .slice(0, 3),
    pinnedChaseId: known(player.pinnedChaseId) ? player.pinnedChaseId : null,
    bestWinStreak: Math.max(cloned.bestWinStreak, cloned.winStreak),
    combatStats: { ...STARTER_COMBAT_STATS, ...cloned.combatStats },
    recentBattles: cloned.recentBattles.slice(0, MAX_RECENT_BATTLES),
    gearLoadout: Object.fromEntries(Object.entries(cloned.gearLoadout).filter(([monsterId]) => known(monsterId))),
    monsterMastery: Object.fromEntries(Object.entries(cloned.monsterMastery).filter(([monsterId]) => known(monsterId))),
    scanProgress: Object.fromEntries(Object.entries(cloned.scanProgress).filter(([monsterId]) => known(monsterId))),
  };
}

export function hasProgressBeyondStarter(player: PlayerState, monsters: Monster[]): boolean {
  if (
    player.coins !== STARTER_PLAYER_STATE.coins ||
    player.dnaShards !== STARTER_PLAYER_STATE.dnaShards ||
    player.battlesFought !== STARTER_PLAYER_STATE.battlesFought ||
    player.battlesWon !== STARTER_PLAYER_STATE.battlesWon ||
    player.selectedMonsterId !== STARTER_PLAYER_STATE.selectedMonsterId ||
    player.squadIds.join('|') !== STARTER_PLAYER_STATE.squadIds.join('|') ||
    player.inventory.join('|') !== STARTER_PLAYER_STATE.inventory.join('|') ||
    (player.winStreak ?? 0) !== 0 ||
    (player.bestWinStreak ?? 0) !== 0 ||
    (player.claimedMilestones?.length ?? 0) > 0 ||
    (player.squadPresets?.length ?? 0) > 0 ||
    player.pinnedChaseId !== null ||
    (player.claimedStageMilestones?.length ?? 0) > 0 ||
    player.audioEnabled !== STARTER_PLAYER_STATE.audioEnabled ||
    (player.overdriveCharge ?? 0) !== 0 ||
    (player.claimedAchievements?.length ?? 0) > 0 ||
    (player.recentBattles?.length ?? 0) > 0 ||
    hasCombatProgress(player.combatStats) ||
    (player.ownedGear?.length ?? 0) > 0 ||
    (player.defeatedBosses?.length ?? 0) > 0 ||
    (player.claimedChapters?.length ?? 0) > 0 ||
    (player.expeditionCores ?? 0) > 0 ||
    player.expedition != null ||
    (player.dailyDirective ? player.dailyDirective.progress > 0 || player.dailyDirective.claimed : false)
  ) {
    return true;
  }

  return monsters.some((monster, index) => {
    const starter = STARTER_MONSTERS[index];
    return (
      monster.unlocked !== starter.unlocked ||
      monster.level !== starter.level ||
      monster.xp !== starter.xp ||
      monster.maxXp !== starter.maxXp ||
      monster.attack !== starter.attack ||
      monster.defense !== starter.defense ||
      monster.speed !== starter.speed ||
      monster.hp !== starter.hp ||
      (monster.prismatic === true) !== (starter.prismatic === true)
    );
  });
}

export function hasCombatProgress(stats: PlayerState['combatStats'] | undefined): boolean {
  if (!stats) {
    return false;
  }
  return (
    (stats.criticalWins ?? 0) > 0 ||
    (stats.overdrivesUsed ?? 0) > 0 ||
    (stats.itemsUsed ?? 0) > 0 ||
    (stats.flawlessWins ?? 0) > 0 ||
    (stats.gauntletBestWave ?? 0) > 0
  );
}

export function rarityWeight(rarity: MonsterRarity): number {
  const weights: Record<MonsterRarity, number> = {
    Common: 4,
    Rare: 3,
    Epic: 2,
    Legendary: 1,
  };

  return weights[rarity];
}

export function nodeHash(nodeId: string): number {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i += 1) {
    hash = (Math.imul(hash, 31) + nodeId.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64Decode(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function formatSaveTimestamp(savedAt: string | null): string {
  if (!savedAt) {
    return 'Starter sync';
  }

  const timestamp = new Date(savedAt);
  if (Number.isNaN(timestamp.getTime())) {
    return 'Pending sync';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}
