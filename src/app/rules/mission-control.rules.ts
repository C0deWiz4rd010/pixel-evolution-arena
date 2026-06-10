import { MetaActionId } from './command-center.rules';

export type MissionControlTone = 'blocked' | 'ready' | 'battle' | 'growth' | 'meta';

export interface MissionControlCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  progressPercent: number;
  tone: MissionControlTone;
  actionId: MetaActionId;
  actionLabel: string;
}

export interface MissionControlSnapshot {
  squadSize: number;
  teamPower: number;
  enemyPower: number;
  winChancePercent: number;
  itemChancePercent: number;
  nextWinCoins: number;
  nextWinXp: number;
  readyEvolutionName: string | null;
  nextEvolutionName: string | null;
  nextEvolutionPercent: number;
  nextEvolutionBlocker: string | null;
  unlockedCount: number;
  totalMonsters: number;
  dailyLabel: string;
  dailyProgress: number;
  dailyGoal: number;
  dailyComplete: boolean;
  battleIntelTotal: number;
  battleIntelWinRate: number;
  battleTrend: 'empty' | 'hot' | 'steady' | 'cold';
  claimableChapterTitle: string | null;
  expeditionReady: boolean;
  forgeReady: boolean;
}

export function buildMissionControlCards(snapshot: MissionControlSnapshot): MissionControlCard[] {
  const squadPercent = clampPercent((snapshot.squadSize / 3) * 100);
  const powerPercent = snapshot.enemyPower > 0 ? clampPercent((snapshot.teamPower / snapshot.enemyPower) * 100) : 0;
  const dailyPercent = snapshot.dailyGoal > 0 ? clampPercent((snapshot.dailyProgress / snapshot.dailyGoal) * 100) : 100;
  const rosterPercent = snapshot.totalMonsters > 0 ? clampPercent((snapshot.unlockedCount / snapshot.totalMonsters) * 100) : 100;

  return [
    buildLoopCard(snapshot, squadPercent),
    buildEvolutionCard(snapshot),
    buildArenaCard(snapshot, powerPercent),
    buildRosterCard(snapshot, rosterPercent),
    buildMetaCard(snapshot, dailyPercent),
  ];
}

function buildLoopCard(snapshot: MissionControlSnapshot, squadPercent: number): MissionControlCard {
  if (snapshot.squadSize === 0) {
    return {
      id: 'loop-priority',
      label: 'Loop Priority',
      title: 'Load a squad first',
      detail: 'No rewards can flow until at least one unlocked creature is assigned.',
      metric: '0/3 squad',
      progressPercent: squadPercent,
      tone: 'blocked',
      actionId: 'auto-squad',
      actionLabel: 'Auto Squad',
    };
  }

  if (snapshot.readyEvolutionName) {
    return {
      id: 'loop-priority',
      label: 'Loop Priority',
      title: `${snapshot.readyEvolutionName} is ready`,
      detail: 'Convert the route before farming more so the stronger form earns future XP.',
      metric: 'EVOLVE',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'evolve-ready',
      actionLabel: 'Evolve',
    };
  }

  if (snapshot.squadSize < 3) {
    return {
      id: 'loop-priority',
      label: 'Loop Priority',
      title: `${3 - snapshot.squadSize} squad slot${snapshot.squadSize === 2 ? '' : 's'} open`,
      detail: 'Fill the formation to stabilize battle rolls and speed up progression.',
      metric: `${snapshot.squadSize}/3 squad`,
      progressPercent: squadPercent,
      tone: 'growth',
      actionId: 'auto-squad',
      actionLabel: 'Fill Squad',
    };
  }

  return {
    id: 'loop-priority',
    label: 'Loop Priority',
    title: snapshot.winChancePercent >= 70 ? 'Battle loop is hot' : 'Tune the next battle',
    detail:
      snapshot.winChancePercent >= 70
        ? 'The squad is full and the forecast is favorable. Cash the next quick run.'
        : 'The squad is full, but the forecast is tight. Prep stance, items, or drills before launching.',
    metric: `${snapshot.winChancePercent}% win`,
    progressPercent: snapshot.winChancePercent,
    tone: snapshot.winChancePercent >= 70 ? 'battle' : 'meta',
    actionId: 'run-battle',
    actionLabel: snapshot.winChancePercent >= 70 ? 'Run Battle' : 'Open Arena',
  };
}

function buildEvolutionCard(snapshot: MissionControlSnapshot): MissionControlCard {
  if (snapshot.readyEvolutionName) {
    return {
      id: 'evolution-pressure',
      label: 'Evolution',
      title: `${snapshot.readyEvolutionName} route open`,
      detail: 'All requirements are met. This is the fastest visible power jump.',
      metric: '100% sync',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'evolve-ready',
      actionLabel: 'Evolve Now',
    };
  }

  if (snapshot.nextEvolutionName) {
    return {
      id: 'evolution-pressure',
      label: 'Evolution',
      title: `${snapshot.nextEvolutionName} chase`,
      detail: snapshot.nextEvolutionBlocker
        ? `Next blocker: ${snapshot.nextEvolutionBlocker}. Battles and drills feed the route.`
        : 'Keep farming the source line until the route clears.',
      metric: `${clampPercent(snapshot.nextEvolutionPercent)}% sync`,
      progressPercent: snapshot.nextEvolutionPercent,
      tone: 'growth',
      actionId: 'run-battle',
      actionLabel: 'Farm Route',
    };
  }

  return {
    id: 'evolution-pressure',
    label: 'Evolution',
    title: 'Reachable routes clear',
    detail: 'Push archive cleanup, campaign, or battle milestones while scouting deeper branches.',
    metric: `${snapshot.unlockedCount}/${snapshot.totalMonsters}`,
    progressPercent: 100,
    tone: 'meta',
    actionId: 'run-battle',
    actionLabel: 'Keep Pushing',
  };
}

