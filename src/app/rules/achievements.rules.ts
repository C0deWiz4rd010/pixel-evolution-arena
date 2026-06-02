import { ACHIEVEMENTS, AchievementDef, AchievementMetric } from '../data/achievements.data';

export interface AchievementMetrics {
  battlesWon: number;
  bestWinStreak: number;
  unlockedCount: number;
  stageMilestones: number;
  criticalWins: number;
  overdrivesUsed: number;
  itemsUsed: number;
  flawlessWins: number;
  gauntletBestWave: number;
}

export interface AchievementProgress {
  def: AchievementDef;
  current: number;
  complete: boolean;
  claimed: boolean;
}

function metricValue(metrics: AchievementMetrics, metric: AchievementMetric): number {
  return metrics[metric] ?? 0;
}

export function evaluateAchievements(metrics: AchievementMetrics, claimed: readonly string[]): AchievementProgress[] {
  return ACHIEVEMENTS.map((def) => {
    const current = metricValue(metrics, def.metric);
    return {
      def,
      current,
      complete: current >= def.goal,
      claimed: claimed.includes(def.id),
    };
  });
}

/** Erfüllte, aber noch nicht eingelöste Erfolge (zum Auszahlen + Toasten). */
export function findNewlyCompleted(metrics: AchievementMetrics, claimed: readonly string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => metricValue(metrics, def.metric) >= def.goal && !claimed.includes(def.id));
}

export function countClaimable(metrics: AchievementMetrics, claimed: readonly string[]): number {
  return findNewlyCompleted(metrics, claimed).length;
}

export function totalAchievements(): number {
  return ACHIEVEMENTS.length;
}
