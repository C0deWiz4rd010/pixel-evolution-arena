import { MonsterStage } from '../models/monster.model';

/** CSS class suffix per stage (`stage-<suffix>`), matching the `.stage-*` tokens in styles.scss. */
export const STAGE_CLASS: Readonly<Record<MonsterStage, string>> = {
  Baby: 'baby',
  'In-Training': 'intraining',
  Rookie: 'rookie',
  Champion: 'champion',
  Ultimate: 'ultimate',
  Mega: 'mega',
  Special: 'special',
};

/** Two-letter stage code used by dex chips, progress rows and color-independent labels. */
export const STAGE_GLYPH: Readonly<Record<MonsterStage, string>> = {
  Baby: 'BB',
  'In-Training': 'IT',
  Rookie: 'RK',
  Champion: 'CH',
  Ultimate: 'UL',
  Mega: 'MG',
  Special: 'SP',
};

export function stageClass(stage: MonsterStage): string {
  return STAGE_CLASS[stage] ?? 'rookie';
}

export function stageGlyph(stage: MonsterStage): string {
  return STAGE_GLYPH[stage] ?? '??';
}
