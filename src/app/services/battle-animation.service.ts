import { Injectable, computed, signal } from '@angular/core';
import { BattleEvent } from '../rules/combat.engine';
import { STATUS_DEFS, StatusId } from '../rules/status.rules';

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
  /** -1 resisted, 0 neutral, 1 super effective (drives a Pixi pop). */
  effective?: -1 | 0 | 1;
  /** True when this hit was the Overdrive beat. */
  overdrive?: boolean;
}

/** A floating status icon cue consumed by the Pixi stage. */
export interface StatusCue {
  id: number;
  side: DamageSide;
  icon: string;
  label: string;
  spawnedAt: number;
}

export interface BattlePlayParams {
  won: boolean;
  criticalHit: boolean;
  /** Strukturierte Timeline aus der Combat-Engine (treibt HP-Balken & Popups). */
  events: BattleEvent[];
}

export type BattleSpeed = 1 | 2 | 4;
const SPEED_OPTIONS: readonly BattleSpeed[] = [1, 2, 4];
const SPEED_STORAGE_KEY = 'pea-battle-speed';

function loadInitialSpeed(): BattleSpeed {
  if (typeof localStorage === 'undefined') {
    return 1;
  }
  const stored = Number(localStorage.getItem(SPEED_STORAGE_KEY));
  return SPEED_OPTIONS.includes(stored as BattleSpeed) ? (stored as BattleSpeed) : 1;
}

@Injectable({ providedIn: 'root' })
export class BattleAnimationService {
  readonly phase = signal<BattlePhase>('idle');
  readonly playerHpPercent = signal(100);
  readonly enemyHpPercent = signal(100);
  readonly flash = signal<BattleFlashTone | null>(null);
  readonly outcome = signal<'victory' | 'defeat' | null>(null);
  readonly popups = signal<DamagePopup[]>([]);
  readonly statusCues = signal<StatusCue[]>([]);
  readonly shake = signal(false);

  readonly isPlaying = computed(() => this.phase() !== 'idle');

  /** Playback speed multiplier for battle animations (1x / 2x / 4x). */
  readonly speed = signal<BattleSpeed>(loadInitialSpeed());
  readonly speedOptions = SPEED_OPTIONS;

  private popupSeed = 0;
  private cueSeed = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  reset(): void {
    this.clearTimers();
    this.phase.set('idle');
    this.playerHpPercent.set(100);
    this.enemyHpPercent.set(100);
    this.flash.set(null);
    this.outcome.set(null);
    this.popups.set([]);
    this.statusCues.set([]);
    this.shake.set(false);
  }

  play(params: BattlePlayParams): void {
    if (this.phase() !== 'idle') {
      this.clearTimers();
    }

    this.popups.set([]);
    this.statusCues.set([]);
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

    // Interleave status-effect cues onto the same exchange window.
    deriveStatusCues(params.events)
      .slice(0, 5)
      .forEach((cue, index) => {
        const trigger = exchangeStart + 220 + index * exchangeStep;
        this.scheduleTimer(() => this.spawnStatusCue(cue.side, cue.icon, cue.label), trigger);
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

  private applyHit(
    hit: { amount: number; side: DamageSide; critical?: boolean; effective?: -1 | 0 | 1; overdrive?: boolean },
    params: BattlePlayParams,
    index: number,
  ): void {
    const isCritical = Boolean(hit.critical);
    this.spawnPopup(hit.amount, hit.side, isCritical, hit.effective, hit.overdrive);

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

  private spawnPopup(amount: number, side: DamageSide, critical: boolean, effective?: -1 | 0 | 1, overdrive?: boolean): void {
    const id = ++this.popupSeed;
    const popup: DamagePopup = {
      id,
      amount,
      side,
      critical,
      offset: Math.round((Math.random() - 0.5) * 60),
      spawnedAt: Date.now(),
      effective,
      overdrive,
    };
    this.popups.update((current) => [...current.slice(-5), popup]);
    this.scheduleTimer(() => {
      this.popups.update((current) => current.filter((entry) => entry.id !== id));
    }, 1100);
  }

  private spawnStatusCue(side: DamageSide, icon: string, label: string): void {
    const id = ++this.cueSeed;
    const cue: StatusCue = { id, side, icon, label, spawnedAt: Date.now() };
    this.statusCues.update((current) => [...current.slice(-5), cue]);
    this.scheduleTimer(() => {
      this.statusCues.update((current) => current.filter((entry) => entry.id !== id));
    }, 1300);
  }

  private triggerShake(): void {
    this.shake.set(true);
    this.scheduleTimer(() => this.shake.set(false), 380);
  }

  /** Pick a playback speed; persisted so it survives reloads. */
  setSpeed(speed: BattleSpeed): void {
    this.speed.set(speed);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
    }
  }

  private scheduleTimer(callback: () => void, delay: number): void {
    // Scale every scheduled beat by the chosen speed so the whole sequence
    // (hits, flashes, cooldown) compresses uniformly.
    const scaled = Math.max(0, Math.round(delay / this.speed()));
    const timer = setTimeout(() => {
      callback();
      this.timers = this.timers.filter((entry) => entry !== timer);
    }, scaled);
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
interface DerivedHit {
  amount: number;
  side: DamageSide;
  critical: boolean;
  effective?: -1 | 0 | 1;
  overdrive?: boolean;
}

function deriveHits(events: BattleEvent[]): DerivedHit[] {
  const hits: DerivedHit[] = [];
  for (const event of events) {
    if (event.kind === 'overdrive' && event.amount) {
      hits.push({ amount: event.amount, side: 'enemy', critical: true, effective: event.effective, overdrive: true });
    } else if (event.kind === 'strike' && event.amount) {
      hits.push({
        amount: event.amount,
        side: event.side === 'player' ? 'enemy' : 'player',
        critical: Boolean(event.critical),
        effective: event.effective,
      });
    } else if (event.kind === 'status-tick' && (event.amount ?? 0) > 0) {
      hits.push({ amount: event.amount ?? 0, side: event.side === 'player' ? 'player' : 'enemy', critical: false });
    }
  }
  return hits;
}

/** Status-application cues mapped to the side that visibly carries the icon. */
function deriveStatusCues(events: BattleEvent[]): { side: DamageSide; icon: string; label: string }[] {
  const cues: { side: DamageSide; icon: string; label: string }[] = [];
  for (const event of events) {
    if ((event.kind === 'status-apply' || event.kind === 'shield') && event.status) {
      const def = STATUS_DEFS[event.status as StatusId];
      if (!def) {
        continue;
      }
      // Buffs sit on the actor; dots/debuffs on the opposite side.
      const actorIsPlayer = event.side === 'player';
      const onActor = def.kind === 'buff';
      const side: DamageSide = (onActor ? actorIsPlayer : !actorIsPlayer) ? 'player' : 'enemy';
      cues.push({ side, icon: def.icon, label: def.label });
    }
  }
  return cues;
}
