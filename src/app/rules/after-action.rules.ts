import { MetaActionId } from './command-center.rules';

export type AfterActionTone = 'ready' | 'battle' | 'growth' | 'warning' | 'meta';

export interface AfterActionCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  tone: AfterActionTone;
  actionId: MetaActionId;
  actionLabel: string;
  priority: number;
}

export interface AfterActionSnapshot {
  hasBattleResult: boolean;
  won: boolean;
  coins: number;
  dnaShards: number;
  xp: number;
  itemName: string | null;
  readyEvolutionName: string | null;
  claimableChapterTitle: string | null;
  squadSize: number;
  winChancePercent: number;
  forgeReady: boolean;
  forgeTitle: string;
  expeditionStatus: 'idle' | 'active' | 'reward';
  expeditionCores: number;
  dailyComplete: boolean;
}

export function buildAfterActionQueue(snapshot: AfterActionSnapshot): AfterActionCard[] {
  const cards: AfterActionCard[] = [];

  if (!snapshot.hasBattleResult) {
    cards.push({
      id: 'seed-battle',
      label: 'Start Loop',
      title: snapshot.squadSize > 0 ? 'Run the first sim' : 'Build squad first',
      detail: snapshot.squadSize > 0
        ? 'Seed the battle feed to generate XP, coins, DNA, items, and tactical history.'
        : 'Load at least one creature so the arena can start paying rewards.',
      metric: snapshot.squadSize > 0 ? `${snapshot.winChancePercent}% win` : '0/3 squad',
      tone: snapshot.squadSize > 0 ? 'battle' : 'warning',
      actionId: snapshot.squadSize > 0 ? 'run-battle' : 'auto-squad',
      actionLabel: snapshot.squadSize > 0 ? 'Start' : 'Auto Squad',
      priority: 90,
    });
    return cards;
  }

  if (snapshot.readyEvolutionName) {
    cards.push({
      id: 'evolve-spend',
      label: 'Spend Reward',
      title: `${snapshot.readyEvolutionName} is ready`,
      detail: 'Convert the route now so future XP goes into the stronger form.',
      metric: 'EVOLVE',
      tone: 'ready',
      actionId: 'evolve-ready',
      actionLabel: 'Evolve',
      priority: 120,
    });
  }

  if (snapshot.claimableChapterTitle) {
    cards.push({
      id: 'claim-chapter',
      label: 'Claim',
      title: `${snapshot.claimableChapterTitle} unlocked`,
      detail: 'A chapter reward is waiting after that progress spike.',
      metric: 'CLAIM',
      tone: 'ready',
      actionId: 'claim-chapter',
      actionLabel: 'Claim',
      priority: 110,
    });
  }

  if (snapshot.squadSize < 3) {
    cards.push({
      id: 'patch-squad',
      label: 'Formation',
      title: `${3 - snapshot.squadSize} squad slot${snapshot.squadSize === 2 ? '' : 's'} open`,
      detail: 'Fill the squad before chaining more battles for better win odds and XP spread.',
      metric: `${snapshot.squadSize}/3`,
      tone: 'growth',
      actionId: 'auto-squad',
      actionLabel: 'Fill',
      priority: 96,
    });
  }

  if (snapshot.forgeReady) {
    cards.push({
      id: 'forge-value',
      label: 'Forge',
      title: snapshot.forgeTitle,
      detail: 'Convert spare resources into a loadout improvement before the next run.',
      metric: 'GEAR',
      tone: 'ready',
      actionId: 'forge-quick',
      actionLabel: 'Forge',
      priority: 82,
    });
  }

  if (snapshot.expeditionStatus !== 'idle' || snapshot.squadSize > 0) {
    cards.push({
      id: 'expedition-relay',
      label: 'Relay',
      title:
        snapshot.expeditionStatus === 'reward'
          ? 'Bank expedition cores'
          : snapshot.expeditionStatus === 'active'
            ? 'Resume deep-grid run'
            : 'Launch side run',
      detail:
        snapshot.expeditionStatus === 'idle'
          ? 'A side loop can bank cores while the battle chain cools.'
          : 'Resolve the active expedition before starting another long push.',
      metric: snapshot.expeditionStatus === 'idle' ? 'READY' : `${snapshot.expeditionCores} cores`,
      tone: snapshot.expeditionStatus === 'reward' ? 'ready' : 'meta',
      actionId: 'expedition',
      actionLabel: snapshot.expeditionStatus === 'reward' ? 'Bank' : 'Relay',
      priority: snapshot.expeditionStatus === 'reward' ? 100 : 58,
    });
  }

  cards.push({
    id: 'run-again',
    label: snapshot.won ? 'Momentum' : 'Recovery',
    title: snapshot.won ? 'Queue another battle' : 'Retry with fallback gains',
    detail: snapshot.won
      ? `Last payout: +${snapshot.coins} CR, +${snapshot.dnaShards} DNA, +${snapshot.xp} XP${snapshot.itemName ? `, ${snapshot.itemName}` : ''}.`
      : `Loss still paid +${snapshot.coins} CR and +${snapshot.xp} XP. Patch if needed, then retry.`,
    metric: `${snapshot.winChancePercent}% win`,
    tone: snapshot.won ? 'battle' : 'warning',
    actionId: 'run-battle',
    actionLabel: snapshot.won ? 'Run Again' : 'Retry',
    priority: snapshot.dailyComplete ? 52 : 72,
  });

  return cards.sort((left, right) => right.priority - left.priority).slice(0, 3);
}
