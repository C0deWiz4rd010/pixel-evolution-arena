import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-arena',
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.scss',
})
export class ArenaComponent {
  readonly game = inject(GameStateService);

  readonly squadSlots = computed(() => {
    const squad = this.game.squad();
    return [0, 1, 2].map((slot) => squad[slot] ?? null);
  });

  readonly recentLogs = computed(() => this.game.battleLogs().slice(0, 9));

  readonly powerDelta = computed(() => this.game.teamPower() - this.game.enemyPower());
  readonly arenaThreat = this.game.upcomingArenaThreat;
  readonly squadTypeEdge = this.game.squadTypePressure;
  readonly enemyTypeEdge = this.game.enemyTypePressure;
  readonly synergySignals = this.game.squadSynergies;

  readonly powerDeltaLabel = computed(() => {
    const delta = this.powerDelta();
    return `${delta >= 0 ? '+' : ''}${delta}`;
  });

  readonly pressureLabel = computed(() => {
    if (this.game.squad().length === 0) {
      return 'No squad signal';
    }

    if (this.squadTypeEdge().modifier >= 0.07) {
      return 'Type edge online';
    }

    const delta = this.powerDelta();

    if (delta >= 160) {
      return 'Allied advantage';
    }

    if (delta >= -80) {
      return 'Contested signal';
    }

    return 'Enemy pressure';
  });

  readonly terminalStatus = computed(() => {
    if (this.game.squad().length === 0) {
      return 'Squad required';
    }

    const reward = this.game.lastReward();

    if (reward === null) {
      return 'Ready';
    }

    return reward.won ? 'Victory cached' : 'Retreat cached';
  });

  readonly terminalTone = computed(() => {
    const reward = this.game.lastReward();

    if (this.game.squad().length === 0) {
      return 'is-blocked';
    }

    if (reward === null) {
      return 'is-ready';
    }

    return reward.won ? 'is-victory' : 'is-retreat';
  });
}
