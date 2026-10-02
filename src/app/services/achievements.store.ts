import { computed, effect, inject, Injectable, untracked } from '@angular/core';
import { AchievementMetrics, evaluateAchievements, findNewlyCompleted } from '../rules/achievements.rules';
import { ResearchStore } from './research.store';
import { GameStore } from './game-store.service';
import { AudioService } from './audio.service';
import { ToastService } from './toast.service';

/** Medal metrics and automatic payouts. Runs as an effect, so any store's progress can complete a medal. */
@Injectable({ providedIn: 'root' })
export class AchievementsStore {
  private readonly store = inject(GameStore);
  private readonly research = inject(ResearchStore);
  private readonly audio = inject(AudioService);
  private readonly toast = inject(ToastService);

  constructor() {
    // Medals pay out whenever their metrics complete, no matter which store changed the state.
    effect(() => {
      this.achievementMetrics();
      untracked(() => this.checkAchievements());
    });
  }

  readonly achievementMetrics = computed<AchievementMetrics>(() => {
    const player = this.store.player();
    return {
      battlesWon: player.battlesWon,
      bestWinStreak: player.bestWinStreak,
      unlockedCount: this.store.monsters().filter((monster) => monster.unlocked).length,
      stageMilestones: player.claimedStageMilestones.length,
      criticalWins: player.combatStats.criticalWins,
      overdrivesUsed: player.combatStats.overdrivesUsed,
      itemsUsed: player.combatStats.itemsUsed,
      flawlessWins: player.combatStats.flawlessWins,
      gauntletBestWave: player.combatStats.gauntletBestWave,
      prismaticCount: this.store.monsters().filter((monster) => monster.prismatic).length,
      bossesDefeated: player.defeatedBosses.length,
      researchUnlocked: player.researchNodes.length,
      fullyScanned: this.research.fullyScannedCount(),
    };
  });

  readonly achievementProgress = computed(() => evaluateAchievements(this.achievementMetrics(), this.store.player().claimedAchievements));

  readonly unlockedAchievementCount = computed(() => this.achievementProgress().filter((entry) => entry.claimed).length);

  readonly completedAchievementCount = computed(() => this.achievementProgress().filter((entry) => entry.complete).length);

  /** Pays out completed, unclaimed medals. */
  private checkAchievements(): void {
    const newly = findNewlyCompleted(this.achievementMetrics(), this.store.player().claimedAchievements);
    if (newly.length === 0) {
      return;
    }
    const totalCoins = newly.reduce((sum, def) => sum + def.reward.coins, 0);
    const totalDna = newly.reduce((sum, def) => sum + def.reward.dnaShards, 0);
    this.store.player.update((player) => ({
      ...player,
      coins: player.coins + totalCoins,
      dnaShards: player.dnaShards + totalDna,
      claimedAchievements: [...player.claimedAchievements, ...newly.map((def) => def.id)],
    }));
    for (const def of newly) {
      this.store.prependLog(`Medal unlocked: ${def.label} (+${def.reward.coins} CR, +${def.reward.dnaShards} DNA).`, 'reward');
      this.audio.play('level-up');
      this.toast.push({
        title: 'Medal Unlocked',
        message: `${def.label} - +${def.reward.coins} CR, +${def.reward.dnaShards} DNA.`,
        tone: 'reward',
        icon: def.icon,
        durationMs: 4200,
      });
    }
  }
}
