import { EnemyMonster } from '../models/battle.model';
import { Monster, MonsterType } from '../models/monster.model';
import { BattleControlMode } from '../models/player-state.model';
import { MoveDef, getMonsterMoves, getOverdriveMove } from './moves.rules';
import { ActiveStatus, STATUS_DEFS, applyStatus, incomingDamageReduction, outgoingDamageMultiplier, tickStatuses } from './status.rules';
import { BattleEvent } from './combat.engine';
import { getTypeMatchupValue } from './type-matchup.rules';

export type { BattleControlMode } from '../models/player-state.model';
export type BattleOrderId = 'focus' | 'protect' | 'charge';
export type BattleDecisionKind = 'order' | 'pulse';
export type TacticalPulseId = 'break' | 'guard' | 'surge';
export type TacticalBattlePhase = 'opening' | 'pressure' | 'finish' | 'complete';

const COMBAT_DAMAGE_SCALE = 0.42;

export interface CombatantState {
  id: string;
  name: string;
  side: 'player' | 'enemy';
  type: MonsterType;
  attack: number;
  defense: number;
  speed: number;
  currentHp: number;
  maxHp: number;
  statuses: ActiveStatus[];
  moves: MoveDef[];
  defeated: boolean;
}

export interface BattleOrderDecision {
  kind: 'order';
  id: BattleOrderId;
  targetId?: string;
}

export interface BattlePulseDecision {
  kind: 'pulse';
  id: TacticalPulseId;
}

export type BattleDecision = BattleOrderDecision | BattlePulseDecision;

export interface ActiveBattleOrder {
  id: BattleOrderId;
  remaining: number;
  targetId?: string;
}

export interface BattleSessionState {
  seed: number;
  rngState: number;
  round: number;
  phase: TacticalBattlePhase;
  combatants: CombatantState[];
  pendingDecision: BattleDecisionKind | null;
  activeOrder: ActiveBattleOrder | null;
  pulse: TacticalPulseId | null;
  pulseRemaining: number;
  skipNextEnemyAction: boolean;
  overdriveCharge: number;
  overdriveUsed: boolean;
  orderHistory: BattleOrderId[];
  pulseHistory: TacticalPulseId[];
  events: BattleEvent[];
  lastBatch: BattleEvent[];
  playerAttackModifier: number;
  enemyAttackModifier: number;
  playerMitigation: number;
  completed: boolean;
  won: boolean | null;
  criticalHit: boolean;
  flawless: boolean;
}

export interface CreateBattleSessionParams {
  squad: Monster[];
  enemies: EnemyMonster[];
  seed: number;
  playerAttackModifier: number;
  enemyAttackModifier: number;
  playerMitigation: number;
  overdriveCharge: number;
  overdriveArmed: boolean;
}

export interface TacticalBattleResult {
  won: boolean;
  criticalHit: boolean;
  marginScore: number;
  overdriveUsed: boolean;
  flawless: boolean;
  rounds: number;
  events: BattleEvent[];
  orderHistory: BattleOrderId[];
  pulseChoice: TacticalPulseId;
  survivors: string[];
  overdriveCharge: number;
}

export function createBattleSession(params: CreateBattleSessionParams): BattleSessionState {
  const combatants: CombatantState[] = [
    ...params.squad.map((monster) => createAlly(monster)),
    ...params.enemies.map((enemy, index) => createEnemy(enemy, index)),
  ];
  const seed = (params.seed >>> 0) || 1;
  const intro: BattleEvent = { kind: 'intro', side: 'system', round: 0, text: 'Squad links established. Opening phase online.' };
  return {
    seed,
    rngState: seed,
    round: 0,
    phase: 'opening',
    combatants,
    pendingDecision: null,
    activeOrder: null,
    pulse: null,
    pulseRemaining: 0,
    skipNextEnemyAction: false,
    overdriveCharge: params.overdriveArmed ? 100 : clamp(params.overdriveCharge, 0, 100),
    overdriveUsed: false,
    orderHistory: [],
    pulseHistory: [],
    events: [intro],
    lastBatch: [intro],
    playerAttackModifier: params.playerAttackModifier,
    enemyAttackModifier: params.enemyAttackModifier,
    playerMitigation: params.playerMitigation,
    completed: false,
    won: null,
    criticalHit: false,
    flawless: true,
  };
}

