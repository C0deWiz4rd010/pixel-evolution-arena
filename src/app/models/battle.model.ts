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

export interface BattleReward {
  coins: number;
  dnaShards: number;
  xp: number;
  item?: string;
  won: boolean;
}
