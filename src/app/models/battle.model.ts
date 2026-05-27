import { MonsterType } from './monster.model';

export interface BattleLog {
  text: string;
  type: 'info' | 'damage' | 'reward' | 'system';
}

export interface EnemyMonster {
  id: string;
  name: string;
  icon: string;
  spriteUrl?: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  type: MonsterType;
}

export type ArenaTier = 'Scout' | 'Standard' | 'Elite' | 'Boss';

export interface ArenaFormation {
  id: string;
  name: string;
  tier: ArenaTier;
  objective: string;
  rewardFocus: string;
  tacticalHint: string;
  enemyModifier: number;
  rewardModifier: number;
  itemBonus: number;
  enemies: EnemyMonster[];
}

export interface BattleReward {
  coins: number;
  dnaShards: number;
  xp: number;
  item?: string;
  won: boolean;
  streakBonusCoins?: number;
  streakBonusXp?: number;
  streakAfter?: number;
  milestoneLabel?: string;
  lossHint?: string;
}
