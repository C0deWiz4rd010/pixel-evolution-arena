import { MonsterType } from '../models/monster.model';

/**
 * Signature traits give each type a passive identity. They resolve to additive
 * battle modifiers folded in at the service level, so the combat engine and its
 * specs stay untouched. A monster's trait comes from its type.
 */
export interface TraitDef {
  id: string;
  name: string;
  detail: string;
  /** Extra player attack modifier when this trait is in the squad. */
  attackBonus?: number;
  /** Extra incoming-damage mitigation when this trait is in the squad. */
  mitigation?: number;
  /** Extra reward multiplier contribution (summed, then applied). */
  rewardBonus?: number;
}

export const TYPE_TRAITS: Record<MonsterType, TraitDef> = {
  Fire: { id: 'trait-ignition', name: 'Ignition', detail: 'Aggressive opener — squad attack +6%.', attackBonus: 0.06 },
  Water: { id: 'trait-flow', name: 'Tidal Flow', detail: 'Adaptive guard — mitigation +6%.', mitigation: 0.06 },
  Nature: { id: 'trait-bloom', name: 'Overgrowth', detail: 'Resilient roots — mitigation +4%, attack +2%.', mitigation: 0.04, attackBonus: 0.02 },
  Dark: { id: 'trait-dread', name: 'Dread Aura', detail: 'Pressure the foe — attack +5%.', attackBonus: 0.05 },
  Light: { id: 'trait-radiance', name: 'Radiance', detail: 'Clean strikes — attack +4%, reward +5%.', attackBonus: 0.04, rewardBonus: 0.05 },
  Machine: { id: 'trait-overclock', name: 'Overclock', detail: 'Stable systems — mitigation +5%, attack +1%.', mitigation: 0.05, attackBonus: 0.01 },
  Beast: { id: 'trait-ferocity', name: 'Ferocity', detail: 'Raw power — attack +7%.', attackBonus: 0.07 },
  Toxic: { id: 'trait-corrode', name: 'Corrosion', detail: 'Wear them down — attack +3%, mitigation +3%.', attackBonus: 0.03, mitigation: 0.03 },
};

export function getTraitForType(type: MonsterType): TraitDef {
  return TYPE_TRAITS[type];
}
