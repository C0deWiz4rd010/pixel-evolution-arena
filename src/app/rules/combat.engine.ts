/**
 * Combat-Engine — der Linchpin der Hybrid-Kämpfe.
 *
 * Entscheidung (siehe docs/phase-9-...): Der **Ausgang** bleibt roll-basiert
 * (teamPower*(1+mods)*rng vs. enemyPower*(1+mods)*rng), damit die fein
 * austarierte Reward-/Forecast-Mathematik und die bestehenden Specs gültig
 * bleiben. Stance/Overdrive/Consumables fließen als zusätzliche Spieler-Boni in
 * die Rolls → echte Agency. Zusätzlich erzeugt die Engine eine deterministische
 * {@link BattleEvent}-Timeline, die echte Moves, Status-Effekte und den
 * Overdrive-Beat zeigt und konsistent zum Ausgang ist. Sie treibt Logs & Animation.
 *
 * Deterministisch bei injizierten `randomBetween`/`randomFrom` → voll testbar.
 */
import { EnemyMonster } from '../models/battle.model';
import { Monster, MonsterStage, MonsterType } from '../models/monster.model';
import { getMonsterMoves, getOverdriveMove, MoveDef } from './moves.rules';
import { getMonsterPower } from './squad.rules';
import {
  ActiveStatus,
  applyStatus,
  dotDamage,
  incomingDamageReduction,
  outgoingDamageMultiplier,
  regenHeal,
  STATUS_DEFS,
  StatusId,
  tickStatuses,
} from './status.rules';
import { getTypeMatchupValue } from './type-matchup.rules';

export type BattleSide = 'player' | 'enemy' | 'system';

export type BattleEventKind =
  | 'intro'
  | 'strike'
  | 'status-apply'
  | 'status-tick'
  | 'overdrive'
  | 'heal'
  | 'shield'
  | 'item'
  | 'faint'
  | 'outcome';

export interface BattleEvent {
  kind: BattleEventKind;
  /** Seite des Akteurs. 'system' für neutrale/Setup-Events. */
  side: BattleSide;
  actorName?: string;
  targetName?: string;
  moveName?: string;
  moveType?: MonsterType;
  /** Schaden oder Heilung. */
  amount?: number;
  status?: StatusId;
  critical?: boolean;
  effective?: -1 | 0 | 1;
  text?: string;
}

export interface ConsumableCombatEffect {
  name: string;
  kind: 'heal' | 'shield' | 'rally' | 'cleanse';
  /** Für heal: Anteil der max-HP. */
  magnitude?: number;
  /** Optionaler additiver Angriffsbonus auf den Spieler-Roll (beeinflusst den Ausgang). */
  attackBonus?: number;
  /** Optionale zusätzliche Schadensreduktion für Verbündete in der Timeline. */
  mitigation?: number;
}

export interface BattleSimulationParams {
  squad: Monster[];
  enemies: EnemyMonster[];
  playerModifier: number;
  enemyModifier: number;
  /** Stance-Effekte (aus BATTLE_STANCES aufgelöst). */
  stanceAttackMod: number;
  stanceMitigation: number;
  /** Overdrive für diesen Run scharfgestellt? */
  overdrive: boolean;
  overdriveAttackBonus: number;
  consumables: ConsumableCombatEffect[];
  synergyLabel?: string | null;
  randomBetween: (min: number, max: number) => number;
  randomFrom: <T>(items: T[]) => T;
  maxRounds?: number;
}

export interface BattleSimulationResult {
  won: boolean;
  criticalHit: boolean;
  playerRoll: number;
  enemyRoll: number;
  marginScore: number;
  overdriveUsed: boolean;
  /** Sieg ohne dass eine eigene Einheit fällt. */
  flawless: boolean;
  rounds: number;
  events: BattleEvent[];
}

interface Combatant {
  id: string;
  name: string;
  type: MonsterType;
  side: 'player' | 'enemy';
  attack: number;
  defense: number;
  speed: number;
  moves: MoveDef[];
  overdriveMove: MoveDef;
  statuses: ActiveStatus[];
}

