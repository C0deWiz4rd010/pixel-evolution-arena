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

export interface CompositionTrait extends TraitBonus {
  id: 'mono-resonance' | 'spectrum-matrix';
  name: string;
  detail: string;
}

/**
 * Composition bonus from the squad's overall type spread: a focused mono build
 * concentrates power, while a fully diverse line gets versatile coverage. Adds a
 * real reason to commit to a build instead of three random units.
 */
export function squadCompositionTrait(squad: Pick<Monster, 'type'>[]): CompositionTrait | null {
  if (squad.length < 2) {
    return null;
  }
  const distinct = new Set(squad.map((member) => member.type)).size;
  if (distinct === 1) {
    return {
      id: 'mono-resonance',
      name: 'Mono Resonance',
      detail: 'One shared type concentrates the line — attack +6%.',
      attackBonus: 0.06,
      mitigation: 0,
      rewardBonus: 0,
    };
  }
  if (squad.length >= 3 && distinct === squad.length) {
    return {
      id: 'spectrum-matrix',
      name: 'Spectrum Matrix',
      detail: 'Every slot a different type — attack +4%, mitigation +4%, reward +3%.',
      attackBonus: 0.04,
      mitigation: 0.04,
      rewardBonus: 0.03,
    };
  }
  return null;
}

/** Squad trait bonus including the composition bonus, folded into one block. */
export function totalSquadTraitBonus(squad: Pick<Monster, 'type'>[]): TraitBonus {
  const base = squadTraitBonus(squad);
  const composition = squadCompositionTrait(squad);
  if (!composition) {
    return base;
  }
  return {
    attackBonus: base.attackBonus + composition.attackBonus,
    mitigation: base.mitigation + composition.mitigation,
    rewardBonus: base.rewardBonus + composition.rewardBonus,
  };
}
