import { BattleEvent } from './combat.engine';
import { Monster, MonsterType } from '../models/monster.model';
import { MonsterMasteryProgress } from '../models/player-state.model';
import { TacticalPulseChoice, getTacticalPulseOption } from './tactical-pulse.rules';

export interface MonsterMasteryGoal {
  id: string;
  label: string;
  target: number;
}

export interface BattleMasteryAward {
  monsterId: string;
  monsterName: string;
  type: MonsterType;
  points: number;
  total: number;
  signatureProgress: number;
  goal: MonsterMasteryGoal;
  goalCompleted: boolean;
  unlockedMove: string | null;
}

const MOVE_UNLOCKS: Record<MonsterType, string> = {
  Water: 'Aqua Guard',
  Nature: 'Root Ward',
  Fire: 'Heat Drive',
  Dark: 'Void Feint',
  Light: 'Prism Guard',
  Machine: 'Servo Lock',
  Beast: 'Pack Rush',
  Toxic: 'Venom Shell',
};

export const MASTERY_MOVE_THRESHOLD = 25;
export const SIGNATURE_GOAL = 5;

export function emptyMonsterMastery(): MonsterMasteryProgress {
  return { battleXp: 0, signatureProgress: 0, completedGoals: [], unlockedMoves: [] };
}

export function masteryGoalFor(monster: Monster): MonsterMasteryGoal {
  if (monster.type === 'Nature' || monster.type === 'Toxic' || monster.type === 'Machine') {
    return { id: `${monster.type.toLowerCase()}-status`, label: `Apply a ${monster.type} status`, target: 1 };
  }
  return { id: `${monster.type.toLowerCase()}-hits`, label: `Land 2 ${monster.type} hits`, target: 2 };
}

export function goalProgress(monster: Monster, events: BattleEvent[]): number {
  const relevant = events.filter((event) => event.actorName === monster.name && event.side === 'player');
  const goal = masteryGoalFor(monster);
  if (goal.id.endsWith('-status')) {
    return relevant.filter((event) => event.kind === 'status-apply' || event.kind === 'shield').length;
  }
  return relevant.filter(
    (event) =>
      (event.kind === 'strike' || event.kind === 'overdrive') &&
      event.moveType === monster.type &&
      (event.amount ?? 0) > 0,
  ).length;
}

export function awardBattleMastery(
  monster: Monster,
  current: MonsterMasteryProgress | undefined,
  events: BattleEvent[],
  won: boolean,
  pulseChoice: TacticalPulseChoice,
): BattleMasteryAward {
  const previous = current ?? emptyMonsterMastery();
  const goal = masteryGoalFor(monster);
  const goalCompleted = goalProgress(monster, events) >= goal.target;
  const base = won ? 10 : 6;
  const points = Math.max(1, Math.round((base + (goalCompleted ? 5 : 0)) * getTacticalPulseOption(pulseChoice).masteryMultiplier));
  const total = previous.battleXp + points;
  const signatureProgress = Math.min(SIGNATURE_GOAL, previous.signatureProgress + (goalCompleted ? 1 : 0));
  const unlock = MOVE_UNLOCKS[monster.type];
  const unlockedMove = previous.battleXp < MASTERY_MOVE_THRESHOLD && total >= MASTERY_MOVE_THRESHOLD ? unlock : null;

  return {
    monsterId: monster.id,
    monsterName: monster.name,
    type: monster.type,
    points,
    total,
    signatureProgress,
    goal,
    goalCompleted,
    unlockedMove,
  };
}

export function applyMasteryAward(
  current: MonsterMasteryProgress | undefined,
  award: BattleMasteryAward,
): MonsterMasteryProgress {
  const previous = current ?? emptyMonsterMastery();
  return {
    battleXp: award.total,
    signatureProgress: award.signatureProgress,
    completedGoals: award.goalCompleted
      ? Array.from(new Set([...previous.completedGoals, award.goal.id]))
      : [...previous.completedGoals],
    unlockedMoves: award.unlockedMove
      ? Array.from(new Set([...previous.unlockedMoves, award.unlockedMove]))
      : [...previous.unlockedMoves],
  };
}
