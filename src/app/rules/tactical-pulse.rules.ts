export type TacticalPulseChoice = 'break' | 'guard' | 'surge';

export interface TacticalPulseOption {
  id: TacticalPulseChoice;
  label: string;
  detail: string;
  attackMod: number;
  mitigation: number;
  masteryMultiplier: number;
  tone: 'focus' | 'safe' | 'risk';
}

export const TACTICAL_PULSE_OPTIONS: readonly TacticalPulseOption[] = [
  {
    id: 'break',
    label: 'Break',
    detail: 'Interrupt the charge with a balanced counter.',
    attackMod: 0.07,
    mitigation: 0.1,
    masteryMultiplier: 1.1,
    tone: 'focus',
  },
  {
    id: 'guard',
    label: 'Guard',
    detail: 'Shield the squad and absorb the next impact.',
    attackMod: 0,
    mitigation: 0.3,
    masteryMultiplier: 1,
    tone: 'safe',
  },
  {
    id: 'surge',
    label: 'Surge',
    detail: 'Push for damage and Mastery at higher risk.',
    attackMod: 0.18,
    mitigation: -0.1,
    masteryMultiplier: 1.35,
    tone: 'risk',
  },
];

export function getTacticalPulseOption(choice: TacticalPulseChoice): TacticalPulseOption {
  return TACTICAL_PULSE_OPTIONS.find((option) => option.id === choice) ?? TACTICAL_PULSE_OPTIONS[1];
}

export function recommendTacticalPulse(winChancePercent: number): TacticalPulseChoice {
  if (winChancePercent < 45) return 'guard';
  if (winChancePercent < 72) return 'break';
  return 'surge';
}
