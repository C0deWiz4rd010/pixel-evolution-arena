import { BattleCategoryId, BattleStanceId } from './battle.rules';
import { DailyObjectiveId } from './daily.rules';

export type BattleContractTone = 'safe' | 'daily' | 'growth' | 'payout' | 'blocked';

export interface BattleContractCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  confidence: string;
  tone: BattleContractTone;
  stanceId: BattleStanceId;
  categoryId: BattleCategoryId;
  itemName: string | null;
  applyLabel: string;
  launchLabel: string;
  disabled: boolean;
  priority: number;
}

export interface BattleContractSnapshot {
  squadSize: number;
  winChancePercent: number;
  nextWinCoins: number;
  nextWinDna: number;
  nextWinXp: number;
  itemChancePercent: number;
  winStreak: number;
  overdriveReady: boolean;
  dailyObjectiveId: DailyObjectiveId;
  dailyLabel: string;
  dailyProgress: number;
  dailyGoal: number;
  dailyComplete: boolean;
  routeTargetName: string | null;
  routeReady: boolean;
  routePercent: number;
  routeWinsNeeded: number | null;
  claimableChapterTitle: string | null;
  safeItemName: string | null;
  pushItemName: string | null;
}

export function buildBattleContracts(snapshot: BattleContractSnapshot): BattleContractCard[] {
  if (snapshot.squadSize === 0) {
    return [
      {
        id: 'load-squad',
        label: 'Contract Lock',
        title: 'Load a squad first',
        detail: 'Contracts need at least one allied signal before the arena can calculate risk.',
        metric: '0/3 squad',
        confidence: 'Offline',
        tone: 'blocked',
        stanceId: 'balanced',
        categoryId: 'training',
        itemName: null,
        applyLabel: 'No Squad',
        launchLabel: 'Build Squad',
        disabled: true,
        priority: 200,
      },
    ];
  }

  const contracts = [
    buildDailyContract(snapshot),
    buildSafetyContract(snapshot),
    buildEvolutionFarmContract(snapshot),
    buildPayoutContract(snapshot),
  ];

  return contracts
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);
}

function buildDailyContract(snapshot: BattleContractSnapshot): BattleContractCard {
  const remaining = Math.max(0, snapshot.dailyGoal - snapshot.dailyProgress);

  if (snapshot.dailyComplete) {
    return {
      id: 'daily-contract',
      label: 'Daily Contract',
      title: 'Daily directive secured',
      detail: 'The daily payout is banked. Use this slot for clean resource farming.',
      metric: 'CLAIMED',
      confidence: `${snapshot.winChancePercent}% win`,
      tone: 'daily',
      stanceId: 'balanced',
      categoryId: 'standard',
      itemName: null,
      applyLabel: 'Prep Stable',
      launchLabel: 'Run Stable',
      disabled: false,
      priority: 45,
    };
  }

  const base = {
    id: 'daily-contract',
    label: 'Daily Contract',
    metric: `${snapshot.dailyProgress}/${snapshot.dailyGoal}`,
    confidence: `${snapshot.winChancePercent}% win`,
    tone: 'daily' as const,
    disabled: false,
    priority: 118 + remaining,
  };

  switch (snapshot.dailyObjectiveId) {
    case 'win-risk':
      return {
        ...base,
        title: `${remaining} Risk win${remaining === 1 ? '' : 's'} needed`,
        detail: `${snapshot.dailyLabel} rewards a high-stakes win. Aggro/Risk improves payout if the forecast can hold.`,
        stanceId: 'aggressive',
        categoryId: 'risk',
        itemName: snapshot.pushItemName,
        applyLabel: 'Prep Risk',
        launchLabel: 'Launch Risk',
        priority: snapshot.winChancePercent >= 58 ? 128 : 108,
      };
    case 'use-overdrive':
      return {
        ...base,
        title: snapshot.overdriveReady ? 'Spend Overdrive today' : 'Charge Overdrive',
        detail: snapshot.overdriveReady
          ? `${snapshot.dailyLabel} is ready for an armed push. Use Standard unless the forecast is dominant.`
          : 'Overdrive is not ready yet. Run Standard to keep the charge moving.',
        stanceId: snapshot.overdriveReady ? 'aggressive' : 'balanced',
        categoryId: snapshot.overdriveReady && snapshot.winChancePercent >= 70 ? 'risk' : 'standard',
        itemName: snapshot.overdriveReady ? snapshot.pushItemName : null,
        applyLabel: snapshot.overdriveReady ? 'Prep OD' : 'Prep Core',
        launchLabel: snapshot.overdriveReady ? 'Launch OD' : 'Run Core',
      };
    case 'flawless-twice':
      return {
        ...base,
        title: `${remaining} clean win${remaining === 1 ? '' : 's'} needed`,
        detail: 'Guard stance and Training risk protect the flawless objective better than greedy payout runs.',
        stanceId: 'defensive',
        categoryId: 'training',
        itemName: snapshot.safeItemName,
        applyLabel: 'Prep Clean',
        launchLabel: 'Launch Clean',
      };
    case 'land-critical':
      return {
        ...base,
        title: 'Hunt a critical win',
        detail: 'Aggressive pressure and a stronger reward profile give the combat log more spike potential.',
        stanceId: 'aggressive',
        categoryId: snapshot.winChancePercent >= 60 ? 'risk' : 'standard',
        itemName: snapshot.pushItemName,
        applyLabel: 'Prep Crit',
        launchLabel: 'Launch Crit',
      };
    case 'reach-streak':
      return {
        ...base,
        title: `Reach streak ${snapshot.dailyGoal}`,
        detail: `Current chain x${snapshot.winStreak}. Stable Standard runs protect the streak objective.`,
        stanceId: snapshot.winChancePercent >= 72 ? 'aggressive' : 'balanced',
        categoryId: 'standard',
        itemName: snapshot.winChancePercent < 60 ? snapshot.safeItemName : null,
        applyLabel: 'Prep Streak',
        launchLabel: 'Run Streak',
      };
    case 'win-three':
    default:
      return {
        ...base,
        title: `${remaining} win${remaining === 1 ? '' : 's'} to daily clear`,
        detail: 'Standard runs keep the daily loop fast while still paying full baseline rewards.',
        stanceId: snapshot.winChancePercent >= 70 ? 'aggressive' : 'balanced',
        categoryId: 'standard',
        itemName: snapshot.winChancePercent < 55 ? snapshot.safeItemName : null,
        applyLabel: 'Prep Daily',
        launchLabel: 'Run Daily',
      };
  }
}

