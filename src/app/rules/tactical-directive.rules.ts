import { MetaActionId } from './command-center.rules';

export type TacticalDirectiveTone = 'ready' | 'battle' | 'growth' | 'warning' | 'meta';

export interface TacticalDirectiveCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  progressPercent: number;
  tone: TacticalDirectiveTone;
  actionId: MetaActionId;
  actionLabel: string;
}

export interface RouteEtaInput {
  targetName: string | null;
  ready: boolean;
  percent: number;
  levelGap: number;
  xpToLevel: number;
  coinGap: number;
  dnaGap: number;
  itemMissing: boolean;
  winCoins: number;
  winDna: number;
  winXp: number;
  itemChancePercent: number;
}

export interface SquadPatchInput {
  squadSize: number;
  candidateName: string | null;
  weakestName: string | null;
  powerGain: number;
}

export interface TacticalDirectiveSnapshot {
  route: RouteEtaInput;
  squad: SquadPatchInput;
  winChancePercent: number;
  nextWinCoins: number;
  nextWinDna: number;
  nextWinXp: number;
  itemChancePercent: number;
  claimableChapterTitle: string | null;
  expeditionReady: boolean;
  forgeReady: boolean;
  dailyLabel: string;
  dailyProgress: number;
  dailyGoal: number;
  dailyComplete: boolean;
}

export function buildTacticalDirectives(snapshot: TacticalDirectiveSnapshot): TacticalDirectiveCard[] {
  return [
    buildRouteDirective(snapshot.route),
    buildSquadDirective(snapshot.squad),
    buildRunDirective(snapshot),
    buildPayoutDirective(snapshot),
  ];
}

export function estimateRouteWins(route: RouteEtaInput): number | null {
  if (!route.targetName) {
    return null;
  }

  if (route.ready) {
    return 0;
  }

  const needs: number[] = [];
  if (route.levelGap > 0) {
    needs.push(Math.ceil(route.xpToLevel / Math.max(1, route.winXp)));
  }
  if (route.coinGap > 0) {
    needs.push(Math.ceil(route.coinGap / Math.max(1, route.winCoins)));
  }
  if (route.dnaGap > 0) {
    needs.push(Math.ceil(route.dnaGap / Math.max(1, route.winDna)));
  }
  if (route.itemMissing) {
    needs.push(Math.ceil(100 / Math.max(1, route.itemChancePercent)));
  }

  return needs.length > 0 ? Math.max(...needs) : 1;
}

function buildRouteDirective(route: RouteEtaInput): TacticalDirectiveCard {
  const wins = estimateRouteWins(route);
  if (!route.targetName) {
    return {
      id: 'route-eta',
      label: 'Route ETA',
      title: 'No reachable route pressure',
      detail: 'Use archive filters or battles to expose a new evolution chase.',
      metric: 'CLEAR',
      progressPercent: 100,
      tone: 'meta',
      actionId: 'run-battle',
      actionLabel: 'Scout',
    };
  }

  if (wins === 0) {
    return {
      id: 'route-eta',
      label: 'Route ETA',
      title: `${route.targetName} is ready now`,
      detail: 'Convert it before farming so the stronger form receives future XP.',
      metric: '0 wins',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'evolve-ready',
      actionLabel: 'Evolve',
    };
  }

  const requiredWins = wins ?? 1;
  const blocker = route.itemMissing
    ? `item drop at ${route.itemChancePercent}%`
    : route.levelGap > 0
      ? `${route.levelGap} level${route.levelGap === 1 ? '' : 's'}`
      : route.dnaGap > 0
        ? `${route.dnaGap} DNA`
        : `${route.coinGap} CR`;

  return {
    id: 'route-eta',
    label: 'Route ETA',
    title: `${requiredWins} win${requiredWins === 1 ? '' : 's'} to ${route.targetName}`,
    detail: `Main blocker: ${blocker}. Standard wins project +${route.winXp} XP, +${route.winDna} DNA, +${route.winCoins} CR.`,
    metric: `${clampPercent(route.percent)}% sync`,
    progressPercent: route.percent,
    tone: requiredWins <= 2 ? 'growth' : 'meta',
    actionId: 'run-battle',
    actionLabel: 'Farm',
  };
}

