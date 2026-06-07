import { RecentBattleCategory, RecentBattleMode, RecentBattleRecord } from '../models/player-state.model';

export interface BattleIntelSummary {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  averageCoins: number;
  averageXp: number;
  trend: 'empty' | 'hot' | 'steady' | 'cold';
  trendLabel: string;
  preferredMode: RecentBattleMode | null;
  preferredCategory: RecentBattleCategory | null;
}

export function summarizeBattleRecords(records: readonly RecentBattleRecord[]): BattleIntelSummary {
  if (records.length === 0) {
    return {
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageCoins: 0,
      averageXp: 0,
      trend: 'empty',
      trendLabel: 'No combat data',
      preferredMode: null,
      preferredCategory: null,
    };
  }

  const wins = records.filter((record) => record.won).length;
  const losses = records.length - wins;
  const averageCoins = Math.round(records.reduce((sum, record) => sum + record.coins, 0) / records.length);
  const averageXp = Math.round(records.reduce((sum, record) => sum + record.xp, 0) / records.length);
  const recentWindow = records.slice(0, Math.min(4, records.length));
  const recentWins = recentWindow.filter((record) => record.won).length;
  const trend = resolveTrend(recentWindow.length, recentWins);

  return {
    total: records.length,
    wins,
    losses,
    winRate: Math.round((wins / records.length) * 100),
    averageCoins,
    averageXp,
    trend,
    trendLabel: trendMessage(trend, recentWins, recentWindow.length),
    preferredMode: mostCommon(records.map((record) => record.mode)),
    preferredCategory: mostCommon(records.map((record) => record.category)),
  };
}

function resolveTrend(total: number, wins: number): BattleIntelSummary['trend'] {
  if (total === 0) {
    return 'empty';
  }
  if (wins >= Math.max(3, total - 1)) {
    return 'hot';
  }
  if (wins * 2 <= total) {
    return 'cold';
  }
  return 'steady';
}

function trendMessage(trend: BattleIntelSummary['trend'], wins: number, total: number): string {
  switch (trend) {
    case 'hot':
      return `${wins}/${total} recent wins. Push value runs while the squad is hot.`;
    case 'cold':
      return `${wins}/${total} recent wins. Stabilize with drills, guard, or a cleaner squad shell.`;
    case 'steady':
      return `${wins}/${total} recent wins. The loop is stable but still improvable.`;
    default:
      return 'No combat data';
  }
}

function mostCommon<T extends string>(values: readonly T[]): T | null {
  if (values.length === 0) {
    return null;
  }
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}
