import { DailyDirectiveState } from '../rules/daily.rules';

export interface SquadPreset {
  id: string;
  name: string;
  squadIds: string[];
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
}