function buildSafetyContract(snapshot: BattleContractSnapshot): BattleContractCard {
  const unstable = snapshot.winChancePercent < 50 || snapshot.squadSize < 3;
  return {
    id: 'safety-contract',
    label: 'Safety Contract',
    title: unstable ? 'Stabilize the next sim' : 'Low-risk XP bank',
    detail: unstable
      ? 'Training risk and Guard stance turn a shaky forecast into safer XP and Overdrive charge.'
      : 'Use this when you want progress without threatening the current chain.',
    metric: `+${Math.round(snapshot.nextWinXp * 0.82)} XP plan`,
    confidence: unstable ? 'Recommended' : `${snapshot.winChancePercent}% win`,
    tone: 'safe',
    stanceId: 'defensive',
    categoryId: 'training',
    itemName: snapshot.safeItemName,
    applyLabel: 'Prep Safe',
    launchLabel: 'Launch Safe',
    disabled: false,
    priority: unstable ? 130 : 54,
  };
}

function buildEvolutionFarmContract(snapshot: BattleContractSnapshot): BattleContractCard {
  if (!snapshot.routeTargetName) {
    return {
      id: 'evolution-contract',
      label: 'Route Contract',
      title: 'Scout the next route',
      detail: 'No reachable target is pinned. Standard battles still reveal resources, XP, and item pressure.',
      metric: `${snapshot.itemChancePercent}% item`,
      confidence: `${snapshot.winChancePercent}% win`,
      tone: 'growth',
      stanceId: 'balanced',
      categoryId: 'standard',
      itemName: null,
      applyLabel: 'Prep Scout',
      launchLabel: 'Scout Run',
      disabled: false,
      priority: 50,
    };
  }

  if (snapshot.routeReady) {
    return {
      id: 'evolution-contract',
      label: 'Route Contract',
      title: `${snapshot.routeTargetName} already ready`,
      detail: 'Evolution is available now. Farm only if you intentionally want extra resources first.',
      metric: 'READY',
      confidence: 'Spend first',
      tone: 'growth',
      stanceId: 'balanced',
      categoryId: 'standard',
      itemName: null,
      applyLabel: 'Prep Farm',
      launchLabel: 'Farm Anyway',
      disabled: false,
      priority: 62,
    };
  }

  const wins = snapshot.routeWinsNeeded ?? 1;
  const wantsItemOdds = wins >= 3 && snapshot.itemChancePercent < 40 && snapshot.winChancePercent >= 62;

  return {
    id: 'evolution-contract',
    label: 'Route Contract',
    title: `${wins} win${wins === 1 ? '' : 's'} to ${snapshot.routeTargetName}`,
    detail: `Farm route sync from ${snapshot.routePercent}% with XP, CR, DNA, and item pressure in one run.`,
    metric: `+${snapshot.nextWinXp} XP / +${snapshot.nextWinDna} DNA`,
    confidence: `${snapshot.winChancePercent}% win`,
    tone: 'growth',
    stanceId: wantsItemOdds ? 'aggressive' : 'balanced',
    categoryId: wantsItemOdds ? 'risk' : 'standard',
    itemName: wantsItemOdds ? snapshot.pushItemName : null,
    applyLabel: 'Prep Route',
    launchLabel: 'Farm Route',
    disabled: false,
    priority: wins <= 2 ? 116 : 92,
  };
}

function buildPayoutContract(snapshot: BattleContractSnapshot): BattleContractCard {
  const pushReady = snapshot.winChancePercent >= 72 || snapshot.winStreak >= 2 || snapshot.overdriveReady;
  return {
    id: 'payout-contract',
    label: 'Payout Contract',
    title: pushReady ? 'Cash the advantage' : 'Hold payout pressure',
    detail: pushReady
      ? 'Aggro/Risk converts the current forecast into higher CR, XP, and item odds.'
      : 'Standard pressure keeps rewards flowing until the forecast is ready for a greedier push.',
    metric: `+${snapshot.nextWinCoins} CR / ${snapshot.itemChancePercent}% item`,
    confidence: snapshot.claimableChapterTitle ? 'Claim waiting' : `${snapshot.winChancePercent}% win`,
    tone: 'payout',
    stanceId: pushReady ? 'aggressive' : 'balanced',
    categoryId: pushReady ? 'risk' : 'standard',
    itemName: pushReady ? snapshot.pushItemName : null,
    applyLabel: pushReady ? 'Prep Push' : 'Prep Pay',
    launchLabel: pushReady ? 'Launch Push' : 'Run Pay',
    disabled: false,
    priority: pushReady ? 104 + Math.min(16, snapshot.winStreak * 3) : 70,
  };
}
