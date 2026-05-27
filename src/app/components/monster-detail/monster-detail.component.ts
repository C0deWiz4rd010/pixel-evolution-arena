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

  addToSquadReason(monster: Monster): string | null {
    const player = this.game.player();

    if (!monster.unlocked) {
      return 'Unlock this signal before adding it to the squad.';
    }

    if (player.squadIds.includes(monster.id)) {
      return 'Already assigned to the squad.';
    }

    if (player.squadIds.length >= 3) {
      return 'Squad is full. Remove a member to add this form.';
    }

    return null;
  }

  requirementMarker(met: boolean): string {
    return met ? 'OK' : 'MISS';
  }

  powerDelta(source: Monster, target: Monster): number {
    return this.game.getMonsterPower(target) - this.game.getMonsterPower(source);
  }

  powerDeltaLabel(source: Monster, target: Monster): string {
    const delta = this.powerDelta(source, target);
    return `${delta >= 0 ? '+' : ''}${delta} PW`;
  }
}
