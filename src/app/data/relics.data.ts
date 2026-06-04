import { ExpeditionRelicDef } from '../models/expedition.model';

/** Run-only relics. Original, brand-safe names. */
export const RELIC_DEFS: ExpeditionRelicDef[] = [
  {
    id: 'relic-edge',
    name: 'Razor Sigil',
    icon: 'AT',
    detail: 'Run battles deal more damage (+8% attack).',
    effect: { attackBonus: 0.08 },
  },
  {
    id: 'relic-bulwark',
    name: 'Bulwark Sigil',
    icon: 'DF',
    detail: 'Soak more punishment in run battles (+10% mitigation).',
    effect: { mitigation: 0.1 },
  },
  {
    id: 'relic-greed',
    name: 'Greed Prism',
    icon: 'CR',
    detail: 'Run battle rewards are richer (+25%).',
    effect: { rewardMultiplier: 1.25 },
  },
  {
    id: 'relic-mend',
    name: 'Mending Coil',
    icon: 'HP',
    detail: 'Recover run health after each win (+12% max).',
    effect: { healOnWin: 0.12 },
  },
  {
    id: 'relic-core',
    name: 'Core Magnet',
    icon: 'CO',
    detail: 'Bank extra Cores when the run is cleared (+5).',
    effect: { coresOnClear: 5 },
  },
  {
    id: 'relic-vigor',
    name: 'Vigor Engine',
    icon: 'VG',
    detail: 'A balanced edge: +5% attack and +5% mitigation.',
    effect: { attackBonus: 0.05, mitigation: 0.05 },
  },
];

const RELIC_BY_ID = new Map(RELIC_DEFS.map((relic) => [relic.id, relic]));

export function getRelicDef(id: string): ExpeditionRelicDef | undefined {
  return RELIC_BY_ID.get(id);
}
