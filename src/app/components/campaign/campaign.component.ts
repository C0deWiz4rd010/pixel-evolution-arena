import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  claim(chapterId: string): void {
    this.game.claimChapter(chapterId);
  }
}
