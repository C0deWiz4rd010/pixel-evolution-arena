import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-campaign',
  standalone: true,
  imports: [UpperCasePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign.component.html',
  styleUrl: './campaign.component.scss',
})
export class CampaignComponent {
  readonly game = inject(GameStateService);

  readonly progress = this.game.campaignProgress;
  readonly claimable = this.game.claimableChapter;
  readonly bossCodex = this.game.bossCodex;
  readonly activeBoss = this.game.activeBoss;
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
    this.game.claimChapter(chapterId);
  }
}