function buildArenaCard(snapshot: MissionControlSnapshot, powerPercent: number): MissionControlCard {
  if (snapshot.squadSize === 0) {
    return {
      id: 'arena-readiness',
      label: 'Arena',
      title: 'Battle blocked',
      detail: 'Assign a squad before the reward simulator can start.',
      metric: 'NO SQUAD',
      progressPercent: 0,
      tone: 'blocked',
      actionId: 'auto-squad',
      actionLabel: 'Build Squad',
    };
  }

  return {
    id: 'arena-readiness',
    label: 'Arena',
    title: snapshot.winChancePercent >= 65 ? 'Reward window live' : 'Run needs prep',
    detail: `Next win projects +${snapshot.nextWinCoins} CR, +${snapshot.nextWinXp} XP, ${snapshot.itemChancePercent}% item chance.`,
    metric: `${snapshot.teamPower}/${snapshot.enemyPower} PW`,
    progressPercent: Math.max(powerPercent, snapshot.winChancePercent),
    tone: snapshot.winChancePercent >= 65 ? 'battle' : 'meta',
    actionId: 'run-battle',
    actionLabel: snapshot.winChancePercent >= 65 ? 'Launch' : 'Prep',
  };
}

function buildRosterCard(snapshot: MissionControlSnapshot, rosterPercent: number): MissionControlCard {
  return {
    id: 'roster-growth',
    label: 'Archive',
    title: `${snapshot.unlockedCount}/${snapshot.totalMonsters} signals online`,
    detail:
      snapshot.nextEvolutionName || snapshot.readyEvolutionName
        ? 'Current roster growth is tied directly to the active evolution route.'
        : 'Use filters and chase pins to pick the next locked signal.',
    metric: `${rosterPercent}% codex`,
    progressPercent: rosterPercent,
    tone: rosterPercent >= 50 ? 'growth' : 'meta',
    actionId: snapshot.readyEvolutionName ? 'evolve-ready' : 'run-battle',
    actionLabel: snapshot.readyEvolutionName ? 'Unlock' : 'Scout',
  };
}

function buildMetaCard(snapshot: MissionControlSnapshot, dailyPercent: number): MissionControlCard {
  if (snapshot.claimableChapterTitle) {
    return {
      id: 'meta-rewards',
      label: 'Meta',
      title: `${snapshot.claimableChapterTitle} claim ready`,
      detail: 'A chapter reward is waiting. Claim it before another arena run.',
      metric: 'CLAIM',
      progressPercent: 100,
      tone: 'ready',
      actionId: 'claim-chapter',
      actionLabel: 'Claim',
    };
  }

  if (!snapshot.dailyComplete) {
    return {
      id: 'meta-rewards',
      label: 'Meta',
      title: snapshot.dailyLabel,
      detail: `Daily progress ${snapshot.dailyProgress}/${snapshot.dailyGoal}. Repeatable direction keeps the session focused.`,
      metric: `${snapshot.dailyProgress}/${snapshot.dailyGoal}`,
      progressPercent: dailyPercent,
      tone: 'meta',
      actionId: 'run-battle',
      actionLabel: 'Push Daily',
    };
  }

  if (snapshot.expeditionReady || snapshot.forgeReady) {
    return {
      id: 'meta-rewards',
      label: 'Meta',
      title: snapshot.expeditionReady ? 'Expedition relay ready' : 'Forge upgrade ready',
      detail: snapshot.expeditionReady
        ? 'A side run can bank cores and keep progression varied.'
        : 'A loadout improvement is available before the next battle.',
      metric: snapshot.expeditionReady ? 'CORES' : 'GEAR',
      progressPercent: 100,
      tone: 'ready',
      actionId: snapshot.expeditionReady ? 'expedition' : 'forge-quick',
      actionLabel: snapshot.expeditionReady ? 'Relay' : 'Forge',
    };
  }

  return {
    id: 'meta-rewards',
    label: 'Meta',
    title: snapshot.battleIntelTotal > 0 ? `${snapshot.battleIntelWinRate}% win intel` : 'Seed battle intel',
    detail:
      snapshot.battleTrend === 'hot'
        ? 'Recent runs are hot. Keep compounding streak, medals, and payouts.'
        : 'Run more simulations to sharpen the dossier and expose stronger recommendations.',
    metric: snapshot.battleTrend.toUpperCase(),
    progressPercent: snapshot.battleIntelTotal > 0 ? snapshot.battleIntelWinRate : 0,
    tone: snapshot.battleTrend === 'hot' ? 'battle' : 'meta',
    actionId: 'run-battle',
    actionLabel: 'Run Sim',
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
