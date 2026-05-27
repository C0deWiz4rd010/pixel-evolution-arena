export interface SquadPreset {
  id: string;
  name: string;
  squadIds: string[];
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
}
