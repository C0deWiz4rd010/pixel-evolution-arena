import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Output, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

interface OnboardingStep {
  title: string;
  body: string;
  /** Optional tab to jump to when this step is shown. */
  tab?: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Discover Your First Family',
    body: 'Select a discovered creature and follow its evolution path. The Next Goal always points to the most useful unlock.',
    tab: 'Evolution Tree',
  },
  {
    title: 'Build a Three-Creature Squad',
    body: 'Fill Vanguard, Sync Core, and Anchor. Auto Build creates a strong team immediately, while Loadout handles gear.',
    tab: 'Squad',
  },
  {
    title: 'Battle, Earn, Evolve',
    body: 'Arena runs grant Coins, DNA, XP, and item drops. Spend those rewards on the next discovery and repeat the loop.',
    tab: 'Arena',
  },
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  @Output() navigate = new EventEmitter<string>();

  private readonly game = inject(GameStateService);

  readonly steps = STEPS;
  readonly index = signal(0);
  readonly dismissed = signal(false);

  readonly visible = computed(() => !this.dismissed() && !this.game.player().tutorialDone);
  readonly current = computed(() => this.steps[this.index()]);
  readonly isLast = computed(() => this.index() >= this.steps.length - 1);

  next(): void {
    if (this.isLast()) {
      this.finish();
      return;
    }
    this.index.update((value) => value + 1);
    const tab = this.current().tab;
    if (tab) {
      this.navigate.emit(tab);
    }
  }

  back(): void {
    this.index.update((value) => Math.max(0, value - 1));
  }

  skip(): void {
    this.finish();
  }

  /** Dismiss with Escape for a less trapping first-run experience. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) {
      this.finish();
    }
  }

  /** Clicking the backdrop (outside the card) also dismisses. */
  onScrimClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('onboarding-scrim')) {
      this.finish();
    }
  }

  private finish(): void {
    this.dismissed.set(true);
    this.game.completeTutorial();
  }
}
