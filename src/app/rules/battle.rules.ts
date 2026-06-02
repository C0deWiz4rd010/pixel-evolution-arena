import { ArenaFormation, BattleLog, BattleReward, EnemyMonster } from '../models/battle.model';
import { Monster, MonsterType } from '../models/monster.model';
import { BattleEvent } from './combat.engine';
import { TeamSynergy } from './squad.rules';
import { STATUS_DEFS } from './status.rules';
import { getTypeMatchupValue, TypeMatchupValue, TypePressureSummary } from './type-matchup.rules';

export const WIN_STREAK_MILESTONES: readonly number[] = [3, 5, 10, 25];

export interface StreakBonus {
  coins: number;
  xp: number;
}

export function calculateStreakBonus(streakAfterWin: number, baseReward: BattleReward): StreakBonus {
  if (streakAfterWin < 2) {
    return { coins: 0, xp: 0 };
  }

  const tier = Math.min(5, streakAfterWin - 1);
  return {
    coins: Math.round(baseReward.coins * 0.08 * tier),
    xp: Math.round(baseReward.xp * 0.05 * tier),
  };
}

export function applyStreakBonus(reward: BattleReward, bonus: StreakBonus, streakAfter: number): BattleReward {
  if (bonus.coins === 0 && bonus.xp === 0) {
    return { ...reward, streakAfter };
  }

  return {
    ...reward,
    coins: reward.coins + bonus.coins,
    xp: reward.xp + bonus.xp,
    streakBonusCoins: bonus.coins,
    streakBonusXp: bonus.xp,
    streakAfter,
  };
}

export function findCrossedMilestone(previousWins: number, currentWins: number, claimed: readonly number[]): number | null {
  for (const threshold of WIN_STREAK_MILESTONES) {
    if (previousWins < threshold && currentWins >= threshold && !claimed.includes(threshold)) {
      return threshold;
    }
  }
  return null;
}

export function milestoneLabel(threshold: number): string {
  return `Milestone reached: ${threshold} battles won`;
}

export interface LossHintParams {
  squad: Monster[];
  enemies: EnemyMonster[];
  teamPower: number;
  enemyPower: number;
  typePressureLabel: string;
  squadSize: number;
}

export function generateLossHint(params: LossHintParams): string {
  const gap = params.teamPower - params.enemyPower;

  if (params.squadSize < 3) {
    return `Squad gap: only ${params.squadSize}/3 slots filled. Add a unit before the next run.`;
  }

  if (gap <= -120) {
    const weakest = [...params.squad].sort((a, b) => a.attack + a.defense - (b.attack + b.defense))[0];
    return weakest
      ? `Power gap ${gap}: train or replace ${weakest.name} to close the net.`
      : `Power gap ${gap}: train a squad unit before retrying.`;
  }

  if (gap <= -40) {
    return `Power gap ${gap}: small deficit. Level up your lead unit or rotate in a stronger reserve.`;
  }

  return `Coverage signal: ${params.typePressureLabel}. Swap a type to flip the matchup.`;
}

export interface ArenaThreatProfile {
  id: 'standard' | 'volatile' | 'hazard' | 'boss';
  label: string;
  detail: string;
  enemyModifier: number;
  rewardModifier: number;
  itemBonus: number;
}

export type BattleCategoryId = 'training' | 'standard' | 'risk';

export interface BattleCategoryProfile {
  id: BattleCategoryId;
  label: string;
  shortLabel: string;
  detail: string;
  enemyModifier: number;
  rewardModifier: number;
  itemBonus: number;
}

export const BATTLE_CATEGORIES: BattleCategoryProfile[] = [
  {
    id: 'training',
    label: 'Training Run',
    shortLabel: 'Training',
    detail: 'Softer enemies, smaller payout. Safe XP for new lineups.',
    enemyModifier: -0.08,
    rewardModifier: 0.82,
    itemBonus: -0.04,
  },
  {
    id: 'standard',
    label: 'Standard Sim',
    shortLabel: 'Standard',
    detail: 'Baseline arena pressure with the default reward curve.',
    enemyModifier: 0,
    rewardModifier: 1,
    itemBonus: 0,
  },
  {
    id: 'risk',
    label: 'Risk Run',
    shortLabel: 'Risk',
    detail: 'Tougher enemies and higher reward and item odds.',
    enemyModifier: 0.12,
    rewardModifier: 1.22,
    itemBonus: 0.08,
  },
];

