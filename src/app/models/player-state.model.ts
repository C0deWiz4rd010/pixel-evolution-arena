export interface PlayerState {
  coins: number;
  dnaShards: number;
  battlesFought: number;
  battlesWon: number;
  selectedMonsterId: string | null;
  squadIds: string[];
  inventory: string[];
}
