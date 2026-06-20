import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CountUpDirective } from '../../directives/count-up.directive';
import { GameStateService } from '../../services/game-state.service';

type PulseKey = 'coins' | 'dna' | 'power' | 'dex';

@Component({
  selector: 'app-header-hud',
  standalone: true,
  imports: [CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header-hud.component.html',
  styleUrl: './header-hud.component.scss',
})
export class HeaderHudComponent {
  readonly game = inject(GameStateService);
  readonly unlockedCount = computed(() => this.game.monsters().filter((monster) => monster.unlocked).length);
  readonly totalCount = computed(() => this.game.monsters().length);
  readonly dexPercent = computed(() => Math.round((this.unlockedCount() / Math.max(1, this.totalCount())) * 100));
  readonly utilityOpen = signal(false);

  private readonly pulseState = signal<Record<PulseKey, boolean>>({ coins: false, dna: false, power: false, dex: false });
  readonly pulseFor = (key: PulseKey) => computed(() => this.pulseState()[key]);
  private readonly previous = new Map<PulseKey, number>();
  private readonly pulseTimers = new Map<PulseKey, ReturnType<typeof setTimeout>>();

  constructor() {
    effect(() => this.observe('coins', this.game.player().coins));
    effect(() => this.observe('dna', this.game.player().dnaShards));
    effect(() => this.observe('power', this.game.teamPower()));
    effect(() => this.observe('dex', this.unlockedCount()));
  }

  openSettings(): void {
    this.utilityOpen.set(false);
    this.game.requestTab('Settings');
  }

  private observe(key: PulseKey, value: number): void {
    const previous = this.previous.get(key);
    this.previous.set(key, value);
    if (previous !== undefined && value > previous) {
      this.flash(key);
    }
  }

  private flash(key: PulseKey): void {
    const existing = this.pulseTimers.get(key);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    this.pulseState.update((state) => ({ ...state, [key]: true }));
    const timer = setTimeout(() => {
      this.pulseState.update((state) => ({ ...state, [key]: false }));
      this.pulseTimers.delete(key);
    }, 700);
    this.pulseTimers.set(key, timer);
  }
}