export function getBattleCategoryProfile(id: BattleCategoryId): BattleCategoryProfile {
  return BATTLE_CATEGORIES.find((category) => category.id === id) ?? BATTLE_CATEGORIES[1];
}

// --- Hybrid control: stance ---

export type BattleStanceId = 'aggressive' | 'balanced' | 'defensive';

export interface BattleStanceProfile {
  id: BattleStanceId;
  label: string;
  shortLabel: string;
  detail: string;
  /** Bonus to the player roll. */
  attackMod: number;
  /** Reduces incoming damage in the event timeline. */
  mitigation: number;
}

export const BATTLE_STANCES: BattleStanceProfile[] = [
  {
    id: 'aggressive',
    label: 'Aggressive',
    shortLabel: 'Aggro',
    detail: 'Full offense: more damage, less cover.',
    attackMod: 0.1,
    mitigation: -0.08,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'Balance',
    detail: 'Balanced stance with no hard tradeoff.',
    attackMod: 0,
    mitigation: 0,
  },
  {
    id: 'defensive',
    label: 'Defensive',
    shortLabel: 'Guard',
    detail: 'Safer line: less damage, more durability.',
    attackMod: -0.05,
    mitigation: 0.16,
  },
];

export function getBattleStanceProfile(id: BattleStanceId): BattleStanceProfile {
  return BATTLE_STANCES.find((stance) => stance.id === id) ?? BATTLE_STANCES[1];
}

// --- Hybrid control: Overdrive ---

export const OVERDRIVE_MAX = 100;
export const OVERDRIVE_ATTACK_BONUS = 0.18;

/** Charge tick after battle; wins charge faster. */
export function chargeOverdrive(current: number, won: boolean): number {
  const gain = won ? 34 : 18;
  return Math.max(0, Math.min(OVERDRIVE_MAX, current + gain));
}

export function canArmOverdrive(charge: number): boolean {
  return charge >= OVERDRIVE_MAX;
}

/**
 * Builds the reward object from win/crit/multiplier.
 * Extracted so the combat engine uses the same tuned math.
 */
export function buildReward(won: boolean, criticalHit: boolean, rewardMultiplier: number): BattleReward {
  const rewardScale = criticalHit
    ? rewardMultiplier * 1.18
    : won
      ? rewardMultiplier
      : 0.88 + (rewardMultiplier - 1) * 0.55;
  return won
    ? {
        won,
        coins: Math.round(120 * rewardScale),
        dnaShards: Math.max(3, Math.round(8 * rewardScale)),
        xp: Math.max(24, Math.round(35 * rewardScale)),
      }
    : {
        won,
        coins: Math.max(24, Math.round(30 * rewardScale)),
        dnaShards: Math.max(2, Math.round(2 * rewardScale)),
        xp: Math.max(10, Math.round(12 * rewardScale)),
      };
}

export type BattleOutlookTone = 'low' | 'even' | 'strong';

export interface BattleOutlook {
  tone: BattleOutlookTone;
  label: string;
  detail: string;
  ratio: number;
}

export interface BattleOutlookParams {
  teamPower: number;
  enemyPower: number;
  playerModifier: number;
  enemyModifier: number;
  hasSquad: boolean;
}

