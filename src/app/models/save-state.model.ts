import { BattleLog, BattleReward } from './battle.model';
import { Monster } from './monster.model';
import { PlayerState } from './player-state.model';
import { ArenaThreatProfile } from '../rules/battle.rules';

export const SAVE_STATE_VERSION = 9;

export interface SavedMonsterProgress {
  id: string;
  unlocked: boolean;
  level: number;
  xp: number;
  maxXp: number;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  prismatic?: boolean;
}

export interface SaveStateData {
  player: PlayerState;
  monsters: SavedMonsterProgress[];
  battleLogs: BattleLog[];
  lastReward: BattleReward | null;
  lastBattleThreat: ArenaThreatProfile | null;
}

export interface SaveStateSnapshot extends SaveStateData {
  saveVersion: number;
  savedAt: string;
}

export function serializeMonsterProgress(monster: Monster): SavedMonsterProgress {
  return {
    id: monster.id,
    unlocked: monster.unlocked,
    level: monster.level,
    xp: monster.xp,
    maxXp: monster.maxXp,
    attack: monster.attack,
    defense: monster.defense,
    speed: monster.speed,
    hp: monster.hp,
    prismatic: monster.prismatic === true,
  };
}
