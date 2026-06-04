import { DailyDirectiveState } from '../rules/daily.rules';
import { GearInstance, GearLoadout } from '../models/gear.model';

export interface SquadPreset {
  id: string;
  name: string;
  squadIds: string[];
}

/** Player-tunable presentation + accessibility settings. */
export interface PlayerSettings {
  /** Master audio volume 0..1. */
  masterVolume: number;
  /** Force colorblind-safe type glyphs/labels. */
  colorblindMode: boolean;
  /** Scale decorative effect intensity 0..1 (1 = full). */
  effectIntensity: number;
}

/** Cumulative combat stats that feed medals. */
export interface CombatStats {
  criticalWins: number;
  overdrivesUsed: number;
  itemsUsed: number;
  flawlessWins: number;
  gauntletBestWave: number;
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
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  masterVolume: 0.7,
  colorblindMode: false,
  effectIntensity: 1,
};