export function predictBattleOutlook(params: BattleOutlookParams): BattleOutlook {
  if (!params.hasSquad) {
    return {
      tone: 'low',
      label: 'No Signal',
      detail: 'Add at least one squad unit to read a battle forecast.',
      ratio: 0,
    };
  }

  const adjustedTeam = Math.max(1, params.teamPower * (1 + params.playerModifier));
  const adjustedEnemy = Math.max(1, params.enemyPower * (1 + params.enemyModifier));
  const ratio = adjustedTeam / adjustedEnemy;

  if (ratio >= 1.18) {
    return {
      tone: 'strong',
      label: 'Strong Win Outlook',
      detail: 'Simulation favors your squad. Expect a clean win.',
      ratio,
    };
  }

  if (ratio >= 0.92) {
    return {
      tone: 'even',
      label: 'Even Match',
      detail: 'Simulation is close. Synergy and type edges decide the run.',
      ratio,
    };
  }

  return {
    tone: 'low',
    label: 'Low Win Outlook',
    detail: 'Enemy net outpaces your squad. Train or rotate before pressing in.',
    ratio,
  };
}

export interface BattleResolutionParams {
  teamPower: number;
  enemyPower: number;
  playerModifier: number;
  enemyModifier: number;
  rewardMultiplier: number;
  randomBetween: (min: number, max: number) => number;
}

export interface BattleResolutionResult {
  won: boolean;
  reward: BattleReward;
  playerRoll: number;
  enemyRoll: number;
  criticalHit: boolean;
}

export interface BattleLogBuildParams {
  squad: Monster[];
  enemies: EnemyMonster[];
  reward: BattleReward;
  formation: ArenaFormation;
  threat: ArenaThreatProfile;
  playerRoll: number;
  enemyRoll: number;
  criticalHit: boolean;
  synergyLead: TeamSynergy | null;
  typePressure: TypePressureSummary;
  randomFrom: <T>(items: T[]) => T;
  randomBetween: (min: number, max: number) => number;
}

export function resolveBattle(params: BattleResolutionParams): BattleResolutionResult {
  const playerBase = params.teamPower * (1 + params.playerModifier);
  const enemyBase = params.enemyPower * (1 + params.enemyModifier);
  const playerRoll = playerBase * params.randomBetween(0.86, 1.18);
  const enemyRoll = enemyBase * params.randomBetween(0.86, 1.18);
  const won = playerRoll >= enemyRoll;
  const criticalHit = won && playerRoll >= enemyRoll * 1.28;
  const reward = buildReward(won, criticalHit, params.rewardMultiplier);

  return { won, reward, playerRoll, enemyRoll, criticalHit };
}

export function calculateEnemyBattleModifier(baseModifier: number, typePressureModifier: number): number {
  return clampModifier(baseModifier + typePressureModifier, -0.12, 0.32);
}

export function shouldAwardItem(won: boolean, chance: number, randomValue: number): boolean {
  return won && randomValue < chance;
}

