/**
 * Campaign chapters give the endless arena a spine: ordered objectives with
 * lore and one-time rewards. Objectives reuse existing player metrics so no
 * separate tracking is needed — the chapter just reads progress and pays out.
 */
export type CampaignMetric =
  | 'battlesWon'
  | 'unlockedCount'
  | 'bestWinStreak'
  | 'flawlessWins'
  | 'defeatedBosses'
  | 'stageMilestones'
  | 'gauntletBestWave';

export interface CampaignChapter {
  id: string;
  index: number;
  title: string;
  lore: string;
  objective: { metric: CampaignMetric; goal: number; label: string };
  reward: { coins: number; dnaShards: number; gearDefId?: string; lore: string };
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 'ch1-ignition',
    index: 1,
    title: 'Chapter 1 — Ignition',
    lore: 'The grid powers on. A first squad steps onto the arena floor.',
    objective: { metric: 'battlesWon', goal: 3, label: 'Win 3 arena battles' },
    reward: { coins: 200, dnaShards: 6, lore: 'The arena recognizes your signal.' },
  },
  {
    id: 'ch2-firstforge',
    index: 2,
    title: 'Chapter 2 — First Forge',
    lore: 'Salvaged cores hum in the fabricator. Time to build, not just fight.',
    objective: { metric: 'unlockedCount', goal: 8, label: 'Unlock 8 creatures' },
    reward: { coins: 320, dnaShards: 10, gearDefId: 'gear-core-edge', lore: 'A blueprint stabilizes: Edge Core forged.' },
  },
  {
    id: 'ch3-momentum',
    index: 3,
    title: 'Chapter 3 — Momentum',
    lore: 'Win after win, the crowd-noise of the grid rises.',
    objective: { metric: 'bestWinStreak', goal: 6, label: 'Reach a win streak of 6' },
    reward: { coins: 420, dnaShards: 12, gearDefId: 'gear-drive-pulse', lore: 'Tempo locked in: Pulse Drive forged.' },
  },
  {
    id: 'ch4-untouchable',
    index: 4,
    title: 'Chapter 4 — Untouchable',
    lore: 'True mastery is winning without a scratch.',
    objective: { metric: 'flawlessWins', goal: 5, label: 'Win 5 battles flawlessly' },
    reward: { coins: 520, dnaShards: 15, gearDefId: 'gear-plate-bastion', lore: 'An impervious stance: Bastion Plate forged.' },
  },
  {
    id: 'ch5-crownfall',
    index: 5,
    title: 'Chapter 5 — Crownfall',
    lore: 'The wardens of the loop stand between you and the deep grid.',
    objective: { metric: 'defeatedBosses', goal: 2, label: 'Defeat 2 distinct bosses' },
    reward: { coins: 760, dnaShards: 24, gearDefId: 'gear-relic-prism', lore: 'A crown shatters: Prism Relic forged.' },
  },
];
