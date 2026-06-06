import { MonsterType } from '../models/monster.model';
import { MoveDef } from '../rules/moves.rules';

/**
 * Pro Typ ein kleines Kit: [0] verlässlicher Strike, [1] Status-Move,
 * [2] schwerer Move. {@link getMonsterMoves} wählt daraus nach Stage.
 *
 * Status-Zuordnung: Nature/Toxic→poison, Fire→burn, Water→chill, Dark→shock,
 * Machine→shock(Gegner) bzw. shield(self), Light→rally(self), Beast→rally(self).
 * Status-Moves mit Buff zielen auf self, Debuff/DoT auf enemy.
 */
export const TYPE_MOVE_KITS: Record<MonsterType, MoveDef[]> = {
  Nature: [
    { id: 'nat-strike', name: 'Vine Lash', kind: 'strike', power: 0.62, accuracy: 0.96, target: 'enemy' },
    { id: 'nat-status', name: 'Spore Bind', kind: 'status', power: 0.34, accuracy: 0.9, status: 'poison', statusChance: 0.65, target: 'enemy' },
    { id: 'nat-heavy', name: 'Canopy Crush', kind: 'heavy', power: 0.92, accuracy: 0.82, target: 'enemy' },
  ],
  Fire: [
    { id: 'fire-strike', name: 'Ember Fang', kind: 'strike', power: 0.66, accuracy: 0.95, target: 'enemy' },
    { id: 'fire-status', name: 'Cinder Spray', kind: 'status', power: 0.4, accuracy: 0.9, status: 'burn', statusChance: 0.7, target: 'enemy' },
    { id: 'fire-heavy', name: 'Magma Slam', kind: 'heavy', power: 0.98, accuracy: 0.8, target: 'enemy' },
  ],
  Water: [
    { id: 'wat-strike', name: 'Aqua Slash', kind: 'strike', power: 0.62, accuracy: 0.96, target: 'enemy' },
    { id: 'wat-status', name: 'Frost Bite', kind: 'status', power: 0.36, accuracy: 0.92, status: 'chill', statusChance: 0.7, target: 'enemy' },
    { id: 'wat-heavy', name: 'Tide Crash', kind: 'heavy', power: 0.9, accuracy: 0.83, target: 'enemy' },
  ],
  Dark: [
    { id: 'dark-strike', name: 'Shadow Feint', kind: 'strike', power: 0.64, accuracy: 0.94, target: 'enemy' },
    { id: 'dark-status', name: 'Null Strike', kind: 'status', power: 0.38, accuracy: 0.88, status: 'shock', statusChance: 0.6, target: 'enemy' },
    { id: 'dark-heavy', name: 'Eclipse Surge', kind: 'heavy', power: 0.96, accuracy: 0.8, target: 'enemy' },
  ],
  Light: [
    { id: 'light-strike', name: 'Prism Flash', kind: 'strike', power: 0.62, accuracy: 0.96, target: 'enemy' },
    { id: 'light-status', name: 'Solar Rally', kind: 'status', power: 0, accuracy: 1, status: 'rally', statusChance: 1, target: 'self' },
    { id: 'light-heavy', name: 'Nova Burst', kind: 'heavy', power: 0.94, accuracy: 0.82, target: 'enemy' },
  ],
  Machine: [
    { id: 'mach-strike', name: 'Servo Strike', kind: 'strike', power: 0.6, accuracy: 0.97, target: 'enemy' },
    { id: 'mach-status', name: 'Plate Lock', kind: 'status', power: 0, accuracy: 1, status: 'shield', statusChance: 1, target: 'self' },
    { id: 'mach-heavy', name: 'Arc Cannon', kind: 'heavy', power: 0.98, accuracy: 0.79, target: 'enemy' },
  ],
  Beast: [
    { id: 'beast-strike', name: 'Claw Rush', kind: 'strike', power: 0.66, accuracy: 0.95, target: 'enemy' },
    { id: 'beast-status', name: 'Rending Roar', kind: 'status', power: 0, accuracy: 1, status: 'rally', statusChance: 1, target: 'self' },
    { id: 'beast-heavy', name: 'Boulder Slam', kind: 'heavy', power: 0.99, accuracy: 0.78, target: 'enemy' },
  ],
  Toxic: [
    { id: 'tox-strike', name: 'Ooze Shot', kind: 'strike', power: 0.6, accuracy: 0.95, target: 'enemy' },
    { id: 'tox-status', name: 'Venom Mist', kind: 'status', power: 0.32, accuracy: 0.92, status: 'poison', statusChance: 0.75, target: 'enemy' },
    { id: 'tox-heavy', name: 'Acid Barrage', kind: 'heavy', power: 0.9, accuracy: 0.82, target: 'enemy' },
  ],
};

/** Signature-Overdrive je Typ: großer Schlag + thematischer Status. */
export const TYPE_OVERDRIVE: Record<MonsterType, MoveDef> = {
  Nature: { id: 'nat-od', name: 'Worldroot Surge', kind: 'overdrive', power: 1.55, accuracy: 1, status: 'poison', statusChance: 1, target: 'enemy' },
  Fire: { id: 'fire-od', name: 'Supernova Lance', kind: 'overdrive', power: 1.62, accuracy: 1, status: 'burn', statusChance: 1, target: 'enemy' },
  Water: { id: 'wat-od', name: 'Abyssal Maelstrom', kind: 'overdrive', power: 1.55, accuracy: 1, status: 'chill', statusChance: 1, target: 'enemy' },
  Dark: { id: 'dark-od', name: 'Event Horizon', kind: 'overdrive', power: 1.6, accuracy: 1, status: 'shock', statusChance: 1, target: 'enemy' },
  Light: { id: 'light-od', name: 'Stellar Judgment', kind: 'overdrive', power: 1.66, accuracy: 1, target: 'enemy' },
  Machine: { id: 'mach-od', name: 'Omega Cannon', kind: 'overdrive', power: 1.64, accuracy: 1, status: 'shock', statusChance: 1, target: 'enemy' },
  Beast: { id: 'beast-od', name: 'Apex Rampage', kind: 'overdrive', power: 1.62, accuracy: 1, target: 'enemy' },
  Toxic: { id: 'tox-od', name: 'Pandemic Bloom', kind: 'overdrive', power: 1.5, accuracy: 1, status: 'poison', statusChance: 1, target: 'enemy' },
};
