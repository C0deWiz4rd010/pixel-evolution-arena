import { BattleCategoryId } from './battle.rules';

/**
 * Tägliche Directive — datum-seeded Session-Hook. Deterministisch aus dem
 * lokalen Datum gewählt; rollt bei Datumswechsel neu.
 */
export type DailyObjectiveId = 'win-three' | 'land-critical' | 'flawless-twice' | 'use-overdrive' | 'win-risk' | 'reach-streak';

export interface DailyObjectiveDef {
  id: DailyObjectiveId;
  label: string;
  detail: string;
  icon: string;
  goal: number;
  reward: { coins: number; dnaShards: number };
}

export interface DailyDirectiveState {
  dateKey: string;
  objectiveId: DailyObjectiveId;
  progress: number;
  claimed: boolean;
}

export interface DailyBattleSignal {
  won: boolean;
  criticalHit: boolean;
  flawless: boolean;
  overdriveUsed: boolean;
  category: BattleCategoryId;
  streakAfter: number;
}

export const DAILY_OBJECTIVES: DailyObjectiveDef[] = [
  { id: 'win-three', label: 'Daily Sweep', detail: 'Gewinne heute 3 Arena-Kämpfe.', icon: '◈', goal: 3, reward: { coins: 240, dnaShards: 8 } },
  { id: 'land-critical', label: 'Critical Strike', detail: 'Lande heute einen kritischen Sieg.', icon: '⚡', goal: 1, reward: { coins: 200, dnaShards: 6 } },
  { id: 'flawless-twice', label: 'No Scratches', detail: 'Gewinne heute 2 Kämpfe makellos.', icon: '❖', goal: 2, reward: { coins: 260, dnaShards: 9 } },
  { id: 'use-overdrive', label: 'Unleash', detail: 'Setze heute deinen Overdrive ein.', icon: '◉', goal: 1, reward: { coins: 220, dnaShards: 7 } },
  { id: 'win-risk', label: 'High Stakes', detail: 'Gewinne heute 2 Risk-Runs.', icon: '▲', goal: 2, reward: { coins: 300, dnaShards: 10 } },
  { id: 'reach-streak', label: 'Momentum', detail: 'Erreiche heute eine Siegesserie von 3.', icon: '⥣', goal: 3, reward: { coins: 260, dnaShards: 9 } },
];

export function getDailyObjectiveDef(id: DailyObjectiveId): DailyObjectiveDef {
  return DAILY_OBJECTIVES.find((objective) => objective.id === id) ?? DAILY_OBJECTIVES[0];
}

/** Lokaler Tagesschlüssel YYYY-MM-DD. */
export function getDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** Wählt deterministisch eine Directive für den Tagesschlüssel. */
export function rollDailyDirective(dateKey: string): DailyDirectiveState {
  const objective = DAILY_OBJECTIVES[hashString(dateKey) % DAILY_OBJECTIVES.length];
  return { dateKey, objectiveId: objective.id, progress: 0, claimed: false };
}

/** Liefert die aktuelle Directive oder rollt eine neue, falls der Tag wechselte. */
export function ensureDailyDirective(current: DailyDirectiveState | null, dateKey: string): DailyDirectiveState {
  if (current && current.dateKey === dateKey) {
    return current;
  }
  return rollDailyDirective(dateKey);
}

export function isDailyComplete(state: DailyDirectiveState): boolean {
  return state.progress >= getDailyObjectiveDef(state.objectiveId).goal;
}

/** Erhöht den Fortschritt nach einem Kampf gemäß dem Tagesziel. */
export function progressDaily(state: DailyDirectiveState, signal: DailyBattleSignal): DailyDirectiveState {
  const goal = getDailyObjectiveDef(state.objectiveId).goal;
  let progress = state.progress;

  switch (state.objectiveId) {
    case 'win-three':
      progress += signal.won ? 1 : 0;
      break;
    case 'land-critical':
      progress += signal.won && signal.criticalHit ? 1 : 0;
      break;
    case 'flawless-twice':
      progress += signal.won && signal.flawless ? 1 : 0;
      break;
    case 'use-overdrive':
      progress += signal.overdriveUsed ? 1 : 0;
      break;
    case 'win-risk':
      progress += signal.won && signal.category === 'risk' ? 1 : 0;
      break;
    case 'reach-streak':
      progress = Math.max(progress, signal.streakAfter);
      break;
  }

  return { ...state, progress: Math.min(goal, progress) };
}
