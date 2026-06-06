/** Pure aggregation of squad signature traits into battle modifiers. */
import { TraitDef, getTraitForType } from '../data/traits.data';
import { Monster } from '../models/monster.model';

export interface TraitBonus {
  attackBonus: number;
  mitigation: number;
  rewardBonus: number;
}

/** Distinct traits present in the squad (deduped by type). */
export function activeSquadTraits(squad: Pick<Monster, 'type'>[]): TraitDef[] {
  const seen = new Set<string>();
  const traits: TraitDef[] = [];
  for (const member of squad) {
    const trait = getTraitForType(member.type);
    if (!seen.has(trait.id)) {
      seen.add(trait.id);
      traits.push(trait);
    }
  }
  return traits;
}

/** Sum the distinct squad traits into a single additive bonus block. */
export function squadTraitBonus(squad: Pick<Monster, 'type'>[]): TraitBonus {
  const total: TraitBonus = { attackBonus: 0, mitigation: 0, rewardBonus: 0 };
  for (const trait of activeSquadTraits(squad)) {
    total.attackBonus += trait.attackBonus ?? 0;
    total.mitigation += trait.mitigation ?? 0;
    total.rewardBonus += trait.rewardBonus ?? 0;
  }
  return total;
}
