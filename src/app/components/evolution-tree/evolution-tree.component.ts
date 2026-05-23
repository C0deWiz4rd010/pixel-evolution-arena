import { Component, inject } from '@angular/core';
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

  stageMonsters(stage: MonsterStage): Monster[] {
    return this.game.monsters().filter((monster) => monster.stage === stage);
  }

  unlockedStageCount(stage: MonsterStage): number {
    return this.stageMonsters(stage).filter((monster) => monster.unlocked).length;
  }
}
