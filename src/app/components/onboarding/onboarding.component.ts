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
    title: 'Welcome to Pixel Evolution Arena',
    body: 'Build a squad of original pixel creatures, win fast arena sims, earn rewards, and evolve. Everything runs locally — no login, no servers.',
  },
  {
    title: 'Build your Squad',
    body: 'Open the Squad tab and load up to three creatures. Type synergy and slot roles tilt the odds in your favor.',
    tab: 'Squad',
  },
  {
    title: 'Fight in the Arena',
    body: 'Start a battle to earn coins, DNA, XP, and item drops. Press Space to queue a run. Watch the live PixiJS stage do the work.',
    tab: 'Arena',
  },
  {
    title: 'Forge & Evolve',
    body: 'Spend DNA in the Forge for persistent gear, then evolve creatures in the Evolution Tree to climb stages and chase prismatic variants.',
    tab: 'Forge',
  },
  {
    title: 'Follow the Campaign',
    body: 'The Campaign tab gives you ordered objectives and bosses to chase. The mission strip up top always suggests your best next move.',
    tab: 'Campaign',
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