export function buildBattleLogs(params: BattleLogBuildParams): BattleLog[] {
  const attackerA = params.randomFrom(params.squad);
  const attackerB = params.randomFrom(params.squad);
  const attackerC = params.squad.length >= 3 ? params.randomFrom(params.squad) : attackerA;
  const defenderA = params.randomFrom(params.enemies);
  const defenderB = params.randomFrom(params.enemies);
  const defenderC = params.randomFrom(params.enemies);
  const matchupA = getTypeMatchupValue(attackerA.type, defenderA.type);
  const matchupB = getTypeMatchupValue(attackerB.type, defenderB.type);
  const matchupC = getTypeMatchupValue(attackerC.type, defenderC.type);
  const critMultiplier = params.criticalHit ? 1.6 : 1;
  const damageA = Math.max(
    12,
    Math.round(attackerA.attack * params.randomBetween(0.42, 0.74) * (1 + matchupA * 0.16) * critMultiplier - defenderA.defense * 0.12),
  );
  const damageB = Math.max(
    10,
    Math.round(attackerB.attack * params.randomBetween(0.36, 0.68) * (1 + matchupB * 0.16) - defenderB.defense * 0.1),
  );
  const damageC = Math.max(
    8,
    Math.round(attackerC.attack * params.randomBetween(0.32, 0.58) * (1 + matchupC * 0.14) - defenderC.defense * 0.09),
  );
  const flavorA = typeVerb(attackerA.type, params.randomFrom);
  const flavorB = typeVerb(attackerB.type, params.randomFrom);
  const flavorC = typeVerb(attackerC.type, params.randomFrom);
  const rollMargin = Math.round(params.playerRoll - params.enemyRoll);
  const comboActive = params.synergyLead !== null && params.squad.length >= 2;

  const outcomeLines: BattleLog[] = params.criticalHit
    ? [
        { text: `CRITICAL OVERLOAD - squad decimates enemy formation in a single coordinated burst!`, type: 'reward' },
        { text: `Decisive win! (+${rollMargin} sim margin)`, type: 'reward' },
      ]
    : params.reward.won
      ? [
          { text: `Enemy team loses momentum at ${rollMargin >= 120 ? 'full collapse' : 'the edge of the grid'}.`, type: 'info' },
          { text: `Your squad wins the battle! (+${rollMargin} sim)`, type: 'reward' },
        ]
      : [
          { text: 'Enemy team regains momentum and compresses the arena line.', type: 'info' },
          { text: `Your squad is forced to retreat. (${rollMargin} sim)`, type: 'system' },
        ];

  return [
    { text: `Arena battle started // ${params.formation.name} // ${params.formation.tier} // ${params.threat.label}.`, type: 'info' },
    { text: `Objective: ${params.formation.objective}`, type: 'info' },
    ...(params.synergyLead
      ? [{ text: `${params.synergyLead.label} boosts allied output (${formatPercent(params.synergyLead.modifier)}).`, type: 'info' as const }]
      : []),
    { text: `${params.typePressure.label}: ${params.typePressure.detail}`, type: 'info' },
    {
      text: `${attackerA.name} opens with ${flavorA} on ${defenderA.name} for ${damageA} damage.${params.criticalHit ? ' CRITICAL!' : matchupSuffix(matchupA, attackerA.type, defenderA.type)}`,
      type: 'damage',
    },
    {
      text: matchupB < 0 ? `${defenderB.name} resists the angle and pushes the line back.` : `${defenderB.name} absorbs part of the hit and counters.`,
      type: 'damage',
    },
    {
      text: `${attackerB.name} follows with ${flavorB} for ${damageB} damage.${matchupSuffix(matchupB, attackerB.type, defenderB.type)}`,
      type: 'damage',
    },
    ...(comboActive
      ? [{ text: `COMBO: ${attackerC.name} chains ${flavorC} into ${defenderC.name} for ${damageC} bonus damage!`, type: 'damage' as const }]
      : [{ text: `${attackerC.name} applies ${flavorC} for ${damageC} residual damage.`, type: 'damage' as const }]),
    ...outcomeLines,
    {
      text: `Rewards: +${params.reward.coins} Coins, +${params.reward.dnaShards} DNA, +${params.reward.xp} XP.${params.criticalHit ? ' Critical bonus applied.' : ''}${params.formation.tier !== 'Scout' ? ` ${params.formation.tier} cache active.` : ''}${params.threat.rewardModifier > 1 ? ` ${params.threat.label} boost active.` : ''}`,
      type: 'reward',
    },
  ];
}

export interface EventLogBuildParams {
  events: BattleEvent[];
  reward: BattleReward;
  formation: ArenaFormation;
  threat: ArenaThreatProfile;
  marginScore: number;
  criticalHit: boolean;
  won: boolean;
}

/**
 * Translates the combat event timeline into readable battle logs.
 * Moves, status effects, and Overdrive stay visible without parsing flavor text.
 */
export function buildBattleLogsFromEvents(params: EventLogBuildParams): BattleLog[] {
  const logs: BattleLog[] = [
    { text: `Arena battle started // ${params.formation.name} // ${params.formation.tier} // ${params.threat.label}.`, type: 'info' },
    { text: `Objective: ${params.formation.objective}`, type: 'info' },
  ];

  for (const event of params.events) {
    const line = eventToLog(event);
    if (line) {
      logs.push(line);
    }
  }

  logs.push({
    text: `Rewards: +${params.reward.coins} Coins, +${params.reward.dnaShards} DNA, +${params.reward.xp} XP.${params.criticalHit ? ' Critical bonus applied.' : ''}${params.formation.tier !== 'Scout' ? ` ${params.formation.tier} cache active.` : ''}${params.threat.rewardModifier > 1 ? ` ${params.threat.label} boost active.` : ''}`,
    type: 'reward',
  });

  return logs;
}

