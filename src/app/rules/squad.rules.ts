import { Monster, MonsterStage, MonsterType } from '../models/monster.model';

export interface PowerStatBlock {
  attack: number;
  defense: number;
  speed: number;
  hp: number;
}

export interface TeamSynergy {
  id: string;
  label: string;
  detail: string;
  modifier: number;
}

export function getMonsterPower(creature: PowerStatBlock): number {
  return creature.attack + creature.defense + creature.speed + creature.hp;
}

export function evaluateSquadSynergies(squad: Monster[]): TeamSynergy[] {
  if (squad.length === 0) {
    return [];
  }

  const typeCounts = new Map<MonsterType, number>();
  const stages = new Set<MonsterStage>();
  let totalAttack = 0;
  let totalDefense = 0;
  let totalSpeed = 0;

  for (const monster of squad) {
    typeCounts.set(monster.type, (typeCounts.get(monster.type) ?? 0) + 1);
    stages.add(monster.stage);
    totalAttack += monster.attack;
    totalDefense += monster.defense;
    totalSpeed += monster.speed;
  }

  const averageAttack = totalAttack / squad.length;
  const averageDefense = totalDefense / squad.length;
  const averageSpeed = totalSpeed / squad.length;
  const uniqueTypes = typeCounts.size;
  const duplicateTypeCount = [...typeCounts.values()].reduce((highest, count) => Math.max(highest, count), 0);
  const synergies: TeamSynergy[] = [];

  if (squad.length === 3 && uniqueTypes === squad.length) {
    synergies.push({ id: 'spectrum', label: 'Spectrum Protocol', detail: 'Three different types widen your clean-hit routes.', modifier: 0.09 });
  }

  if (duplicateTypeCount >= 2) {
    synergies.push({ id: 'mirror', label: 'Twin Pulse', detail: 'Shared typing sharpens combo timing and follow-up pressure.', modifier: 0.07 });
  }

  if (averageSpeed >= 72) {
    synergies.push({ id: 'velocity', label: 'Velocity Chain', detail: 'High speed creates first-strike tempo.', modifier: 0.05 });
  }

  if (averageDefense >= 72) {
    synergies.push({ id: 'bulwark', label: 'Bulwark Mesh', detail: 'Defensive overlap blunts incoming counter pressure.', modifier: 0.05 });
  }

  if (averageAttack >= 78) {
    synergies.push({ id: 'ruin', label: 'Ruin Drive', detail: 'Heavy attack values break enemy pacing faster.', modifier: 0.05 });
  }

  if (squad.length === 3 && stages.size >= 2) {
    synergies.push({ id: 'ladder', label: 'Ladder Sync', detail: 'Mixed stages smooth the curve between tempo and durability.', modifier: 0.04 });
  }

  return synergies;
}

export function calculateSquadBattleModifier(synergies: TeamSynergy[], typePressureModifier: number): number {
  const synergyModifier = synergies.reduce((total, synergy) => total + synergy.modifier, 0);
  return clampModifier(synergyModifier + typePressureModifier, -0.18, 0.22);
}

function clampModifier(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