const ENEMY_DEFAULT_STAGE: MonsterStage = 'Rookie';

export function simulateBattle(params: BattleSimulationParams): BattleSimulationResult {
  const teamPower = params.squad.reduce((total, monster) => total + getMonsterPower(monster), 0);
  const enemyPower = params.enemies.reduce((total, enemy) => total + getMonsterPower(enemy), 0);

  // Each consumable contributes its explicit attackBonus; a plain rally still
  // defaults to +6% so existing items keep their tuned value.
  const consumableAttackBonus = params.consumables.reduce(
    (total, effect) => total + (effect.attackBonus ?? (effect.kind === 'rally' ? 0.06 : 0)),
    0,
  );
  const consumableMitigation = params.consumables.reduce((total, effect) => total + (effect.mitigation ?? 0), 0);
  const playerAttackBonus =
    params.playerModifier +
    params.stanceAttackMod +
    consumableAttackBonus +
    (params.overdrive ? params.overdriveAttackBonus : 0);

  const playerBase = Math.max(1, teamPower * (1 + playerAttackBonus));
  const enemyBase = Math.max(1, enemyPower * (1 + params.enemyModifier));
  // NOTE: these bounds must match ROLL_VARIANCE_MIN/MAX in battle.rules so the
  // forecast win-probability stays consistent with the actual rolls. Kept as
  // literals here to avoid a battle.rules <-> combat.engine import cycle.
  const playerRoll = playerBase * params.randomBetween(0.86, 1.18);
  const enemyRoll = enemyBase * params.randomBetween(0.86, 1.18);
  const won = playerRoll >= enemyRoll;
  const criticalHit = won && playerRoll >= enemyRoll * 1.28;
  const marginScore = Math.round(playerRoll - enemyRoll);

  const events: BattleEvent[] = [];

  if (params.squad.length === 0) {
    // Ohne Squad gibt es nur ein Ausgang-Event (startBattle blockt das ohnehin vorher).
    events.push({ kind: 'outcome', side: 'system', text: 'No squad signal.' });
    return { won: false, criticalHit: false, playerRoll, enemyRoll, marginScore: 0, overdriveUsed: false, flawless: false, rounds: 0, events };
  }

  const allies = params.squad.map((monster, index) => buildAllyCombatant(monster, index));
  const foes = params.enemies.map((enemy, index) => buildEnemyCombatant(enemy, index));

  const synergyText = params.synergyLabel ? `${params.synergyLabel} synchronisiert die Linie.` : 'Squad rückt in Formation.';
  events.push({ kind: 'intro', side: 'system', text: synergyText });

  // Pre-Battle Consumables auf Verbündete anwenden.
  let preventEnemyStatus = false;
  for (const effect of params.consumables) {
    applyConsumable(effect, allies, events);
    if (effect.kind === 'cleanse') {
      preventEnemyStatus = true;
    }
  }

  const maxRounds = params.maxRounds ?? 4;
  let allyFell = false;
  let foeFell = false;

  for (let round = 0; round < maxRounds; round += 1) {
    const ally = allies[round % allies.length];
    const foe = foes[round % foes.length];

    // Verbündeter handelt.
    performAction({
      attacker: ally,
      defender: foe,
      isWinnerSide: won,
      mitigation: 0,
      randomBetween: params.randomBetween,
      randomFrom: params.randomFrom,
      events,
      allowStatus: true,
    });

    // Gegner kontert.
    performAction({
      attacker: foe,
      defender: ally,
      isWinnerSide: !won,
      mitigation: params.stanceMitigation + consumableMitigation,
      randomBetween: params.randomBetween,
      randomFrom: params.randomFrom,
      events,
      allowStatus: !preventEnemyStatus,
    });

    // Status-Ticks am Rundenende.
    tickSide(allies, events);
    tickSide(foes, events);
  }

  // Overdrive-Beat (großer Schlag des Leads), falls scharfgestellt.
  const overdriveUsed = params.overdrive && allies.length > 0;
  if (overdriveUsed) {
    const lead = allies[0];
    const target = foes[0];
    const matchup = getTypeMatchupValue(lead.type, target.type);
    const damage = computeDamage(lead, target, lead.overdriveMove, true, 0, params.randomBetween);
    events.push({
      kind: 'overdrive',
      side: 'player',
      actorName: lead.name,
      targetName: target.name,
      moveName: lead.overdriveMove.name,
      moveType: lead.type,
      amount: damage,
      critical: true,
      effective: matchup,
    });
    if (lead.overdriveMove.status) {
      events.push({ kind: 'status-apply', side: 'player', actorName: lead.name, targetName: target.name, status: lead.overdriveMove.status });
    }
  }

  // Faints + Ausgang. Knappe Siege (kleiner Margin) kosten eine Einheit → flawless wird bedeutungsvoll.
  if (!won) {
    allyFell = true;
    events.push({ kind: 'faint', side: 'player', actorName: allies[0].name, text: `${allies[0].name} wird ausgeschaltet.` });
  } else {
    foeFell = true;
    events.push({ kind: 'faint', side: 'enemy', actorName: foes[0].name, text: `${foes[0].name} bricht zusammen.` });
    if (marginScore < 60 && allies.length > 1) {
      allyFell = true;
      events.push({ kind: 'faint', side: 'player', actorName: allies[allies.length - 1].name, text: `${allies[allies.length - 1].name} fällt im knappen Tausch.` });
    }
  }

  const flawless = won && !allyFell;
  events.push({
    kind: 'outcome',
    side: 'system',
    amount: marginScore,
    text: won ? (criticalHit ? 'CRITICAL OVERLOAD' : 'Victory') : 'Retreat',
  });

  return { won, criticalHit, playerRoll, enemyRoll, marginScore, overdriveUsed, flawless, rounds: maxRounds, events };
}

