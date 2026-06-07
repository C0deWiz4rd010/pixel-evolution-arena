/** Pure resolution of a battlefield mutator into additive battle modifiers. */
import { MutatorDef } from '../data/mutators.data';
import { MonsterType } from '../models/monster.model';

export interface MutatorModifier {
  playerAttackBonus: number;
  playerMitigation: number;
  enemyModifier: number;
}

export function resolveMutator(mutator: MutatorDef | null, squadTypes: MonsterType[]): MutatorModifier {
  if (!mutator) {
    return { playerAttackBonus: 0, playerMitigation: 0, enemyModifier: 0 };
  }
  const favoredTypes = mutator.favoredTypes ?? (mutator.favoredType ? [mutator.favoredType] : []);
  const favored = favoredTypes.some((type) => squadTypes.includes(type)) ? mutator.favoredAttackBonus ?? 0 : 0;
  return {
    playerAttackBonus: favored,
    playerMitigation: mutator.playerMitigation ?? 0,
    enemyModifier: mutator.enemyModifier ?? 0,
  };
}
