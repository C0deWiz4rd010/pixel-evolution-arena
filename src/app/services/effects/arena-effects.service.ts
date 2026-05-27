import { Injectable } from '@angular/core';
import { BattleReward } from '../../models/battle.model';
import { Monster, MonsterStage } from '../../models/monster.model';

export type ArenaEffectKind = 'battle' | 'battle-blocked' | 'menu' | 'selection' | 'squad';

export interface ArenaEffectCue {
  readonly kind: ArenaEffectKind;
  readonly color: string;
  readonly accentColor: string;
  readonly durationMs: number;
  readonly intensity: number;
  readonly particleBurst: number;
  readonly beam: boolean;
  readonly ring: boolean;
}

@Injectable({ providedIn: 'root' })
export class ArenaEffectsService {
  createMenuCue(tab: string): ArenaEffectCue {
    const color = this.tabColor(tab);

    return {
      kind: 'menu',
      color,
      accentColor: '#12d8ff',
      durationMs: 520,
      intensity: 0.55,
      particleBurst: 18,
      beam: false,
      ring: false,
    };
  }

  createBattleCue(
    reward: BattleReward | null,
    leadingLog: string,
    teamPower: number,
  ): ArenaEffectCue {
    const normalizedLog = leadingLog.toLowerCase();
    const blocked = reward === null && normalizedLog.includes('add at least one');
    const won = reward?.won ?? false;
    const powerIntensity = Math.min(1, Math.max(0.45, teamPower / 1400));

    if (blocked) {
      return {
        kind: 'battle-blocked',
        color: '#ff584f',
        accentColor: '#ff9a22',
        durationMs: 420,
        intensity: 0.38,
        particleBurst: 10,
        beam: false,
        ring: true,
      };
    }

    return {
      kind: 'battle',
      color: won ? '#7cff3a' : '#ff9a22',
      accentColor: won ? '#12d8ff' : '#ff584f',
      durationMs: won ? 820 : 620,
      intensity: won ? powerIntensity : powerIntensity * 0.72,
      particleBurst: won ? 46 : 28,
      beam: true,
      ring: true,
    };
  }

  createSelectionCue(monster: Monster | null): ArenaEffectCue | null {
    if (monster === null) {
      return null;
    }

    return {
      kind: 'selection',
      color: this.stageColor(monster.stage),
      accentColor: '#12d8ff',
      durationMs: 420,
      intensity: 0.42,
      particleBurst: 16,
      beam: false,
      ring: true,
    };
  }

  createSquadCue(teamPower: number, squadSize: number): ArenaEffectCue {
    return {
      kind: 'squad',
      color: squadSize >= 3 ? '#7cff3a' : '#12d8ff',
      accentColor: '#c267ff',
      durationMs: 500,
      intensity: Math.min(0.76, 0.28 + teamPower / 1800),
      particleBurst: 12 + squadSize * 8,
      beam: false,
      ring: squadSize > 0,
    };
  }

  private tabColor(tab: string): string {
    const colors: Record<string, string> = {
      'Evolution Tree': '#ff5bd8',
      Squad: '#7cff3a',
      Arena: '#ff9a22',
      Collection: '#18c8ff',
      Handbook: '#c267ff',
    };

    return colors[tab] ?? '#12d8ff';
  }

  private stageColor(stage: MonsterStage): string {
    const colors: Record<MonsterStage, string> = {
      Baby: '#7cff3a',
      'In-Training': '#18c8ff',
      Rookie: '#ffe12b',
      Champion: '#ff9a22',
      Ultimate: '#ff3d36',
      Mega: '#b45cff',
      Special: '#ff5bd8',
    };

    return colors[stage];
  }
}
