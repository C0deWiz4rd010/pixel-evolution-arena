import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommandCenterCard } from '../../rules/command-center.rules';
import { GameStateService } from '../../services/game-state.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

interface ObjectiveRadarCard {
  label: string;
  value: string;
  detail: string;
  tone: 'ready' | 'warning' | 'meta';
}

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
  readonly bossPrepCards = this.game.bossPrepCards;
  readonly nextEntry = computed(() => this.progress().find((entry) => entry.status !== 'claimed') ?? this.progress()[0] ?? null);
  readonly rewardRunway = computed(() => {
    const claimable = this.claimable();
    const boss = this.activeBoss();
    const next = this.nextEntry();

    return [
      {
        label: 'Chapter Reward',
        value: claimable ? `+${claimable.reward.coins} CR / +${claimable.reward.dnaShards} DNA` : next ? `${next.current}/${next.goal}` : 'Synced',
        detail: claimable ? claimable.reward.lore : next ? next.chapter.objective.label : 'No chapter reward is currently live.',
      },
      {
        label: 'Boss Surge',
        value: boss ? `+${boss.reward.coins} CR / +${boss.reward.dnaShards} DNA` : 'Stand by',
        detail: boss ? boss.mechanic.counter : 'A named boss rotates in on each fifth surge battle.',
      },
      {
        label: 'Codex Sweep',
        value: `${this.game.player().defeatedBosses.length}/${this.game.bosses.length}`,
        detail: 'Defeat new bosses to reveal counters and finish the codex lane.',
      },
    ];
  });
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
  readonly objectiveRadar = computed<ObjectiveRadarCard[]>(() => {
    const intel = this.game.battleIntelSummary();
    const claimable = this.claimable();
    const entry = this.nextEntry();
    const boss = this.activeBoss();

    return [
      {
        label: 'Chapter Pulse',
        value: claimable ? 'Claim Ready' : entry ? `${entry.current}/${entry.goal}` : 'Synced',
        detail: claimable
          ? claimable.reward.lore
          : entry
            ? `${entry.chapter.objective.label} (${entry.current}/${entry.goal})`
            : 'No visible campaign pressure remains.',
        tone: claimable ? 'ready' : entry?.status === 'locked' ? 'warning' : 'meta',
      },
      {
        label: 'Boss Forecast',
        value: boss ? boss.name : 'No surge yet',
        detail: boss ? `${boss.mechanic.telegraph} Counter: ${boss.mechanic.counter}` : 'Every fifth arena surge pulls a named boss into the grid.',
        tone: boss ? 'warning' : 'meta',
      },
      {
        label: 'Combat Trend',
        value: intel.total > 0 ? `${intel.winRate}% ${intel.trend}` : 'No intel',
        detail: intel.total > 0 ? intel.trendLabel : 'Seed the radar with a few arena runs first.',
        tone: intel.trend === 'hot' ? 'ready' : intel.trend === 'cold' ? 'warning' : 'meta',
      },
    ];
  });

  claim(chapterId: string): void {
    this.game.claimChapter(chapterId);
  }

  runCard(card: CommandCenterCard): void {
    this.game.runMetaAction(card.actionId);
  }
}
