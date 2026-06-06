import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

type BeatPhase = 'idle' | 'running' | 'hit' | 'miss';

const ZONE_MIN = 0.4;
const ZONE_MAX = 0.6;

@Component({
  selector: 'app-combat-beat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './combat-beat.component.html',
  styleUrl: './combat-beat.component.scss',
})
export class CombatBeatComponent {
  private readonly game = inject(GameStateService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly enabled = computed(() => this.game.settings().combatBeats);
  readonly charged = computed(() => this.game.comboCharge() > 0);
  readonly phase = signal<BeatPhase>('idle');
  /** Marker position 0..1 for the template. */
  readonly marker = signal(0);

  readonly zoneMinPct = ZONE_MIN * 100;
  readonly zoneWidthPct = (ZONE_MAX - ZONE_MIN) * 100;

  private frame = 0;
  private startTime = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  primary(): void {
    if (this.phase() === 'running') {
      this.lock();
    } else if (!this.charged()) {
      this.start();
    }
  }

  private start(): void {
    this.phase.set('running');
    this.startTime = performance.now();
    this.zone.runOutsideAngular(() => {
      this.frame = requestAnimationFrame(this.step);
    });
  }

  private readonly step = (now: number): void => {
    const t = ((now - this.startTime) / 900) % 1;
    // Triangle wave 0->1->0 for a back-and-forth marker.
    const pos = t < 0.5 ? t * 2 : 2 - t * 2;
    this.zone.run(() => this.marker.set(pos));
    this.frame = requestAnimationFrame(this.step);
  };

  private lock(): void {
    this.stop();
    const pos = this.marker();
    const success = pos >= ZONE_MIN && pos <= ZONE_MAX;
    this.phase.set(success ? 'hit' : 'miss');
    this.game.chargeCombo(success);
    setTimeout(() => {
      if (this.phase() !== 'running') {
        this.phase.set('idle');
      }
    }, 1200);
  }

  private stop(): void {
    if (this.frame !== 0) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }
}
