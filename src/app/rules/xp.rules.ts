import { BattleLog } from '../models/battle.model';
import { Monster } from '../models/monster.model';

/** Growth of the XP bar per level. Tuned with `balance.sim.spec.ts` (~30-40 wins to a first Mega). */
export const XP_LEVEL_GROWTH = 1.08;
/** Data XP bars are authored on a legacy scale; this brings them to the tuned pace. */
export const XP_BASE_SCALE = 0.17;
export const MIN_XP_BAR = 30;

export interface SquadXpResult {
  updatedMonsters: Monster[];
  logs: BattleLog[];
}

export function applyXpToTargets(monsters: Monster[], targetIds: readonly string[], amount: number): SquadXpResult {
  const logs: BattleLog[] = [];
  const squadIdSet = new Set(targetIds);

  const updatedMonsters = monsters.map((monster) => {
    if (!squadIdSet.has(monster.id)) {
      return monster;
    }

    let xp = monster.xp + amount;
    let maxXp = monster.maxXp;
    let level = monster.level;
    let attack = monster.attack;
    let defense = monster.defense;
    let speed = monster.speed;
    let hp = monster.hp;

    while (xp >= maxXp) {
      xp -= maxXp;
      level += 1;
      maxXp = Math.round(maxXp * XP_LEVEL_GROWTH);
      attack += 3;
      defense += 2;
      speed += 2;
      hp += 8;
      logs.push({ text: `${monster.name} reached level ${level}!`, type: 'reward' });
    }

    return { ...monster, xp, maxXp, level, attack, defense, speed, hp };
  });

  return { updatedMonsters, logs };
}

export function applyXpToSquad(monsters: Monster[], squadIds: string[], amount: number): SquadXpResult {
  return applyXpToTargets(monsters, squadIds, amount);
}

export function applyXpToMonster(monsters: Monster[], monsterId: string, amount: number): SquadXpResult {
  return applyXpToTargets(monsters, [monsterId], amount);
}