export function advanceBattleSession(source: BattleSessionState): BattleSessionState {
  if (source.completed || source.pendingDecision) return source;
  const state = cloneSession(source);
  state.lastBatch = [];
  const stopRound = state.round < 2 ? 2 : state.round < 4 ? 4 : state.round < 6 ? 6 : 8;

  while (!state.completed && state.round < stopRound) resolveRound(state);
  if (state.completed) return state;

  if (state.round === 2 || state.round === 6) state.pendingDecision = 'order';
  else if (state.round === 4) state.pendingDecision = 'pulse';
  state.phase = phaseForRound(state.round);
  return state;
}

export function applyBattleDecision(source: BattleSessionState, decision: BattleDecision): BattleSessionState {
  if (source.completed || source.pendingDecision !== decision.kind) return source;
  const state = cloneSession(source);
  state.lastBatch = [];
  state.pendingDecision = null;

  if (decision.kind === 'order') {
    const targetId = decision.id === 'focus' ? validFocusTarget(state, decision.targetId) : undefined;
    state.activeOrder = { id: decision.id, remaining: 2, targetId };
    state.orderHistory.push(decision.id);
    if (decision.id === 'charge') state.overdriveCharge = clamp(state.overdriveCharge + 30, 0, 100);
    pushEvent(state, {
      kind: decision.id === 'protect' ? 'shield' : 'intro',
      side: 'system',
      round: state.round,
      text: decision.id === 'focus' ? 'Order: Focus Target.' : decision.id === 'protect' ? 'Order: Protect Lead.' : 'Order: Build Overdrive.',
    });
  } else {
    state.pulse = decision.id;
    state.pulseHistory.push(decision.id);
    if (decision.id === 'break') applyBreakPulse(state);
    if (decision.id === 'guard') state.pulseRemaining = Math.max(1, living(state, 'enemy').length);
    if (decision.id === 'surge') state.pulseRemaining = 99;
    pushEvent(state, { kind: 'intro', side: 'system', round: state.round, text: `Tactical Pulse: ${decision.id.toUpperCase()}.` });
  }
  return state;
}

export function recommendedDecision(state: BattleSessionState): BattleDecision {
  const playerRatio = teamHpRatio(state, 'player');
  const enemyRatio = teamHpRatio(state, 'enemy');
  if (state.pendingDecision === 'pulse') {
    return { kind: 'pulse', id: playerRatio < 0.45 ? 'guard' : enemyRatio < 0.38 ? 'surge' : 'break' };
  }
  if (playerRatio < 0.48) return { kind: 'order', id: 'protect' };
  if (state.overdriveCharge >= 70) return { kind: 'order', id: 'charge' };
  return { kind: 'order', id: 'focus', targetId: lowestHp(living(state, 'enemy'))?.id };
}

export function battleResult(state: BattleSessionState): TacticalBattleResult {
  if (!state.completed || state.won === null) throw new Error('Battle session is not complete.');
  const playerHp = totalHp(state, 'player');
  const enemyHp = totalHp(state, 'enemy');
  return {
    won: state.won,
    criticalHit: state.criticalHit,
    marginScore: playerHp - enemyHp,
    overdriveUsed: state.overdriveUsed,
    flawless: state.flawless,
    rounds: state.round,
    events: state.events,
    orderHistory: state.orderHistory,
    pulseChoice: state.pulseHistory[0] ?? 'guard',
    survivors: living(state, 'player').map((unit) => unit.id),
    overdriveCharge: state.overdriveCharge,
  };
}

export function simulateRecommendedBattle(params: CreateBattleSessionParams): TacticalBattleResult {
  let state = createBattleSession(params);
  while (!state.completed) {
    state = advanceBattleSession(state);
    if (state.pendingDecision) state = applyBattleDecision(state, recommendedDecision(state));
  }
  return battleResult(state);
}

function resolveRound(state: BattleSessionState): void {
  state.round += 1;
  state.phase = phaseForRound(state.round);
  const actors = living(state).sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
  for (const actorRef of actors) {
    const actor = byId(state, actorRef.id);
    if (!actor || actor.defeated || state.completed) continue;
    if (actor.side === 'enemy' && state.skipNextEnemyAction) {
      state.skipNextEnemyAction = false;
      pushEvent(state, { kind: 'shield', side: 'player', actorName: actor.name, round: state.round, text: `${actor.name}'s action was interrupted.` });
      continue;
    }
    if (actor.side === 'player' && state.overdriveCharge >= 100 && !state.overdriveUsed) performOverdrive(state, actor);
    if (!state.completed && !actor.defeated) performAction(state, actor);
    checkOutcome(state);
  }
  if (!state.completed) applyRoundTicks(state);
  checkOutcome(state);
  if (!state.completed && state.round >= 8) finalizeAtRoundCap(state);
}

