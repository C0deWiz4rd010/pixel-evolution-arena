import { DailyDirectiveState } from '../rules/daily.rules';
import { GearInstance, GearLoadout } from '../models/gear.model';
import { ExpeditionState } from '../models/expedition.model';

export interface SquadPreset {
  id: string;
  name: string;
  squadIds: string[];
}

export type AccentTheme = 'aurora' | 'ember' | 'mono';
export type LanguageCode = 'en' | 'de';
export type VisualStyle = 'collector-tech' | 'pixel-arcade' | 'tactical-minimal';
export type TypographyProfile = 'dual-font' | 'pixel' | 'tech-sans';

/** Player-tunable presentation + accessibility settings. */
export interface PlayerSettings {
  /** Master audio volume 0..1. */
  masterVolume: number;
  /** Force colorblind-safe type glyphs/labels. */
  colorblindMode: boolean;
  /** Scale decorative effect intensity 0..1 (1 = full). */
  effectIntensity: number;
  /** UI accent palette. */
  accentTheme: AccentTheme;
  /** UI language. */
  language: LanguageCode;
  /** Card geometry, surface, and effects profile. */
  visualStyle: VisualStyle;
  /** Display/body font pairing. */
  typographyProfile: TypographyProfile;
  /** Enable the optional Active Combat Beat timing prompt. */
  combatBeats: boolean;
}

/** Cumulative combat stats that feed medals. */
export interface CombatStats {
  criticalWins: number;
  overdrivesUsed: number;
  itemsUsed: number;
  flawlessWins: number;
  gauntletBestWave: number;
}

export type RecentBattleMode = 'standard' | 'gauntlet';
export type RecentBattleCategory = 'training' | 'standard' | 'risk';

export interface RecentBattleRecord {
  id: string;
  timestamp: string;
  won: boolean;
  mode: RecentBattleMode;
  category: RecentBattleCategory;
  formationName: string;
  threatLabel: string;
  teamPower: number;
  enemyPower: number;
  coins: number;
  dnaShards: number;
  xp: number;
  streakAfter: number;
}

export interface PlayerState {
  coins: number;
  dnaShards: number;
  battlesFought: number;
  battlesWon: number;
  selectedMonsterId: string | null;
  squadIds: string[];
  inventory: string[];
  winStreak: number;
  bestWinStreak: number;
  claimedMilestones: number[];
  squadPresets: SquadPreset[];
  pinnedChaseId: string | null;
  claimedStageMilestones: string[];
  audioEnabled: boolean;
  /** Overdrive charge from 0..100. */
  overdriveCharge: number;
  /** Claimed medal IDs. */
  claimedAchievements: string[];
  combatStats: CombatStats;
  /** Current daily directive, or null before the first roll. */
  dailyDirective: DailyDirectiveState | null;
  /** Most recent arena run records, newest first. */
  recentBattles: RecentBattleRecord[];
  /** Forged gear instances the player owns. */
  ownedGear: GearInstance[];
  /** monsterId -> slot -> gear instanceId. */
  gearLoadout: GearLoadout;
  /** Boss IDs the player has defeated (Boss Codex). */
  defeatedBosses: string[];
  /** Campaign chapter IDs the player has cleared + claimed. */
  claimedChapters: string[];
  /** Enemy IDs encountered at least once (bestiary). */
  encounteredEnemies: string[];
  /** First-run onboarding completed/dismissed. */
  tutorialDone: boolean;
  /** Presentation + accessibility settings. */
  settings: PlayerSettings;
  /** Active Expedition run, or null when not in a run. */
  expedition: ExpeditionState | null;
  /** Meta-currency banked from Expedition clears. */
  expeditionCores: number;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  masterVolume: 0.7,
  colorblindMode: false,
  effectIntensity: 1,
  accentTheme: 'aurora',
  language: 'en',
  visualStyle: 'collector-tech',
  typographyProfile: 'dual-font',
  combatBeats: false,
};
