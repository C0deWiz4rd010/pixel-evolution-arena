import { Component, computed, inject } from '@angular/core';
import { MonsterType } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-squad',
  templateUrl: './squad.component.html',
  styleUrl: './squad.component.scss',
})
export class SquadComponent {
  readonly game = inject(GameStateService);

  readonly candidates = computed(() => this.game.monsters().filter((monster) => monster.unlocked && !this.game.player().squadIds.includes(monster.id)));

  recommendation(): string {
    const count = this.game.squad().length;
    if (count === 0) {
      return 'Add unlocked monsters from the evolution tree.';
    }
    if (count < 3) {
      return 'Your squad has room for more monsters.';
    }
    return 'Squad ready for arena battle.';
  }

  typeCount(type: MonsterType): number {
    return this.game.squad().filter((monster) => monster.type === type).length;
  }
}
