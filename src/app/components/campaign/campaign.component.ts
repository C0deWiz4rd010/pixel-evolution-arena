import { stillSprite } from '../../rules/sprite.rules';
import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommandCenterCard } from '../../rules/command-center.rules';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-campaign',
  standalone: true,
  imports: [UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign.component.html',
  styleUrl: './campaign.component.scss',
})
export class CampaignComponent {
  /** Frozen sprite copy for list/grid rendering (see sprite.rules). */
  readonly still = stillSprite;
  readonly game = inject(GameStateService);

  readonly progress = this.game.campaign.campaignProgress;
  readonly claimable = this.game.campaign.claimableChapter;
  readonly bossCodex = this.game.campaign.bossCodex;
  readonly activeBoss = this.game.activeBoss;
  readonly bossPrepCards = this.game.bossPrepCards;
  readonly nextEntry = computed(() => this.progress().find((entry) => entry.status !== 'claimed') ?? this.progress()[0] ?? null);
  readonly commandTitle = computed(() => this.claimable()?.title ?? this.nextEntry()?.chapter.title ?? 'Campaign synced');
  readonly commandDetail = computed(() => {
    const claimable = this.claimable();
    if (claimable) {
      return claimable.reward.lore;
    }
    const entry = this.nextEntry();
    return entry ? `${entry.chapter.objective.label} (${entry.current}/${entry.goal})` : 'All current chapter rewards are already secured.';
  });
  readonly commandState = computed(() => this.nextEntry()?.status ?? 'claimed');

  claim(chapterId: string): void {
    this.game.campaign.claimChapter(chapterId);
  }

  runCard(card: CommandCenterCard): void {
    this.game.runMetaAction(card.actionId);
  }
}
