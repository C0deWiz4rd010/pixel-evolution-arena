import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-medals',
  templateUrl: './medals.component.html',
  styleUrl: './medals.component.scss',
})
export class MedalsComponent {
  readonly game = inject(GameStateService);

  readonly progress = this.game.achievementProgress;
  readonly unlockedCount = this.game.unlockedAchievementCount;
  readonly completedCount = this.game.completedAchievementCount;
  readonly total = computed(() => this.progress().length);

  readonly dailyObjective = this.game.dailyObjective;
  readonly dailyDirective = this.game.dailyDirective;
  readonly dailyComplete = this.game.dailyComplete;

  readonly combatStats = computed(() => this.game.player().combatStats);
  readonly bestStreak = computed(() => this.game.player().bestWinStreak);
  readonly battlesWon = computed(() => this.game.player().battlesWon);

  percent(current: number, goal: number): number {
    if (goal <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((current / goal) * 100));
  }
}