function buildSquadDirective(squad: SquadPatchInput): TacticalDirectiveCard {
  if (squad.squadSize === 0) {
    return {
      id: 'squad-patch',
      label: 'Squad Patch',
      title: 'Formation offline',
      detail: 'Auto-build uses the strongest unlocked mix and unlocks battle rewards immediately.',
      metric: '0/3',
      progressPercent: 0,
      tone: 'warning',
      actionId: 'auto-squad',
      actionLabel: 'Auto Squad',
    };
  }

  if (squad.squadSize < 3) {
    return {
      id: 'squad-patch',
      label: 'Squad Patch',
      title: squad.candidateName ? `Load ${squad.candidateName}` : 'Fill open slots',
      detail: 'A fuller squad improves win odds, XP spread, and overdrive charge.',
      metric: `${squad.squadSize}/3`,
      progressPercent: clampPercent((squad.squadSize / 3) * 100),
      tone: 'growth',
      actionId: 'auto-squad',
      actionLabel: 'Fill',
    };
  }

  if (squad.candidateName && squad.weakestName && squad.powerGain > 0) {
    return {
      id: 'squad-patch',
      label: 'Squad Patch',
      title: `Swap in ${squad.candidateName}`,
      detail: `Replace ${squad.weakestName} for a projected +${squad.powerGain} PW boost.`,
      metric: `+${squad.powerGain} PW`,
      progressPercent: 100,
      tone: 'ready',
      actionId: 'auto-squad',
      actionLabel: 'Patch',
    };
  }

  return {
    id: 'squad-patch',
    label: 'Squad Patch',
    title: 'Current squad is stable',
    detail: 'No reserve currently beats the weakest loaded unit. Push XP or evolve for the next jump.',
    metric: 'STABLE',
    progressPercent: 100,
    tone: 'battle',
    actionId: 'run-battle',
    actionLabel: 'Battle',
  };
}

function buildRunDirective(snapshot: TacticalDirectiveSnapshot): TacticalDirectiveCard {
  const tone: TacticalDirectiveTone =
    snapshot.winChancePercent >= 72 ? 'battle' : snapshot.winChancePercent >= 45 ? 'growth' : 'warning';
  const title =
    snapshot.winChancePercent >= 72
      ? 'Standard run is favored'
      : snapshot.winChancePercent >= 45
        ? 'Prep a close run'
        : 'Train before risking the chain';

  return {
    id: 'run-choice',
    label: 'Run Choice',
    title,
    detail: `Forecast ${snapshot.winChancePercent}% win. Next win: +${snapshot.nextWinCoins} CR, +${snapshot.nextWinDna} DNA, +${snapshot.nextWinXp} XP, ${snapshot.itemChancePercent}% item.`,
    metric: `${snapshot.winChancePercent}% win`,
    progressPercent: snapshot.winChancePercent,
    tone,
    actionId: 'run-battle',
    actionLabel: snapshot.winChancePercent >= 45 ? 'Launch' : 'Prep',
  };
}

function buildPayoutDirective(snapshot: TacticalDirectiveSnapshot): TacticalDirectiveCard {
  if (snapshot.claimableChapterTitle) {
    return {
      id: 'payout-priority',
      label: 'Payout',
      title: `${snapshot.claimableChapterTitle} ready`,
      detail: 'Claim the chapter reward before another routine battle.',
      metric: 'CLAIM',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'claim-chapter',
      actionLabel: 'Claim',
    };
  }

  if (snapshot.expeditionReady) {
    return {
      id: 'payout-priority',
      label: 'Payout',
      title: 'Expedition side loop ready',
      detail: 'A deep-grid run can bank cores and vary the session pacing.',
      metric: 'CORES',
      progressPercent: 100,
      tone: 'meta',
      actionId: 'expedition',
      actionLabel: 'Relay',
    };
  }

  if (snapshot.forgeReady) {
    return {
      id: 'payout-priority',
      label: 'Payout',
      title: 'Forge value detected',
      detail: 'Upgrade or equip gear before spending another battle cycle.',
      metric: 'GEAR',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'forge-quick',
      actionLabel: 'Forge',
    };
  }

  const dailyPercent = snapshot.dailyGoal > 0 ? (snapshot.dailyProgress / snapshot.dailyGoal) * 100 : 100;
  return {
    id: 'payout-priority',
    label: 'Payout',
    title: snapshot.dailyComplete ? 'Daily secured' : snapshot.dailyLabel,
    detail: snapshot.dailyComplete
      ? 'Daily payout is done. Keep pushing battle intel, route ETA, or codex growth.'
      : `Daily progress ${snapshot.dailyProgress}/${snapshot.dailyGoal}.`,
    metric: snapshot.dailyComplete ? 'DONE' : `${snapshot.dailyProgress}/${snapshot.dailyGoal}`,
    progressPercent: clampPercent(dailyPercent),
    tone: snapshot.dailyComplete ? 'battle' : 'meta',
    actionId: 'run-battle',
    actionLabel: snapshot.dailyComplete ? 'Push' : 'Daily',
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
