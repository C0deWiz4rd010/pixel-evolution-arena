import { Component, inject, Input } from '@angular/core';
import { Monster } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-monster-detail',
  templateUrl: './monster-detail.component.html',
  styleUrl: './monster-detail.component.scss',
})
export class MonsterDetailComponent {
  @Input() monster: Monster | null = null;
  readonly game = inject(GameStateService);

  stageClass(monster: Monster): string {
    return this.game.stageClass(monster.stage);
  }
}
