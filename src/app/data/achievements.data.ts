/**
 * Erfolge/Medaillen — Meta-Progression über die Win-Milestones hinaus.
 * Metriken werden aus dem bestehenden PlayerState + combatStats abgeleitet
 * ({@link ../rules/achievements.rules}).
 */
export type AchievementMetric =
  | 'battlesWon'
  | 'bestWinStreak'
  | 'unlockedCount'
  | 'stageMilestones'
  | 'criticalWins'
  | 'overdrivesUsed'
  | 'itemsUsed'
  | 'flawlessWins'
  | 'gauntletBestWave';

export interface AchievementDef {
  id: string;
  label: string;
  detail: string;
  icon: string;
  metric: AchievementMetric;
  goal: number;
  reward: { coins: number; dnaShards: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-blood', label: 'First Contact', detail: 'Gewinne deinen ersten Arena-Kampf.', icon: '✦', metric: 'battlesWon', goal: 1, reward: { coins: 80, dnaShards: 2 } },
  { id: 'veteran', label: 'Arena Veteran', detail: 'Gewinne 25 Kämpfe.', icon: '✦', metric: 'battlesWon', goal: 25, reward: { coins: 320, dnaShards: 10 } },
  { id: 'centurion', label: 'Centurion', detail: 'Gewinne 100 Kämpfe.', icon: '✦', metric: 'battlesWon', goal: 100, reward: { coins: 900, dnaShards: 30 } },
  { id: 'streak-5', label: 'On a Roll', detail: 'Erreiche eine Siegesserie von 5.', icon: '⥣', metric: 'bestWinStreak', goal: 5, reward: { coins: 200, dnaShards: 6 } },
  { id: 'streak-15', label: 'Unstoppable', detail: 'Erreiche eine Siegesserie von 15.', icon: '⥣', metric: 'bestWinStreak', goal: 15, reward: { coins: 600, dnaShards: 18 } },
  { id: 'collector-25', label: 'Field Collector', detail: 'Schalte 25 Kreaturen frei.', icon: '◈', metric: 'unlockedCount', goal: 25, reward: { coins: 260, dnaShards: 8 } },
  { id: 'collector-50', label: 'Archive Curator', detail: 'Schalte 50 Kreaturen frei.', icon: '◈', metric: 'unlockedCount', goal: 50, reward: { coins: 700, dnaShards: 22 } },
  { id: 'stage-3', label: 'Tier Climber', detail: 'Schließe 3 Stage-Milestones ab.', icon: '▲', metric: 'stageMilestones', goal: 3, reward: { coins: 400, dnaShards: 12 } },
  { id: 'crit-10', label: 'Overload Expert', detail: 'Lande 10 kritische Siege.', icon: '⚡', metric: 'criticalWins', goal: 10, reward: { coins: 300, dnaShards: 9 } },
  { id: 'overdrive-5', label: 'Overdrive Adept', detail: 'Setze den Overdrive 5-mal ein.', icon: '◉', metric: 'overdrivesUsed', goal: 5, reward: { coins: 240, dnaShards: 7 } },
  { id: 'tactician', label: 'Field Tactician', detail: 'Setze 10 Kampf-Items ein.', icon: '◆', metric: 'itemsUsed', goal: 10, reward: { coins: 220, dnaShards: 7 } },
  { id: 'flawless-10', label: 'Untouchable', detail: 'Gewinne 10 Kämpfe makellos (ohne Verlust).', icon: '❖', metric: 'flawlessWins', goal: 10, reward: { coins: 360, dnaShards: 11 } },
  { id: 'gauntlet-10', label: 'Gauntlet Diver', detail: 'Erreiche Welle 10 im Endlos-Gauntlet.', icon: '∞', metric: 'gauntletBestWave', goal: 10, reward: { coins: 500, dnaShards: 16 } },
];
