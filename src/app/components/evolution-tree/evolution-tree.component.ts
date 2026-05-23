import { Component, computed, inject } from '@angular/core';
import { MonsterCardComponent } from '../monster-card/monster-card.component';
import { MonsterDetailComponent } from '../monster-detail/monster-detail.component';
import { Monster, MonsterStage } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-evolution-tree',
  imports: [MonsterCardComponent, MonsterDetailComponent],
  templateUrl: './evolution-tree.component.html',
  styleUrl: './evolution-tree.component.scss',
})
export class EvolutionTreeComponent {
  readonly game = inject(GameStateService);

  readonly latestBattleLogs = computed(() => this.game.battleLogs().slice(0, 4));

  readonly squadSlots = computed<(Monster | null)[]>(() => {
    const squad = this.game.squad();
    return [squad[0] ?? null, squad[1] ?? null, squad[2] ?? null];
  });

  stageMonsters(stage: MonsterStage): Monster[] {
    return this.game.monsters().filter((monster) => monster.stage === stage);
  }

  unlockedStageCount(stage: MonsterStage): number {
    return this.stageMonsters(stage).filter((monster) => monster.unlocked).length;
  }

  stageGlyph(stage: MonsterStage): string {
    const glyphs: Record<MonsterStage, string> = {
      Baby: 'BB',
      'In-Training': 'IT',
      Rookie: 'RK',
      Champion: 'CH',
      Ultimate: 'UL',
      Mega: 'MG',
      Special: 'SP',
    };

    return glyphs[stage];
  }
}
