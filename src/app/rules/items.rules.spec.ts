import { describe, expect, it } from 'vitest';
import { CONSUMABLES } from '../data/items.data';
import { CONSUMABLE_NAMES, countInInventory, getConsumableDef, isConsumable, removeOneFromInventory, toCombatEffects } from './items.rules';

describe('items rules', () => {
  it('knows every consumable and rejects gate items', () => {
    for (const item of CONSUMABLES) {
      expect(isConsumable(item.name)).toBe(true);
      expect(getConsumableDef(item.name)).toBe(item);
    }
    expect(CONSUMABLE_NAMES).toHaveLength(CONSUMABLES.length);
    expect(isConsumable('Solar Crest')).toBe(false);
    expect(getConsumableDef('Solar Crest')).toBeUndefined();
  });

  it('turns equipped names into combat effects and ignores unknown names', () => {
    const name = CONSUMABLES[0].name;
    expect(toCombatEffects([name, 'Nothing'])).toHaveLength(1);
    expect(toCombatEffects([])).toEqual([]);
  });

  it('removes exactly one copy without mutating the inventory', () => {
    const inventory = ['Armor Core', 'Shadow Gem', 'Armor Core'];
    const next = removeOneFromInventory(inventory, 'Armor Core');
    expect(next).toEqual(['Shadow Gem', 'Armor Core']);
    expect(inventory).toHaveLength(3);
    expect(removeOneFromInventory(inventory, 'Missing')).toEqual(inventory);
  });

  it('counts copies in the inventory', () => {
    expect(countInInventory(['a', 'b', 'a'], 'a')).toBe(2);
    expect(countInInventory([], 'a')).toBe(0);
  });
});
