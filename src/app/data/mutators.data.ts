import { MonsterType } from '../models/monster.model';

/**
 * Battlefield mutators rotate per arena battle and bend the fight a little:
 * they favor a type, raise enemy pressure, or harden the squad. Resolved into
 * additive modifiers at the service level (engine + specs untouched). Each has a
 * tint the Pixi stage uses for an ambient wash.
 */
export interface MutatorDef {
  id: string;
  name: string;
  detail: string;
  icon: string;
  /** Hex color for the Pixi ambient wash. */
  tint: string;
  /** Squad members of this type gain a bonus. */
  favoredType?: MonsterType;
  favoredAttackBonus?: number;
  /** Global enemy modifier delta. */
  enemyModifier?: number;
  /** Flat squad mitigation. */
  playerMitigation?: number;
}

export const MUTATORS: MutatorDef[] = [
  {
    id: 'mut-stable',
    name: 'Stable Grid',
    detail: 'Baseline conditions. No battlefield distortion.',
    icon: '=',
    tint: '#12d8ff',
  },
  {
    id: 'mut-solar',
    name: 'Solar Flare',
    detail: 'Fire and Light surge — those types hit harder.',
    icon: '☀',
    tint: '#ff9a22',
    favoredType: 'Fire',
    favoredAttackBonus: 0.12,
  },
  {
    id: 'mut-static',
    name: 'Static Field',
    detail: 'Charged air boosts Machine output but rouses the enemy.',
    icon: '⚡',
    tint: '#ffe12b',
    favoredType: 'Machine',
    favoredAttackBonus: 0.1,
    enemyModifier: 0.04,
  },
  {
    id: 'mut-toxic',
    name: 'Toxic Fog',
    detail: 'Corrosive haze favors Toxic and Nature lines.',
    icon: '☣',
    tint: '#7cff3a',
    favoredType: 'Toxic',
    favoredAttackBonus: 0.12,
  },
  {
    id: 'mut-null',
    name: 'Null Zone',
    detail: 'Dampening field hardens defenses but enemies press harder.',
    icon: '◇',
    tint: '#c267ff',
    playerMitigation: 0.08,
    enemyModifier: 0.06,
  },
  {
    id: 'mut-deluge',
    name: 'Deluge',
    detail: 'Flooded arena empowers Water and Beast units.',
    icon: '≈',
    tint: '#18c8ff',
    favoredType: 'Water',
    favoredAttackBonus: 0.12,
  },
];

/** Deterministic mutator for a given arena battle number. */
export function getMutatorForBattle(battleNumber: number): MutatorDef {
  if (battleNumber <= 1) {
    return MUTATORS[0];
  }
  // Rotate through the non-stable pool, occasionally returning to Stable Grid.
  const pool = MUTATORS;
  return pool[battleNumber % pool.length];
}
