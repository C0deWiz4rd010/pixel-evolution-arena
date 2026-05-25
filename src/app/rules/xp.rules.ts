import { BattleLog } from '../models/battle.model';
import { Monster } from '../models/monster.model';

export interface SquadXpResult {
  updatedMonsters: Monster[];
  logs: BattleLog[];
}

export function applyXpToSquad(monsters: Monster[], squadIds: string[], amount: number): SquadXpResult {
  const logs: BattleLog[] = [];
  const squadIdSet = new Set(squadIds);

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
      maxXp = Math.round(maxXp * 1.16);
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
