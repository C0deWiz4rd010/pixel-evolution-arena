import { Monster, MonsterStage } from '../models/monster.model';

export type MonsterTrainingDrillId = 'pulse' | 'burst';

export interface MonsterTrainingDrill {
  id: MonsterTrainingDrillId;
  label: string;
  detail: string;
  costCoins: number;
  xpGain: number;
}

export interface SquadTrainingDrill {
  label: string;
  detail: string;
  costCoins: number;
  xpGain: number;
}

const STAGE_ORDER: MonsterStage[] = ['Baby', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Special'];

function stageIndex(stage: MonsterStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? index : 0;
}

export function getMonsterTrainingDrills(stage: MonsterStage): MonsterTrainingDrill[] {
  const rank = stageIndex(stage);

  return [
    {
      id: 'pulse',
      label: 'Pulse Drill',
      detail: 'Cheap solo reps that keep an evolution line moving without needing a full arena run.',
      costCoins: 38 + rank * 16,
      xpGain: 18 + rank * 7,
    },
    {
      id: 'burst',
      label: 'Burst Drill',
      detail: 'Higher-cost lab pressure that trades coins for a more noticeable XP jump.',
      costCoins: 72 + rank * 28,
      xpGain: 34 + rank * 11,
    },
  ];
}

export function getSquadTrainingDrill(squad: readonly Pick<Monster, 'stage'>[]): SquadTrainingDrill {
  const highestRank = squad.reduce((max, monster) => Math.max(max, stageIndex(monster.stage)), 0);
  const memberCount = Math.max(1, squad.length);

  return {
    label: 'Calibration Sim',
    detail: 'A controlled squad simulation that grants modest XP when the next live run looks shaky.',
    costCoins: 92 + highestRank * 24 + Math.max(0, memberCount - 1) * 18,
    xpGain: 14 + highestRank * 5,
  };
}
