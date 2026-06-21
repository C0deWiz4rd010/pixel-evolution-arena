import { Monster } from '../models/monster.model';
import { PlayerState } from '../models/player-state.model';

export interface RequirementStatus {
  label: string;
  met: boolean;
  current: string | number;
  required: string | number;
}

export function getRequirementStatuses(source: Monster, target: Monster, player: PlayerState): RequirementStatus[] {
  const requirements = target.requirements ?? {};
  const statuses: RequirementStatus[] = [];

  if (requirements.level !== undefined) {
    statuses.push({ label: 'Monster Level', met: source.level >= requirements.level, current: source.level, required: requirements.level });
  }

  if (requirements.coins !== undefined) {
    statuses.push({ label: 'Coins', met: player.coins >= requirements.coins, current: player.coins, required: requirements.coins });
  }

  if (requirements.dnaShards !== undefined) {
    statuses.push({ label: 'DNA Shards', met: player.dnaShards >= requirements.dnaShards, current: player.dnaShards, required: requirements.dnaShards });
  }

  if (requirements.item !== undefined) {
    const count = player.inventory.filter((item) => item === requirements.item).length;
    statuses.push({ label: requirements.item, met: count > 0, current: count, required: 1 });
  }

  if (requirements.mastery !== undefined) {
    const current = player.monsterMastery[source.id]?.battleXp ?? 0;
    statuses.push({ label: 'Battle Mastery', met: current >= requirements.mastery, current, required: requirements.mastery });
  }

  return statuses;
}

export function canEvolve(source: Monster, target: Monster, player: PlayerState): boolean {
  return source.unlocked && !target.unlocked && getRequirementStatuses(source, target, player).every((status) => status.met);
}

export function applyEvolutionToPlayer(player: PlayerState, target: Monster): PlayerState {
  const requirements = target.requirements ?? {};
  const inventory = requirements.item ? consumeInventoryItem(player.inventory, requirements.item) : player.inventory;

  return {
    ...player,
    coins: player.coins - (requirements.coins ?? 0),
    dnaShards: player.dnaShards - (requirements.dnaShards ?? 0),
    selectedMonsterId: target.id,
    inventory,
  };
}

export function unlockEvolutionTarget(monsters: Monster[], source: Monster, target: Monster): Monster[] {
  return monsters.map((monster) =>
    monster.id === target.id
      ? { ...monster, unlocked: true, level: Math.max(1, source.level - 2), xp: 0 }
      : monster,
  );
}

export function consumeInventoryItem(inventory: string[], item: string): string[] {
  const index = inventory.indexOf(item);
  if (index < 0) {
    return inventory;
  }

  return inventory.filter((_, itemIndex) => itemIndex !== index);
}
