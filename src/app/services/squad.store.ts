import { inject, Injectable } from '@angular/core';
import { STAGES } from '../data/monsters.data';
import { Monster } from '../models/monster.model';
import { SquadPreset } from '../models/player-state.model';
import { getMonsterPower } from '../rules/squad.rules';
import { MAX_SQUAD_PRESETS } from './game-state.helpers';
import { GameStore } from './game-store.service';
import { ToastService } from './toast.service';

/** Squad roster management: selection, slots, auto-build, presets and the pinned chase target. */
@Injectable({ providedIn: 'root' })
export class SquadStore {
  private readonly store = inject(GameStore);
  private readonly stages = STAGES;
  private readonly toast = inject(ToastService);

  selectMonster(id: string): void {
    this.store.player.update((player) => ({ ...player, selectedMonsterId: id }));
  }

  addToSquad(id: string): void {
    const monster = this.store.getMonsterById(id);
    if (!monster?.unlocked) {
      this.store.prependLog(`${monster?.name ?? 'Locked creature'} must be unlocked before joining the squad.`, 'system');
      return;
    }

    this.store.player.update((player) => {
      if (player.squadIds.includes(id) || player.squadIds.length >= 3) {
        return player;
      }

      return { ...player, squadIds: [...player.squadIds, id] };
    });

  }

  removeFromSquad(id: string): void {
    this.store.player.update((player) => ({ ...player, squadIds: player.squadIds.filter((squadId) => squadId !== id) }));
  }

  replaceSquadMember(removeId: string, addId: string): void {
    const monster = this.store.getMonsterById(addId);
    if (!monster?.unlocked) {
      this.store.prependLog(`${monster?.name ?? 'Locked creature'} must be unlocked before joining the squad.`, 'system');
      return;
    }

    this.store.player.update((player) => {
      if (!player.squadIds.includes(removeId) || player.squadIds.includes(addId)) {
        return player;
      }

      return {
        ...player,
        squadIds: player.squadIds.map((squadId) => (squadId === removeId ? addId : squadId)).slice(0, 3),
      };
    });

    this.store.prependLog(`${monster.name} replaced a squad slot for the next run.`, 'info');
  }

  clearSquad(): void {
    this.store.player.update((player) => ({ ...player, squadIds: [] }));
  }

  autoBuildBestSquad(): void {
    const selected: Monster[] = [];
    const unlocked = this.store.monsters().filter((monster) => monster.unlocked);

    while (selected.length < 3 && selected.length < unlocked.length) {
      const chosen = unlocked
        .filter((monster) => !selected.some((entry) => entry.id === monster.id))
        .sort((left, right) => this.scoreSquadAutofillCandidate(right, selected) - this.scoreSquadAutofillCandidate(left, selected))[0];

      if (!chosen) {
        break;
      }

      selected.push(chosen);
    }

    const nextIds = selected.map((monster) => monster.id);
    const currentIds = this.store.player().squadIds;
    if (nextIds.join('|') === currentIds.join('|')) {
      this.toast.push({
        title: 'Squad Already Tuned',
        message: 'The strongest available three-signal loadout is already online.',
        tone: 'info',
        icon: 'SQ',
        durationMs: 2800,
      });
      return;
    }

    this.store.player.update((player) => ({ ...player, squadIds: nextIds }));
    this.store.prependLog(`Auto-built squad: ${selected.map((monster) => monster.name).join(' / ')}.`, 'info');
    this.toast.push({
      title: 'Squad Auto-Built',
      message: `${selected.length}/3 slots tuned for power and type spread.`,
      tone: 'success',
      icon: 'SQ',
      durationMs: 3400,
    });
  }

  saveSquadPreset(name: string): SquadPreset | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    const squadIds = [...this.store.player().squadIds];
    if (squadIds.length === 0) {
      this.store.prependLog('Cannot save an empty squad as a preset.', 'system');
      return null;
    }

    let saved: SquadPreset | null = null;

    this.store.player.update((player) => {
      const preset: SquadPreset = {
        id: `preset-${Date.now()}`,
        name: trimmed.slice(0, 24),
        squadIds,
      };

      const existingIndex = player.squadPresets.findIndex((current) => current.name.toLowerCase() === preset.name.toLowerCase());
      let nextPresets: SquadPreset[];
      if (existingIndex >= 0) {
        nextPresets = [...player.squadPresets];
        nextPresets[existingIndex] = preset;
      } else if (player.squadPresets.length >= MAX_SQUAD_PRESETS) {
        nextPresets = [...player.squadPresets.slice(1), preset];
      } else {
        nextPresets = [...player.squadPresets, preset];
      }

      saved = preset;
      return { ...player, squadPresets: nextPresets };
    });

    return saved;
  }

  loadSquadPreset(presetId: string): void {
    const preset = this.store.player().squadPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    const validIds = preset.squadIds.filter((id) => {
      const monster = this.store.getMonsterById(id);
      return monster?.unlocked;
    });

    this.store.player.update((player) => ({ ...player, squadIds: validIds.slice(0, 3) }));
    this.store.prependLog(`Loaded preset "${preset.name}" into squad.`, 'info');
  }

  deleteSquadPreset(presetId: string): void {
    this.store.player.update((player) => ({
      ...player,
      squadPresets: player.squadPresets.filter((preset) => preset.id !== presetId),
    }));
  }

  pinChaseTarget(id: string): void {
    const monster = this.store.getMonsterById(id);
    if (!monster) {
      return;
    }
    this.store.player.update((player) => ({ ...player, pinnedChaseId: id }));
  }

  unpinChaseTarget(): void {
    this.store.player.update((player) => ({ ...player, pinnedChaseId: null }));
  }

  private scoreSquadAutofillCandidate(monster: Monster, selected: Monster[]): number {
    const selectedTypes = new Set(selected.map((entry) => entry.type));
    const selectedStages = new Set(selected.map((entry) => entry.stage));
    const typeBonus = selectedTypes.has(monster.type) ? 0 : 150;
    const stageBonus = selectedStages.has(monster.stage) ? 0 : 45;
    const prismaticBonus = monster.prismatic ? 60 : 0;
    const stageRank = this.stages.indexOf(monster.stage) * 12;

    return getMonsterPower(monster) + typeBonus + stageBonus + prismaticBonus + stageRank;
  }
}
