import { computed, inject, Injectable } from '@angular/core';
import { BOSSES } from '../data/bosses.data';
import { CAMPAIGN_CHAPTERS, CampaignChapter } from '../data/campaign.data';
import { CampaignMetrics, ChapterProgress, evaluateCampaign, findClaimableChapter } from '../rules/campaign.rules';
import { GameStore } from './game-store.service';
import { AudioService } from './audio.service';
import { ToastService } from './toast.service';

/** Campaign chapters, their one-time rewards and the boss codex. */
@Injectable({ providedIn: 'root' })
export class CampaignStore {
  private readonly store = inject(GameStore);
  private readonly audio = inject(AudioService);
  private readonly toast = inject(ToastService);

  readonly bosses = BOSSES;

  readonly campaignChapters = CAMPAIGN_CHAPTERS;

  readonly bossCodex = computed(() =>
    BOSSES.map((boss) => ({ boss, defeated: this.store.player().defeatedBosses.includes(boss.id) })),
  );

  readonly campaignMetrics = computed<CampaignMetrics>(() => {
    const player = this.store.player();
    return {
      battlesWon: player.battlesWon,
      unlockedCount: this.store.unlockedCount(),
      bestWinStreak: player.bestWinStreak,
      flawlessWins: player.combatStats.flawlessWins,
      defeatedBosses: player.defeatedBosses.length,
      stageMilestones: player.claimedStageMilestones.length,
      gauntletBestWave: player.combatStats.gauntletBestWave,
    };
  });

  readonly campaignProgress = computed<ChapterProgress[]>(() => evaluateCampaign(this.campaignMetrics(), this.store.player().claimedChapters));

  readonly claimableChapter = computed(() => findClaimableChapter(this.campaignMetrics(), this.store.player().claimedChapters));

  readonly nextCampaignEntry = computed(() => this.campaignProgress().find((entry) => entry.status !== 'claimed') ?? this.campaignProgress()[0] ?? null);

  claimReadyChapter(): boolean {
    const claimable = this.claimableChapter();
    if (!claimable) {
      return false;
    }
    this.claimChapter(claimable.id);
    return true;
  }

  claimChapter(chapterId: string): void {
    const claimable = this.claimableChapter();
    if (!claimable || claimable.id !== chapterId) {
      return;
    }
    const chapter: CampaignChapter = claimable;
    const forgedGear = chapter.reward.gearDefId
      ? { instanceId: `gear-${Date.now()}-${Math.floor(Math.random() * 1000)}`, defId: chapter.reward.gearDefId, tier: 1 }
      : null;
    this.store.player.update((player) => ({
      ...player,
      coins: player.coins + chapter.reward.coins,
      dnaShards: player.dnaShards + chapter.reward.dnaShards,
      claimedChapters: [...player.claimedChapters, chapter.id],
      ownedGear: forgedGear ? [...player.ownedGear, forgedGear] : player.ownedGear,
    }));
    this.store.prependLog(`${chapter.title} cleared: ${chapter.reward.lore}`, 'reward');
    this.audio.play('level-up');
    this.toast.push({
      title: 'Chapter Cleared',
      message: `${chapter.title} — +${chapter.reward.coins} CR, +${chapter.reward.dnaShards} DNA${forgedGear ? ' + gear' : ''}.`,
      tone: 'reward',
      icon: '▣',
      durationMs: 4800,
    });
  }
}
