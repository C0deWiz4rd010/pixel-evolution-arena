/**
 * Move-System. Statt 71 Monster einzeln zu bepinseln, leiten wir das Moveset
 * aus Typ + Stage ab ({@link getMonsterMoves}). Die Daten der Typ-Kits liegen in
 * {@link ../data/moves.data}.
 */
import { Monster, MonsterStage } from '../models/monster.model';
import { MonsterType } from '../models/monster.model';
import { StatusId } from './status.rules';
import { TYPE_MOVE_KITS, TYPE_OVERDRIVE } from '../data/moves.data';

export type MoveKind = 'strike' | 'status' | 'heavy' | 'overdrive';

export interface MoveDef {
  id: string;
  name: string;
  kind: MoveKind;
  /** Schadensmultiplikator gegen attacker.attack (0 = reiner Status-Move). */
  power: number;
  /** Trefferchance 0..1. */
  accuracy: number;
  /** Optionaler Status, der bei Treffer angewandt wird. */
  status?: StatusId;
  /** Chance, den Status anzuwenden, 0..1. */
  statusChance?: number;
  /** Zielseite: Gegner (Schaden/Debuff), self/ally (Buff). */
  target: 'enemy' | 'self' | 'ally';
  flavor?: string;
}

const STAGE_RANK: Record<MonsterStage, number> = {
  Baby: 0,
  'In-Training': 1,
  Rookie: 2,
  Champion: 3,
  Ultimate: 4,
  Mega: 5,
  Special: 5,
};

/** Basis-Moveset eines Monsters (2–4 Moves), abgeleitet aus Typ + Stage. */
export function getMonsterMoves(monster: { type: MonsterType; stage: MonsterStage }): MoveDef[] {
  const kit = TYPE_MOVE_KITS[monster.type];
  const rank = STAGE_RANK[monster.stage] ?? 0;
  // Babys/In-Training kämpfen schlichter (Strike + ein Move). Ab Rookie das volle Kit.
  if (rank <= 1) {
    return [kit[0], kit[1]];
  }
  return [...kit];
}

/** Signature-Overdrive eines Monsters (großer Schlag für die Hybrid-Steuerung). */
export function getOverdriveMove(type: MonsterType): MoveDef {
  return TYPE_OVERDRIVE[type];
}
