import { ArenaFormation, BattleLog, BattleReward, EnemyMonster } from '../models/battle.model';
import { Monster, MonsterType } from '../models/monster.model';
import { TeamSynergy } from './squad.rules';
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
}

export interface BattleLogBuildParams {
  squad: Monster[];
  enemies: EnemyMonster[];
  reward: BattleReward;
  formation: ArenaFormation;
  threat: ArenaThreatProfile;
  playerRoll: number;
  enemyRoll: number;
  synergyLead: TeamSynergy | null;
  typePressure: TypePressureSummary;
  randomFrom: <T>(items: T[]) => T;
  randomBetween: (min: number, max: number) => number;
}

export function resolveBattle(params: BattleResolutionParams): BattleResolutionResult {
  const playerRoll = params.teamPower * (1 + params.playerModifier) * params.randomBetween(0.88, 1.14);
  const enemyRoll = params.enemyPower * (1 + params.enemyModifier) * params.randomBetween(0.88, 1.14);
  const won = playerRoll >= enemyRoll;
  const rewardScale = won ? params.rewardMultiplier : 0.88 + (params.rewardMultiplier - 1) * 0.55;
  const reward: BattleReward = won
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

  return { won, reward, playerRoll, enemyRoll };
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
  const defenderA = params.randomFrom(params.enemies);
  const defenderB = params.randomFrom(params.enemies);
  const matchupA = getTypeMatchupValue(attackerA.type, defenderA.type);
  const matchupB = getTypeMatchupValue(attackerB.type, defenderB.type);
  const damageA = Math.max(
    12,
    Math.round(attackerA.attack * params.randomBetween(0.42, 0.74) * (1 + matchupA * 0.16) - defenderA.defense * 0.12),
  );
  const damageB = Math.max(
    10,
    Math.round(attackerB.attack * params.randomBetween(0.36, 0.68) * (1 + matchupB * 0.16) - defenderB.defense * 0.1),
  );
  const flavorA = typeVerb(attackerA.type, params.randomFrom);
  const flavorB = typeVerb(attackerB.type, params.randomFrom);
  const rollMargin = Math.round(params.playerRoll - params.enemyRoll);

  return [
    { text: `Arena battle started // ${params.formation.name} // ${params.formation.tier} // ${params.threat.label}.`, type: 'info' },
    { text: `Objective: ${params.formation.objective}`, type: 'info' },
    ...(params.synergyLead
      ? [{ text: `${params.synergyLead.label} boosts allied output (${formatPercent(params.synergyLead.modifier)}).`, type: 'info' as const }]
      : []),
    { text: `${params.typePressure.label}: ${params.typePressure.detail}`, type: 'info' },
    {
      text: `${attackerA.name} uses ${flavorA} on ${defenderA.name} for ${damageA} damage.${matchupSuffix(matchupA, attackerA.type, defenderA.type)}`,
      type: 'damage',
    },
    { text: matchupB < 0 ? `${defenderB.name} resists the angle and pushes the line back.` : `${defenderB.name} absorbs part of the hit and counters.`, type: 'damage' },
    {
      text: `${attackerB.name} follows with ${flavorB} for ${damageB} damage.${matchupSuffix(matchupB, attackerB.type, defenderB.type)}`,
      type: 'damage',
    },
    {
      text: params.reward.won
        ? `Enemy team loses momentum at ${rollMargin >= 120 ? 'full collapse' : 'the edge of the grid'}.`
        : 'Enemy team regains momentum and compresses the arena line.',
      type: 'info',
    },
    {
      text: params.reward.won
        ? `Your squad wins the battle! (${rollMargin >= 0 ? '+' : ''}${rollMargin} sim)`
        : `Your squad is forced to retreat. (${rollMargin} sim)`,
      type: params.reward.won ? 'reward' : 'system',
    },
    {
      text: `Rewards: +${params.reward.coins} Coins, +${params.reward.dnaShards} DNA Shards, +${params.reward.xp} XP.${params.formation.tier !== 'Scout' ? ` ${params.formation.tier} cache active.` : ''}${params.threat.rewardModifier > 1 ? ` ${params.threat.label} boost active.` : ''}`,
      type: 'reward',
    },
  ];
}

function typeVerb(type: MonsterType, randomFrom: <T>(items: T[]) => T): string {
  const verbs: Record<MonsterType, string[]> = {
    Nature: ['Vine Lash', 'Thorn Surge'],
    Fire: ['Blaze Rush', 'Ember Fang'],
    Water: ['Aqua Slash', 'Pressure Wave'],
    Dark: ['Shadow Feint', 'Void Cut'],
    Light: ['Prism Flash', 'Solar Pulse'],
    Machine: ['Gear Burst', 'Servo Strike'],
    Beast: ['Fang Break', 'Claw Rush'],
    Toxic: ['Venom Mist', 'Ooze Shot'],
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