function performAction(state: BattleSessionState, actor: CombatantState): void {
  const targets = living(state, actor.side === 'player' ? 'enemy' : 'player');
  if (!targets.length) return;
  const target = chooseTarget(state, actor, targets);
  const move = chooseMove(state, actor, target);
  if (move.target === 'self') {
    if (move.status) actor.statuses = applyStatus(actor.statuses, move.status);
    pushEvent(state, { kind: 'status-apply', side: actor.side, actorName: actor.name, targetName: actor.name, moveName: move.name, status: move.status, round: state.round });
    return;
  }
  const hitRoll = random(state);
  if (hitRoll > move.accuracy) {
    pushEvent(state, { kind: 'strike', side: actor.side, actorName: actor.name, targetName: target.name, moveName: move.name, amount: 0, round: state.round, text: `${actor.name}'s ${move.name} missed.` });
    consumeOrder(state, actor.side);
    return;
  }
  const critical = random(state) < 0.1;
  const damage = calculateDamage(state, actor, target, move, critical);
  dealDamage(state, actor, target, move, damage, critical);
  if (move.status && random(state) <= (move.statusChance ?? 1) && !target.defeated) {
    target.statuses = applyStatus(target.statuses, move.status);
    pushEvent(state, { kind: 'status-apply', side: actor.side, actorName: actor.name, targetName: target.name, moveName: move.name, status: move.status, round: state.round });
  }
  if (actor.side === 'player') state.overdriveCharge = clamp(state.overdriveCharge + 8, 0, 100);
  consumeOrder(state, actor.side);
}

function performOverdrive(state: BattleSessionState, actor: CombatantState): void {
  const target = chooseTarget(state, actor, living(state, 'enemy'));
  if (!target) return;
  const move = getOverdriveMove(actor.type);
  const damage = Math.round(calculateDamage(state, actor, target, move, true) * 1.1);
  state.overdriveCharge = 0;
  state.overdriveUsed = true;
  dealDamage(state, actor, target, move, damage, true, true);
}

function applyBreakPulse(state: BattleSessionState): void {
  const actor = living(state, 'player').sort((a, b) => b.speed - a.speed)[0];
  const target = lowestHp(living(state, 'enemy'));
  if (!actor || !target) return;
  const move = actor.moves.find((entry) => entry.power > 0) ?? actor.moves[0];
  const damage = Math.max(1, Math.round(calculateDamage(state, actor, target, move, false) * 0.8));
  dealDamage(state, actor, target, { ...move, name: 'Break Counter' }, damage, false);
  state.skipNextEnemyAction = true;
}

function dealDamage(state: BattleSessionState, actor: CombatantState, target: CombatantState, move: MoveDef, amount: number, critical: boolean, overdrive = false): void {
  target.currentHp = Math.max(0, target.currentHp - amount);
  target.defeated = target.currentHp === 0;
  pushEvent(state, {
    kind: overdrive ? 'overdrive' : 'strike', side: actor.side, actorName: actor.name, targetName: target.name,
    moveName: move.name, moveType: actor.type, amount, critical, effective: getTypeMatchupValue(actor.type, target.type),
    round: state.round, targetHp: target.currentHp, targetMaxHp: target.maxHp,
  });
  if (target.defeated) {
    pushEvent(state, { kind: 'faint', side: target.side, actorName: target.name, round: state.round, targetHp: 0, targetMaxHp: target.maxHp, text: `${target.name} is offline.` });
    if (target.side === 'player') state.flawless = false;
  }
}