interface ActionParams {
  attacker: Combatant;
  defender: Combatant;
  isWinnerSide: boolean;
  mitigation: number;
  randomBetween: (min: number, max: number) => number;
  randomFrom: <T>(items: T[]) => T;
  events: BattleEvent[];
  allowStatus: boolean;
}

function performAction(params: ActionParams): void {
  const { attacker, defender, events } = params;
  const move = chooseMove(attacker.moves, params.randomBetween, params.randomFrom);

  // Reiner Selbst-Buff (z. B. Solar Rally, Plate Lock).
  if (move.target === 'self' && move.status) {
    attacker.statuses = applyStatus(attacker.statuses, move.status);
    const isShield = STATUS_DEFS[move.status].kind === 'buff' && (move.status === 'shield' || move.status === 'regen');
    events.push({
      kind: isShield ? 'shield' : 'status-apply',
      side: attacker.side,
      actorName: attacker.name,
      moveName: move.name,
      moveType: attacker.type,
      status: move.status,
    });
    return;
  }

  const matchup = getTypeMatchupValue(attacker.type, defender.type);
  const hit = params.randomBetween(0, 1) <= move.accuracy;
  if (!hit) {
    events.push({ kind: 'strike', side: attacker.side, actorName: attacker.name, targetName: defender.name, moveName: move.name, moveType: attacker.type, amount: 0, effective: matchup, text: 'verfehlt' });
    return;
  }

  // Gewinnerseite trifft etwas härter, Verliererseite schwächer → glaubhafter Verlauf.
  const damage = computeDamage(attacker, defender, move, params.isWinnerSide, params.mitigation, params.randomBetween);
  events.push({
    kind: 'strike',
    side: attacker.side,
    actorName: attacker.name,
    targetName: defender.name,
    moveName: move.name,
    moveType: attacker.type,
    amount: damage,
    effective: matchup,
  });

  if (params.allowStatus && move.status && move.target === 'enemy' && move.statusChance) {
    if (params.randomBetween(0, 1) <= move.statusChance) {
      defender.statuses = applyStatus(defender.statuses, move.status);
      events.push({ kind: 'status-apply', side: attacker.side, actorName: attacker.name, targetName: defender.name, status: move.status });
    }
  }
}

