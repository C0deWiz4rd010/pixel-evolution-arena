import { BattleReward } from '../models/battle.model';
import { Monster } from '../models/monster.model';
import { RequirementStatus } from '../rules/evolution.rules';

export interface ArenaRunDirective {
  title: string;
  objective: string;
  rewardFocus: string;
  tacticalHint: string;
}

export type GameSectionName =
  | 'Evolution Tree'
  | 'Squad'
  | 'Forge'
  | 'Arena'
  | 'Expedition'
  | 'Collection'
  | 'Research'
  | 'Campaign'
  | 'Medals'
  | 'Handbook'
  | 'Settings';

export interface EvolutionCandidate {
  target: Monster;
  source: Monster | null;
  requirements: RequirementStatus[];
  missing: RequirementStatus[];
  ready: boolean;
  percent: number;
  score: number;
}

export interface NextCommand {
  tab: GameSectionName;
  status: string;
  title: string;
  detail: string;
  actionLabel: string;
  tone: 'blocked' | 'ready' | 'battle' | 'squad' | 'collection' | 'meta';
}

export interface ArenaRewardForecast {
  win: BattleReward;
  loss: BattleReward;
  itemChancePercent: number;
  multiplier: number;
  nextStreak: number;
  streakBonus: StreakBonusPreview;
}

export interface StreakBonusPreview {
  coins: number;
  xp: number;
}

export interface BattleMilestonePreview {
  threshold: number;
  winsNeeded: number;
  label: string;
}

export interface ArenaMomentumPanel {
  title: string;
  status: string;
  detail: string;
  meterPercent: number;
  nextGoalLabel: string;
  rewardHint: string;
  tone: 'blocked' | 'building' | 'hot' | 'charged' | 'risk';
}

export interface ArenaObjectiveCard {
  label: string;
  value: string;
  detail: string;
  progressPercent: number;
  tone: 'daily' | 'evolution' | 'milestone';
}

export interface RouteStatusChip {
  status: string;
  detail: string;
  metric: string;
  tone: 'ready' | 'train' | 'clear';
}