function eventToLog(event: BattleEvent): BattleLog | null {
  switch (event.kind) {
    case 'intro':
      return event.text ? { text: event.text, type: 'info' } : null;
    case 'item':
      return { text: `Combat item deployed: ${event.text}.`, type: 'info' };
    case 'heal':
      return { text: `${event.actorName} repairs ${event.amount} HP.`, type: 'info' };
    case 'shield':
      return { text: `${event.actorName} raises ${statusLabel(event.status)}.`, type: 'info' };
    case 'strike': {
      if (!event.amount) {
        return { text: `${event.actorName}'s ${event.moveName} misses ${event.targetName}.`, type: 'info' };
      }
      return {
        text: `${event.actorName} hits ${event.targetName} with ${event.moveName} for ${event.amount} damage.${effectivenessSuffix(event.effective, event.moveType, event.actorName)}`,
        type: 'damage',
      };
    }
    case 'status-apply':
      return event.side === 'player' && !event.targetName
        ? { text: `${event.actorName} channels ${statusLabel(event.status)}.`, type: 'info' }
        : { text: `${event.targetName} is afflicted with ${statusLabel(event.status)}.`, type: 'damage' };
    case 'status-tick':
      if ((event.amount ?? 0) < 0) {
        return { text: `${event.actorName} regenerates ${Math.abs(event.amount ?? 0)} HP.`, type: 'info' };
      }
      return { text: `${event.actorName} takes ${event.amount} ${statusLabel(event.status)} damage.`, type: 'damage' };
    case 'overdrive':
      return { text: `OVERDRIVE - ${event.actorName} unleashes ${event.moveName} on ${event.targetName} for ${event.amount} damage!`, type: 'reward' };
    case 'faint':
      return event.text ? { text: event.text, type: event.side === 'player' ? 'system' : 'damage' } : null;
    case 'outcome':
      return null; // Reward-Zeile folgt separat.
    default:
      return null;
  }
}

function statusLabel(status: BattleEvent['status']): string {
  return status ? STATUS_DEFS[status].label : 'effect';
}

function effectivenessSuffix(effective: BattleEvent['effective'], type: MonsterType | undefined, actor: string | undefined): string {
  if (effective === 1) {
    return ` ${type ?? actor} pressure cracks the guard.`;
  }
  if (effective === -1) {
    return ' The typing dulls the strike.';
  }
  return '';
}

function typeVerb(type: MonsterType, randomFrom: <T>(items: T[]) => T): string {
  const verbs: Record<MonsterType, string[]> = {
    Nature: ['Vine Lash', 'Thorn Surge', 'Root Bind', 'Spore Burst', 'Canopy Crush'],
    Fire: ['Blaze Rush', 'Ember Fang', 'Inferno Wave', 'Cinder Claw', 'Magma Slam'],
    Water: ['Aqua Slash', 'Pressure Wave', 'Frost Bite', 'Tide Crash', 'Current Rend'],
    Dark: ['Shadow Feint', 'Void Cut', 'Null Strike', 'Eclipse Surge', 'Phantom Rend'],
    Light: ['Prism Flash', 'Solar Pulse', 'Radiant Beam', 'Nova Burst', 'Aura Lance'],
    Machine: ['Gear Burst', 'Servo Strike', 'Overcharge', 'Drill Press', 'Arc Cannon'],
    Beast: ['Fang Break', 'Claw Rush', 'Stone Charge', 'Boulder Slam', 'Rending Roar'],
    Toxic: ['Venom Mist', 'Ooze Shot', 'Acid Barrage', 'Plague Swarm', 'Corrode Bite'],
  };

  return randomFrom(verbs[type]);
}

function matchupSuffix(matchup: TypeMatchupValue, attackerType: MonsterType, defenderType: MonsterType): string {
  if (matchup > 0) {
    return ` ${attackerType} pressure cracks ${defenderType} guard.`;
  }

  if (matchup < 0) {
    return ` ${defenderType} typing dulls the strike.`;
  }

  return '';
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
}

function clampModifier(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
