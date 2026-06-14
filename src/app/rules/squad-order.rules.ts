export type SquadOrderTone = 'ready' | 'growth' | 'warning' | 'battle' | 'gear';

export type SquadOrderActionId = 'auto-squad' | 'swap-reserve' | 'train-squad' | 'auto-equip' | 'evolve-ready' | 'open-arena';

export interface SquadOrderCard {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  tone: SquadOrderTone;
  actionId: SquadOrderActionId;
  actionLabel: string;
  priority: number;
  disabled: boolean;
}

export interface SquadOrderSnapshot {
  squadSize: number;
  teamPower: number;
  enemyPower: number;
  winChancePercent: number;
  candidateName: string | null;
  weakestName: string | null;
  powerGain: number;
  trainingLabel: string;
  trainingXp: number;
  trainingCost: number;
  canTrain: boolean;
  gearReady: boolean;
  gearPowerGain: number;
  readyEvolutionName: string | null;
  typePressureLabel: string;
  synergyCount: number;
}

export function buildSquadOrders(snapshot: SquadOrderSnapshot): SquadOrderCard[] {
  const orders: SquadOrderCard[] = [];

  if (snapshot.squadSize === 0) {
    return [
      {
        id: 'load-squad',
        label: 'Formation',
        title: snapshot.candidateName ? `Load ${snapshot.candidateName}` : 'Formation offline',
        detail: snapshot.candidateName
          ? 'Auto Squad will choose the strongest starter mix and unlock battle rewards immediately.'
          : 'Unlock a creature before the squad grid can come online.',
        metric: '0/3',
        tone: 'warning',
        actionId: 'auto-squad',
        actionLabel: 'Auto Squad',
        priority: 140,
        disabled: !snapshot.candidateName,
      },
    ];
  }

  if (snapshot.squadSize < 3) {
    orders.push({
      id: 'fill-slots',
      label: 'Formation',
      title: `${3 - snapshot.squadSize} open slot${snapshot.squadSize === 2 ? '' : 's'}`,
      detail: snapshot.candidateName
        ? `Load ${snapshot.candidateName} to improve XP spread, odds, and Overdrive charge.`
        : 'Reserve pool is empty. Unlock or evolve another signal to fill the team.',
      metric: `${snapshot.squadSize}/3`,
      tone: 'growth',
      actionId: 'auto-squad',
      actionLabel: 'Fill Squad',
      priority: 130,
      disabled: !snapshot.candidateName,
    });
  }

  if (snapshot.candidateName && snapshot.weakestName && snapshot.powerGain > 0) {
    orders.push({
      id: 'swap-reserve',
      label: 'Reserve Patch',
      title: `Swap in ${snapshot.candidateName}`,
      detail: `Replace ${snapshot.weakestName} for a projected +${snapshot.powerGain} team power.`,
      metric: `+${snapshot.powerGain} PW`,
      tone: 'ready',
      actionId: 'swap-reserve',
      actionLabel: 'Swap',
      priority: 122,
      disabled: false,
    });
  }

  if (snapshot.gearReady) {
    orders.push({
      id: 'gear-sync',
      label: 'Loadout',
      title: 'Auto-equip best gear',
      detail: snapshot.gearPowerGain > 0
        ? `Gear plan projects +${snapshot.gearPowerGain} team power.`
        : 'Open gear slots can be synced across the active squad.',
      metric: snapshot.gearPowerGain > 0 ? `+${snapshot.gearPowerGain} PW` : 'GEAR',
      tone: 'gear',
      actionId: 'auto-equip',
      actionLabel: 'Sync Gear',
      priority: 112,
      disabled: false,
    });
  }

  if (snapshot.readyEvolutionName) {
    orders.push({
      id: 'ready-evolution',
      label: 'Roster Spike',
      title: `${snapshot.readyEvolutionName} can evolve`,
      detail: 'Spend the ready route before more XP flows into the older form.',
      metric: 'EVOLVE',
      tone: 'ready',
      actionId: 'evolve-ready',
      actionLabel: 'Evolve',
      priority: 108,
      disabled: false,
    });
  }

  const trainingPriority = snapshot.winChancePercent < 55 || snapshot.squadSize < 3 ? 104 : 68;
  orders.push({
    id: 'squad-training',
    label: 'Calibration',
    title: snapshot.trainingLabel,
    detail: snapshot.canTrain
      ? `Spend ${snapshot.trainingCost} CR to grant +${snapshot.trainingXp} XP to each online squad signal.`
      : `Needs ${snapshot.trainingCost} CR before squad calibration can run.`,
    metric: `+${snapshot.trainingXp} XP`,
    tone: snapshot.canTrain ? 'growth' : 'warning',
    actionId: 'train-squad',
    actionLabel: 'Train',
    priority: trainingPriority,
    disabled: !snapshot.canTrain,
  });

  const powerDelta = snapshot.teamPower - snapshot.enemyPower;
  orders.push({
    id: 'battle-ready',
    label: 'Arena',
    title: snapshot.winChancePercent >= 65 ? 'Squad ready for battle' : 'Battle with caution',
    detail:
      snapshot.synergyCount > 0
        ? `${snapshot.synergyCount} synergy signal${snapshot.synergyCount === 1 ? '' : 's'} active. ${snapshot.typePressureLabel}.`
        : `Power delta ${powerDelta >= 0 ? '+' : ''}${powerDelta}. ${snapshot.typePressureLabel}.`,
    metric: `${snapshot.winChancePercent}% win`,
    tone: snapshot.winChancePercent >= 65 ? 'battle' : 'warning',
    actionId: 'open-arena',
    actionLabel: 'Open Arena',
    priority: snapshot.squadSize === 3 && snapshot.winChancePercent >= 65 ? 96 : 58,
    disabled: false,
  });

  return orders.sort((left, right) => right.priority - left.priority).slice(0, 3);
}
