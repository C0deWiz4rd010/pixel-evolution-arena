import { Injectable, computed, signal } from '@angular/core';
import { BattleEvent } from '../rules/combat.engine';

export type BattlePhase = 'idle' | 'engage' | 'exchange' | 'finale' | 'cooldown';
export type BattleFlashTone = 'victory' | 'defeat' | 'crit';
export type DamageSide = 'enemy' | 'player';

export interface DamagePopup {
  id: number;
  amount: number;
  side: DamageSide;
  critical: boolean;
  offset: number;
  spawnedAt: number;
}

export interface BattlePlayParams {
  won: boolean;
  criticalHit: boolean;
  /** Strukturierte Timeline aus der Combat-Engine (treibt HP-Balken & Popups). */
  events: BattleEvent[];
}

@Injectable({ providedIn: 'root' })
export class BattleAnimationService {
  readonly phase = signal<BattlePhase>('idle');
  readonly playerHpPercent = signal(100);
  readonly enemyHpPercent = signal(100);
  readonly flash = signal<BattleFlashTone | null>(null);
  readonly outcome = signal<'victory' | 'defeat' | null>(null);
  readonly popups = signal<DamagePopup[]>([]);
  readonly shake = signal(false);

  readonly isPlaying = computed(() => this.phase() !== 'idle');

  private popupSeed = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  reset(): void {
    this.clearTimers();
    this.phase.set('idle');
    this.playerHpPercent.set(100);
    this.enemyHpPercent.set(100);
    this.flash.set(null);
    this.outcome.set(null);
    this.popups.set([]);
    this.shake.set(false);
  }

  play(params: BattlePlayParams): void {
    if (this.phase() !== 'idle') {
      this.clearTimers();
    }

    this.popups.set([]);
    this.playerHpPercent.set(100);
    this.enemyHpPercent.set(100);
    this.flash.set(null);
    this.outcome.set(null);
    this.shake.set(false);
    this.phase.set('engage');

    const exchangeStart = 320;
    const exchangeStep = 320;
    const damageHits = deriveHits(params.events).slice(0, 5);

    this.scheduleTimer(() => this.phase.set('exchange'), exchangeStart);

    damageHits.forEach((hit, index) => {
      const trigger = exchangeStart + 120 + index * exchangeStep;
      this.scheduleTimer(() => this.applyHit(hit, params, index), trigger);
    });

    const finaleAt = exchangeStart + 120 + damageHits.length * exchangeStep + 240;
    this.scheduleTimer(() => this.enterFinale(params), finaleAt);

    const cooldownAt = finaleAt + 1100;
    this.scheduleTimer(() => this.phase.set('cooldown'), cooldownAt);

    const restAt = cooldownAt + 540;
    this.scheduleTimer(() => {
      this.phase.set('idle');
      this.flash.set(null);
    }, restAt);
  }

  private applyHit(hit: { amount: number; side: DamageSide; critical?: boolean }, params: BattlePlayParams, index: number): void {
    const isCritical = Boolean(hit.critical);
    this.spawnPopup(hit.amount, hit.side, isCritical);

    if (hit.side === 'enemy') {
      const targetReduction = params.won
        ? 26 + index * 14 + (isCritical ? 18 : 0)
        : 12 + index * 4;
      this.enemyHpPercent.update((current) => Math.max(0, current - targetReduction));
    } else {
      const targetReduction = params.won
        ? 8 + index * 4
        : 22 + index * 12 + (isCritical ? 10 : 0);
      this.playerHpPercent.update((current) => Math.max(0, current - targetReduction));
    }

    if (isCritical) {
      this.triggerShake();
      this.flash.set('crit');
      this.scheduleTimer(() => {
        if (this.flash() === 'crit') {
          this.flash.set(null);
        }
      }, 260);
    }
  }

  private enterFinale(params: BattlePlayParams): void {
    this.phase.set('finale');
    if (params.won) {
      this.enemyHpPercent.set(0);
      this.flash.set('victory');
      this.outcome.set('victory');
    } else {
      this.playerHpPercent.set(0);
      this.flash.set('defeat');
      this.outcome.set('defeat');
    }
    this.triggerShake();
  }

  private spawnPopup(amount: number, side: DamageSide, critical: boolean): void {
    const id = ++this.popupSeed;
    const popup: DamagePopup = {
      id,
      amount,
      side,
      critical,
      offset: Math.round((Math.random() - 0.5) * 60),
      spawnedAt: Date.now(),
    };
    this.popups.update((current) => [...current.slice(-5), popup]);
    this.scheduleTimer(() => {
      this.popups.update((current) => current.filter((entry) => entry.id !== id));
    }, 1100);
  }

  private triggerShake(): void {
    this.shake.set(true);
    this.scheduleTimer(() => this.shake.set(false), 380);
  }

  private scheduleTimer(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      callback();
      this.timers = this.timers.filter((entry) => entry !== timer);
    }, delay);
    this.timers.push(timer);
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}

/**
 * Leitet die animierten Treffer aus der Event-Timeline ab (ersetzt den alten
 * Regex-Hack). `side` ist hier die Seite, die Schaden NIMMT.
 */
function deriveHits(events: BattleEvent[]): { amount: number; side: DamageSide; critical: boolean }[] {
  const hits: { amount: number; side: DamageSide; critical: boolean }[] = [];
  for (const event of events) {
    if (event.kind === 'overdrive' && event.amount) {
      hits.push({ amount: event.amount, side: 'enemy', critical: true });
    } else if (event.kind === 'strike' && event.amount) {
      hits.push({ amount: event.amount, side: event.side === 'player' ? 'enemy' : 'player', critical: Boolean(event.critical) });
    } else if (event.kind === 'status-tick' && (event.amount ?? 0) > 0) {
      hits.push({ amount: event.amount ?? 0, side: event.side === 'player' ? 'player' : 'enemy', critical: false });
    }
  }
  return hits;
}
