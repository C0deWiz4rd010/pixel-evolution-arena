import { MonsterType } from '../models/monster.model';

export type TypeMatchupValue = -1 | 0 | 1;

export interface TypePressureSummary {
  label: string;
  detail: string;
  strongCount: number;
  riskCount: number;
  modifier: number;
}

const TYPE_STRENGTHS: Partial<Record<MonsterType, MonsterType[]>> = {
  Nature: ['Water', 'Toxic'],
  Fire: ['Nature', 'Beast'],
  Water: ['Fire', 'Machine'],
  Dark: ['Light'],
  Light: ['Dark', 'Toxic'],
  Machine: ['Beast', 'Light'],
  Beast: ['Dark', 'Machine'],
  Toxic: ['Nature', 'Water'],
};

const TYPE_WEAKNESSES: Partial<Record<MonsterType, MonsterType[]>> = {
  Nature: ['Fire', 'Toxic'],
  Fire: ['Water'],
  Water: ['Nature', 'Toxic'],
  Dark: ['Light', 'Beast'],
  Light: ['Machine', 'Dark'],
  Machine: ['Water', 'Beast'],
  Beast: ['Fire', 'Machine'],
  Toxic: ['Light', 'Nature'],
};

export function getTypeMatchupValue(attacker: MonsterType, defender: MonsterType): TypeMatchupValue {
  if (TYPE_STRENGTHS[attacker]?.includes(defender)) {
    return 1;
  }

  if (TYPE_WEAKNESSES[attacker]?.includes(defender)) {
    return -1;
  }

  return 0;
}

export function evaluateTypePressure(attackerTypes: MonsterType[], defenderTypes: MonsterType[], invertTone = false): TypePressureSummary {
  if (attackerTypes.length === 0 || defenderTypes.length === 0) {
    return {
      label: invertTone ? 'Enemy neutral read' : 'Neutral read',
      detail: invertTone ? 'No squad signal is active yet.' : 'No clear type edge yet.',
      strongCount: 0,
      riskCount: 0,
      modifier: 0,
    };
  }

  let strongCount = 0;
  let riskCount = 0;
  let score = 0;

  for (const attackerType of attackerTypes) {
    const matchups = defenderTypes.map((defenderType) => getTypeMatchupValue(attackerType, defenderType));
    const best = Math.max(...matchups);
    const worst = Math.min(...matchups);

    if (best > 0) {
      strongCount += 1;
    }

    if (worst < 0) {
      riskCount += 1;
    }

    score += best * 0.03 + worst * 0.01;
  }

  const modifier = clampModifier(score, -0.12, 0.12);

  if (modifier >= 0.07) {
    return {
      label: invertTone ? 'Enemy edge' : 'Type edge secured',
      detail: invertTone ? 'The enemy lineup can punish your current signals.' : `${strongCount} clean matchup lanes are open against the arena grid.`,
      strongCount,
      riskCount,
      modifier,
    };
  }

  if (modifier <= -0.03) {
    return {
      label: invertTone ? 'Enemy strain' : 'Type pressure against you',
      detail: invertTone ? `${strongCount} enemy openings are online.` : `The enemy grid can answer ${riskCount} of your active routes cleanly.`,
      strongCount,
      riskCount,
      modifier,
    };
  }

  return {
    label: invertTone ? 'Enemy neutral read' : 'Contested type grid',
    detail: invertTone ? 'The enemy lineup is reading neutral into your squad.' : 'Neither side has a clean matchup lock yet.',
    strongCount,
    riskCount,
    modifier,
  };
}

function clampModifier(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