function calculateDamage(state: BattleSessionState, actor: CombatantState, target: CombatantState, move: MoveDef, critical: boolean): number {
  const matchup = getTypeMatchupValue(actor.type, target.type);
  const typeFactor = matchup > 0 ? 1.2 : matchup < 0 ? 0.82 : 1;
  let outgoing = actor.side === 'player' ? 1 + state.playerAttackModifier : 1 + state.enemyAttackModifier;
  let mitigation = incomingDamageReduction(target.statuses);
  outgoing *= outgoingDamageMultiplier(actor.statuses);
  if (actor.side === 'player' && state.activeOrder?.id === 'focus') outgoing *= 1.12;
  if (actor.side === 'player' && state.activeOrder?.id === 'protect') outgoing *= 0.92;
  if (actor.side === 'player' && state.activeOrder?.id === 'charge') outgoing *= 0.88;
  if (actor.side === 'player' && state.pulse === 'surge') outgoing *= 1.2;
  if (actor.side === 'enemy') {
    mitigation += state.playerMitigation;
    if (state.activeOrder?.id === 'protect' && state.activeOrder.remaining > 0) mitigation += 0.3;
    if (state.pulse === 'guard' && state.pulseRemaining > 0) mitigation += 0.3;
    if (state.activeOrder?.id === 'focus') outgoing *= 1.08;
    if (state.pulse === 'surge') outgoing *= 1.1;
  }
  const base = Math.max(1, actor.attack * move.power * outgoing - target.defense * 0.22);
  return Math.max(1, Math.round(base * typeFactor * (critical ? 1.45 : 1) * (0.9 + random(state) * 0.2) * (1 - clamp(mitigation, 0, 0.72)) * COMBAT_DAMAGE_SCALE));
}

function chooseMove(state: BattleSessionState, actor: CombatantState, target: CombatantState): MoveDef {
  const usable = actor.moves.filter((move) => {
    if (!move.status) return true;
    const carrier = move.target === 'self' ? actor : target;
    return !carrier.statuses.some((status) => status.id === move.status);
  });
  const pool = usable.length ? usable : actor.moves.filter((move) => move.power > 0);
  const heavy = pool.find((move) => move.kind === 'heavy');
  if (heavy && target.currentHp / target.maxHp < 0.5 && random(state) < 0.68) return heavy;
  return pool[Math.floor(random(state) * pool.length)] ?? actor.moves[0];
}

function chooseTarget(state: BattleSessionState, actor: CombatantState, targets: CombatantState[]): CombatantState {
  if (actor.side === 'player' && state.activeOrder?.id === 'focus') {
    const focused = targets.find((target) => target.id === state.activeOrder?.targetId);
    if (focused) return focused;
  }
  return [...targets].sort((a, b) => {
    const typeDelta = getTypeMatchupValue(actor.type, b.type) - getTypeMatchupValue(actor.type, a.type);
    if (typeDelta !== 0) return typeDelta;
    return a.currentHp / a.maxHp - b.currentHp / b.maxHp;
  })[0];
}

function applyRoundTicks(state: BattleSessionState): void {
  for (const unit of living(state)) {
    let dot = 0;
    let heal = 0;
    for (const status of unit.statuses) {
      const def = STATUS_DEFS[status.id];
      if (def.kind === 'dot') dot += Math.round(unit.maxHp * status.magnitude);
      if (status.id === 'regen') heal += Math.round(unit.maxHp * status.magnitude);
    }
    if (dot > 0) {
      unit.currentHp = Math.max(0, unit.currentHp - dot);
      unit.defeated = unit.currentHp === 0;
      pushEvent(state, { kind: 'status-tick', side: unit.side, actorName: unit.name, amount: dot, round: state.round, targetHp: unit.currentHp, targetMaxHp: unit.maxHp });
      if (unit.defeated) pushEvent(state, { kind: 'faint', side: unit.side, actorName: unit.name, round: state.round, text: `${unit.name} is offline.` });
    }
    if (heal > 0 && !unit.defeated) {
      unit.currentHp = Math.min(unit.maxHp, unit.currentHp + heal);
      pushEvent(state, { kind: 'heal', side: unit.side, actorName: unit.name, amount: heal, round: state.round, targetHp: unit.currentHp, targetMaxHp: unit.maxHp });
    }
    unit.statuses = tickStatuses(unit.statuses);
  }
  if (state.pulse === 'guard') state.pulseRemaining = Math.max(0, state.pulseRemaining - living(state, 'enemy').length);
}

function consumeOrder(state: BattleSessionState, actorSide: 'player' | 'enemy'): void {
  if (!state.activeOrder) return;
  if (state.activeOrder.id === 'protect' && actorSide === 'enemy') state.activeOrder.remaining -= 1;
  if (state.activeOrder.id !== 'protect' && actorSide === 'player') state.activeOrder.remaining -= 1;
  if (state.activeOrder.remaining <= 0) state.activeOrder = null;
}