function computeDamage(
  attacker: Combatant,
  defender: Combatant,
  move: MoveDef,
  winnerBias: boolean,
  mitigation: number,
  randomBetween: (min: number, max: number) => number,
): number {
  const matchup = getTypeMatchupValue(attacker.type, defender.type);
  const variance = winnerBias ? randomBetween(0.62, 0.95) : randomBetween(0.42, 0.7);
  const out = outgoingDamageMultiplier(attacker.statuses);
  const reduction = incomingDamageReduction(defender.statuses) + (defender.side === 'player' ? mitigation : 0);
  const raw =
    attacker.attack * move.power * variance * (1 + matchup * 0.16) * out * (1 - Math.min(0.7, reduction)) -
    defender.defense * 0.11;
  return Math.max(6, Math.round(raw));
}

/** Auto-Move-Wahl: meist Strike, gelegentlich Status oder Heavy. */
function chooseMove(moves: MoveDef[], randomBetween: (min: number, max: number) => number, randomFrom: <T>(items: T[]) => T): MoveDef {
  if (moves.length === 1) {
    return moves[0];
  }
  const roll = randomBetween(0, 1);
  const statusMove = moves.find((move) => move.kind === 'status');
  const heavyMove = moves.find((move) => move.kind === 'heavy');
  const strikeMove = moves.find((move) => move.kind === 'strike') ?? moves[0];
  if (statusMove && roll < 0.28) {
    return statusMove;
  }
  if (heavyMove && roll < 0.5) {
    return heavyMove;
  }
  return strikeMove;
}

function tickSide(combatants: Combatant[], events: BattleEvent[]): void {
  for (const unit of combatants) {
    if (unit.statuses.length === 0) {
      continue;
    }
    const dot = dotDamage(unit.statuses, estimateMaxHpFor(unit));
    if (dot > 0) {
      const dotStatus = unit.statuses.find((status) => STATUS_DEFS[status.id].kind === 'dot');
      events.push({ kind: 'status-tick', side: unit.side, actorName: unit.name, amount: dot, status: dotStatus?.id });
    }
    const heal = regenHeal(unit.statuses, estimateMaxHpFor(unit));
    if (heal > 0) {
      events.push({ kind: 'status-tick', side: unit.side, actorName: unit.name, amount: -heal, status: 'regen' });
    }
    unit.statuses = tickStatuses(unit.statuses);
  }
}

function applyConsumable(effect: ConsumableCombatEffect, allies: Combatant[], events: BattleEvent[]): void {
  events.push({ kind: 'item', side: 'player', text: effect.name });
  for (const ally of allies) {
    if (effect.kind === 'shield') {
      ally.statuses = applyStatus(ally.statuses, 'shield');
    } else if (effect.kind === 'rally') {
      ally.statuses = applyStatus(ally.statuses, 'rally');
    } else if (effect.kind === 'heal') {
      const amount = Math.round(estimateMaxHpFor(ally) * (effect.magnitude ?? 0.25));
      events.push({ kind: 'heal', side: 'player', actorName: ally.name, amount });
    }
  }
}

/** Grobe HP-Schätzung für DoT/Heal-Skalierung (Combatant trägt keine HP, nur Stats). */
function estimateMaxHpFor(unit: Combatant): number {
  return Math.max(60, unit.defense * 3 + unit.attack);
}

function buildAllyCombatant(monster: Monster, index: number): Combatant {
  return {
    id: monster.id || `ally-${index}`,
    name: monster.name,
    type: monster.type,
    side: 'player',
    attack: monster.attack,
    defense: monster.defense,
    speed: monster.speed,
    moves: getMonsterMoves(monster),
    overdriveMove: getOverdriveMove(monster.type),
    statuses: [],
  };
}

function buildEnemyCombatant(enemy: EnemyMonster, index: number): Combatant {
  return {
    id: enemy.id || `foe-${index}`,
    name: enemy.name,
    type: enemy.type,
    side: 'enemy',
    attack: enemy.attack,
    defense: enemy.defense,
    speed: enemy.speed,
    moves: getMonsterMoves({ type: enemy.type, stage: ENEMY_DEFAULT_STAGE }),
    overdriveMove: getOverdriveMove(enemy.type),
    statuses: [],
  };
}
