import { ConsumableCombatEffect } from '../rules/combat.engine';

/**
 * Combat consumables make inventory useful beyond evolution gates.
 * Evolution gate items still only unlock evolution routes.
 */
export interface ConsumableDef {
  name: string;
  icon: string;
  detail: string;
  /** Coin price in the Fabricator. */
  cost: number;
  effect: ConsumableCombatEffect;
}

export const CONSUMABLES: ConsumableDef[] = [
  {
    name: 'Repair Cell',
    icon: 'HP',
    detail: 'Heals the squad at battle start (~25% HP).',
    cost: 160,
    effect: { name: 'Repair Cell', kind: 'heal', magnitude: 0.25 },
  },
  {
    name: 'Purge Chip',
    icon: 'PG',
    detail: 'Immune to enemy status effects this battle.',
    cost: 200,
    effect: { name: 'Purge Chip', kind: 'cleanse' },
  },
  {
    name: 'Focus Capsule',
    icon: 'FC',
    detail: 'Rally: bonus damage for the whole squad.',
    cost: 240,
    effect: { name: 'Focus Capsule', kind: 'rally' },
  },
  {
    name: 'Aegis Plating',
    icon: 'AG',
    detail: 'Shield: reduces incoming damage.',
    cost: 220,
    effect: { name: 'Aegis Plating', kind: 'shield' },
  },
  {
    name: 'Overclock Core',
    icon: 'OC',
    detail: 'Rally + overclock: +10% squad attack this battle.',
    cost: 300,
    effect: { name: 'Overclock Core', kind: 'rally', attackBonus: 0.1 },
  },
  {
    name: 'Bulwark Field',
    icon: 'BW',
    detail: 'Shield + bulwark: extra damage mitigation through the fight.',
    cost: 260,
    effect: { name: 'Bulwark Field', kind: 'shield', mitigation: 0.1 },
  },
  {
    name: 'Adrenal Shot',
    icon: 'AS',
    detail: 'Heals ~20% HP and adds +5% attack this battle.',
    cost: 280,
    effect: { name: 'Adrenal Shot', kind: 'heal', magnitude: 0.2, attackBonus: 0.05 },
  },
];