function checkOutcome(state: BattleSessionState): void {
  const playerAlive = living(state, 'player').length > 0;
  const enemyAlive = living(state, 'enemy').length > 0;
  if (playerAlive && enemyAlive) return;
  completeBattle(state, playerAlive && !enemyAlive);
}

function finalizeAtRoundCap(state: BattleSessionState): void {
  const playerRatio = teamHpRatio(state, 'player');
  const enemyRatio = teamHpRatio(state, 'enemy');
  completeBattle(state, playerRatio > enemyRatio);
}

function completeBattle(state: BattleSessionState, won: boolean): void {
  state.completed = true;
  state.won = won;
  state.phase = 'complete';
  state.pendingDecision = null;
  const ownRatio = teamHpRatio(state, 'player');
  const enemyRatio = teamHpRatio(state, 'enemy');
  state.criticalHit = won && ownRatio - enemyRatio >= 0.55;
  pushEvent(state, { kind: 'outcome', side: 'system', round: state.round, text: won ? (state.criticalHit ? 'CRITICAL OVERLOAD' : 'Victory') : 'Retreat' });
}

function phaseForRound(round: number): TacticalBattlePhase {
  if (round <= 2) return 'opening';
  if (round <= 4) return 'pressure';
  if (round <= 8) return 'finish';
  return 'complete';
}

function createAlly(monster: Monster): CombatantState {
  return { id: monster.id, name: monster.name, side: 'player', type: monster.type, attack: monster.attack, defense: monster.defense, speed: monster.speed, currentHp: monster.hp, maxHp: monster.hp, statuses: [], moves: getMonsterMoves(monster), defeated: false };
}

function createEnemy(enemy: EnemyMonster, index: number): CombatantState {
  const shell: Monster = { id: enemy.id ?? `enemy-${index}`, name: enemy.name, icon: enemy.icon, type: enemy.type, stage: 'Rookie', level: 1, xp: 0, maxXp: 1, attack: enemy.attack, defense: enemy.defense, speed: enemy.speed, hp: enemy.hp, rarity: 'Common', unlocked: true, evolutionTargets: [] };
  return { id: shell.id, name: shell.name, side: 'enemy', type: shell.type, attack: shell.attack, defense: shell.defense, speed: shell.speed, currentHp: shell.hp, maxHp: shell.hp, statuses: [], moves: getMonsterMoves(shell), defeated: false };
}

function validFocusTarget(state: BattleSessionState, requested?: string): string | undefined {
  const enemies = living(state, 'enemy');
  return enemies.find((enemy) => enemy.id === requested)?.id ?? lowestHp(enemies)?.id;
}

function lowestHp(units: CombatantState[]): CombatantState | undefined {
  return [...units].sort((a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp)[0];
}

function living(state: BattleSessionState, side?: 'player' | 'enemy'): CombatantState[] {
  return state.combatants.filter((unit) => !unit.defeated && (!side || unit.side === side));
}

function byId(state: BattleSessionState, id: string): CombatantState | undefined {
  return state.combatants.find((unit) => unit.id === id);
}

function teamHpRatio(state: BattleSessionState, side: 'player' | 'enemy'): number {
  const units = state.combatants.filter((unit) => unit.side === side);
  const max = units.reduce((sum, unit) => sum + unit.maxHp, 0);
  return max > 0 ? units.reduce((sum, unit) => sum + unit.currentHp, 0) / max : 0;
}

function totalHp(state: BattleSessionState, side: 'player' | 'enemy'): number {
  return state.combatants.filter((unit) => unit.side === side).reduce((sum, unit) => sum + unit.currentHp, 0);
}

function random(state: BattleSessionState): number {
  let x = state.rngState || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rngState = x >>> 0;
  return state.rngState / 0x100000000;
}

function pushEvent(state: BattleSessionState, event: BattleEvent): void {
  state.events.push(event);
  state.lastBatch.push(event);
}

function cloneSession(source: BattleSessionState): BattleSessionState {
  return {
    ...source,
    combatants: source.combatants.map((unit) => ({ ...unit, statuses: unit.statuses.map((status) => ({ ...status })), moves: [...unit.moves] })),
    activeOrder: source.activeOrder ? { ...source.activeOrder } : null,
    orderHistory: [...source.orderHistory], pulseHistory: [...source.pulseHistory], events: [...source.events], lastBatch: [...source.lastBatch],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
