import { MonsterType } from '../models/monster.model';

/**
 * Named boss profiles layered on top of the every-fifth-battle "Boss Surge".
 * A boss adds a telegraphed mechanic and an enrage phase, plus a Codex entry
 * once defeated. The combat outcome stays roll-based; bosses tune the modifiers
 * and reward focus and drive the warning UI.
 */
export interface BossMechanic {
  /** Short telegraph shown before the fight. */
  telegraph: string;
  /** What the player should do about it. */
  counter: string;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  type: MonsterType;
  icon: string;
  spriteUrl: string;
  lore: string;
  mechanic: BossMechanic;
  /** Extra enemy modifier while enraged (applied on top of Boss Surge). */
  enrageModifier: number;
  /** Reward multiplier for a clean (flawless) kill. */
  fastClearBonus: number;
  reward: { coins: number; dnaShards: number };
}

export const BOSSES: BossDef[] = [
  {
    id: 'boss-chronocore',
    name: 'Chronocore Crown',
    title: 'Warden of the Loop',
    type: 'Machine',
    icon: 'CC',
    spriteUrl: 'assets/creatures/generated-100/n097-chronocore.svg',
    lore: 'A self-repairing machine-core that rewinds damage if the fight drags on.',
    mechanic: {
      telegraph: 'Rewind Protocol: regenerates if the battle goes long.',
      counter: 'Bring burst and end it fast — arm Overdrive or a Rally item.',
    },
    enrageModifier: 0.12,
    fastClearBonus: 1.25,
    reward: { coins: 520, dnaShards: 18 },
  },
  {
    id: 'boss-dawncipher',
    name: 'Dawncipher',
    title: 'The Blinding Choir',
    type: 'Light',
    icon: 'DC',
    spriteUrl: 'assets/creatures/generated-100/n096-dawncipher.svg',
    lore: 'A light-construct that overwhelms slow squads with cascading flares.',
    mechanic: {
      telegraph: 'Flare Cascade: punishes low-speed lines hard.',
      counter: 'Stack speed or a Pulse Drive; Dark coverage blunts the flares.',
    },
    enrageModifier: 0.1,
    fastClearBonus: 1.2,
    reward: { coins: 480, dnaShards: 16 },
  },
  {
    id: 'boss-blightstar',
    name: 'Blightstar',
    title: 'Rot of the Deep Grid',
    type: 'Toxic',
    icon: 'BS',
    spriteUrl: 'assets/creatures/generated-100/n100-blightstar.svg',
    lore: 'A toxic bloom that grinds down sustain squads with relentless decay.',
    mechanic: {
      telegraph: 'Decay Field: chip damage favors short fights.',
      counter: 'Run a Purge Chip or shield, and counter with Machine/Light.',
    },
    enrageModifier: 0.14,
    fastClearBonus: 1.22,
    reward: { coins: 500, dnaShards: 17 },
  },
];

/** Rotates a boss for a given (boss-tier) battle number. */
export function getBossForBattle(battleNumber: number): BossDef {
  const index = Math.max(0, Math.floor(battleNumber / 5) - 1) % BOSSES.length;
  return BOSSES[index];
}
