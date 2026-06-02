import { Component, computed, effect, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

type PulseKey = 'coins' | 'dna' | 'power' | 'wins' | 'streak';

@Component({
  selector: 'app-header-hud',
  templateUrl: './header-hud.component.html',
  styleUrl: './header-hud.component.scss',
})
export class HeaderHudComponent {
  readonly game = inject(GameStateService);

  private readonly pulseState = signal<Record<PulseKey, boolean>>({
    coins: false,
    dna: false,
    power: false,
    wins: false,
    streak: false,
  });

  readonly pulseFor = (key: PulseKey) => computed(() => this.pulseState()[key]);

  private readonly previousCoins = signal<number | null>(null);
  private readonly previousDna = signal<number | null>(null);
  private readonly previousPower = signal<number | null>(null);
  private readonly previousWins = signal<number | null>(null);
  private readonly previousStreak = signal<number | null>(null);
  private readonly pulseTimers = new Map<PulseKey, ReturnType<typeof setTimeout>>();

  constructor() {
    effect(() => this.observe('coins', this.game.player().coins, this.previousCoins));
    effect(() => this.observe('dna', this.game.player().dnaShards, this.previousDna));
    effect(() => this.observe('power', this.game.teamPower(), this.previousPower));
    effect(() => this.observe('wins', this.game.player().battlesWon, this.previousWins));
    effect(() => this.observe('streak', this.game.winStreak(), this.previousStreak));
  }

  private observe(
    key: PulseKey,
    nextValue: number,
    previousSignal: ReturnType<typeof signal<number | null>>,
  ): void {
    const previous = previousSignal();
    previousSignal.set(nextValue);
    if (previous === null) {
      return;
    }
    if (nextValue > previous) {
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
    }, 860);
    this.pulseTimers.set(key, timer);
  }
}
