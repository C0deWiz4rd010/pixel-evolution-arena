import { CONSUMABLES, ConsumableDef } from '../data/items.data';
import { ConsumableCombatEffect } from './combat.engine';

export const CONSUMABLE_NAMES: readonly string[] = CONSUMABLES.map((item) => item.name);

export function getConsumableDef(name: string): ConsumableDef | undefined {
  return CONSUMABLES.find((item) => item.name === name);
}

export function isConsumable(name: string): boolean {
  return CONSUMABLE_NAMES.includes(name);
}

/** Wandelt ausgerüstete Consumable-Namen in Engine-Effekte um (unbekannte werden ignoriert). */
export function toCombatEffects(names: readonly string[]): ConsumableCombatEffect[] {
  return names
    .map((name) => getConsumableDef(name)?.effect)
    .filter((effect): effect is ConsumableCombatEffect => Boolean(effect));
}

/** Entfernt genau ein Vorkommen eines Items aus dem Inventar (immutabel). */
export function removeOneFromInventory(inventory: readonly string[], name: string): string[] {
  const index = inventory.indexOf(name);
  if (index < 0) {
    return [...inventory];
  }
  return [...inventory.slice(0, index), ...inventory.slice(index + 1)];
}

/** Zählt ein bestimmtes Item im Inventar. */
export function countInInventory(inventory: readonly string[], name: string): number {
  return inventory.reduce((total, entry) => (entry === name ? total + 1 : total), 0);
}
