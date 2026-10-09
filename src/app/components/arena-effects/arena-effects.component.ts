import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ArenaEffectCue, ArenaEffectsService } from '../../services/effects/arena-effects.service';
import { GameStateService } from '../../services/game-state.service';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Device pixel ratio cap: overlay effects stay sharp enough without paying for 3x canvases. */
const MAX_PIXEL_RATIO = 1.5;
const MAX_SPARKS = 160;
const REDUCED_CUE_MS = 180;

/**
 * Full-screen feedback overlay (tab switches, selections, squad changes, battle results).
 *
 * Canvas 2D with additive blending. The draw loop only runs while a cue is alive; when idle the
 * canvas is cleared and the host is hidden, so it costs nothing between interactions.
 */
@Component({
  selector: 'app-arena-effects',
  standalone: true,
  templateUrl: './arena-effects.component.html',
  styleUrl: './arena-effects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.reduced-motion]': 'reducedMotion()',
    '[class.idle]': 'idle()',
  },
})
export class ArenaEffectsComponent {
  readonly activeTab = input('Evolution Tree');
  readonly reducedMotion = signal(false);
  readonly idle = signal(true);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly effectRules = inject(ArenaEffectsService);
  private readonly game = inject(GameStateService);

  private readonly sparkX = new Float32Array(MAX_SPARKS);
  private readonly sparkY = new Float32Array(MAX_SPARKS);
  private readonly sparkVx = new Float32Array(MAX_SPARKS);
  private readonly sparkVy = new Float32Array(MAX_SPARKS);
  private readonly sparkLife = new Float32Array(MAX_SPARKS);
  private readonly sparkMaxLife = new Float32Array(MAX_SPARKS);
  private readonly sparkColor: string[] = new Array(MAX_SPARKS).fill('#12d8ff');
  private liveSparks = 0;

  private ctx: CanvasRenderingContext2D | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private animationFrame = 0;
  private reducedCueTimer = 0;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private lastFrameMs = 0;

  private color: Rgb = { r: 18, g: 216, b: 255 };
  private accent: Rgb = { r: 124, g: 255, b: 58 };
  private intensity = 0.5;
  private beamLife = 0;
  private beamDuration = 0.7;
  private ringLife = 0;
  private ringDuration = 0.65;
  private ringRotation = 0;
  private menuLife = 0;
  private menuDuration = 0.5;

  private previousTab: string | null = null;
  private previousBattleSignature: string | null = null;
  private previousSelectedMonsterId: string | null = null;
  private previousSquadSignature: string | null = null;

  private readonly handleResize = (): void => this.resize();
  private readonly handleMotionPreference = (): void => this.applyMotionPreference();

  constructor() {
    this.registerCueObservers();
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => this.initialize());
    }
    this.destroyRef.onDestroy(() => this.dispose());
  }

  private registerCueObservers(): void {
    effect(() => {
      this.game.settings().motionMode;
      this.applyMotionPreference();
    });

    effect(() => {
      const tab = this.activeTab();
      if (this.previousTab !== null && tab !== this.previousTab) {
        this.play(this.effectRules.createMenuCue(tab));
      }
      this.previousTab = tab;
    });

    effect(() => {
      const monster = this.game.selectedMonster();
      const monsterId = monster?.id ?? '';
      if (this.previousSelectedMonsterId !== null && monsterId !== this.previousSelectedMonsterId) {
        const cue = this.effectRules.createSelectionCue(monster);
        if (cue !== null) this.play(cue);
      }
      this.previousSelectedMonsterId = monsterId;
    });

    effect(() => {
      const squad = this.game.squad();
      const teamPower = this.game.teamPower();
      const signature = `${squad.map((monster) => `${monster.id}:${monster.level}`).join('|')}@${teamPower}`;
      if (this.previousSquadSignature !== null && signature !== this.previousSquadSignature) {
        this.play(this.effectRules.createSquadCue(teamPower, squad.length));
      }
      this.previousSquadSignature = signature;
    });

    effect(() => {
      const reward = this.game.lastReward();
      const leadingLog = this.game.battleLogs()[0]?.text ?? '';
      const signature = `${leadingLog}|${reward?.won ?? 'none'}|${reward?.coins ?? 0}|${reward?.xp ?? 0}|${reward?.item ?? ''}`;
      if (this.previousBattleSignature !== null && signature !== this.previousBattleSignature && leadingLog.length > 0) {
        this.play(this.effectRules.createBattleCue(reward, leadingLog, this.game.teamPower()));
      }
      this.previousBattleSignature = signature;
    });
  }

  private initialize(): void {
    this.ctx = this.canvasRef().nativeElement.getContext('2d');
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaQuery.addEventListener('change', this.handleMotionPreference);
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.applyMotionPreference();
    this.resize();
  }

  private applyMotionPreference(): void {
    const reduced = this.game.settings().motionMode === 'reduced' || this.mediaQuery?.matches === true;
    this.reducedMotion.set(reduced);
    if (reduced) this.stopAndClear();
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.round(this.width * this.pixelRatio);
    canvas.height = Math.round(this.height * this.pixelRatio);
  }

  private play(cue: ArenaEffectCue): void {
    if (this.ctx === null) return;
    this.color = parseHex(cue.color);
    this.accent = parseHex(cue.accentColor);
    this.intensity = cue.intensity;

    if (this.reducedMotion()) {
      this.playReducedCue(cue);
      return;
    }

    if (cue.beam) {
      this.beamDuration = cue.durationMs / 1000;
      this.beamLife = this.beamDuration;
    }
    if (cue.ring) {
      this.ringDuration = Math.max(0.32, cue.durationMs / 1000);
      this.ringLife = this.ringDuration;
    }
    if (cue.kind === 'menu') {
      this.menuDuration = cue.durationMs / 1000;
      this.menuLife = this.menuDuration;
    }
    this.spawnBurst(cue);
    this.ensureLoop();
  }

  /** Reduced motion: a single static flash instead of moving particles. */
  private playReducedCue(cue: ArenaEffectCue): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    window.clearTimeout(this.reducedCueTimer);
    this.idle.set(false);
    this.beginFrame(ctx);
    if (cue.kind === 'menu') this.drawMenuGlow(ctx, 0.1);
    if (cue.ring) this.drawRing(ctx, 82, 0.12);
    this.reducedCueTimer = window.setTimeout(() => this.stopAndClear(), REDUCED_CUE_MS);
  }

  private ensureLoop(): void {
    if (this.animationFrame !== 0 || this.ctx === null) return;
    this.idle.set(false);
    this.lastFrameMs = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.animate);
  }

  private readonly animate = (timeMs: number): void => {
    this.animationFrame = 0;
    const ctx = this.ctx;
    if (ctx === null || this.reducedMotion()) return;

    const dt = Math.min(0.05, Math.max(0.001, (timeMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = timeMs;
    this.beamLife = Math.max(0, this.beamLife - dt);
    this.ringLife = Math.max(0, this.ringLife - dt);
    this.menuLife = Math.max(0, this.menuLife - dt);
    this.ringRotation += dt * 1.8;

    this.beginFrame(ctx);
    if (this.menuLife > 0) this.drawMenuGlow(ctx, (this.menuLife / this.menuDuration) * 0.18 * this.intensity);
    if (this.beamLife > 0) this.drawBeam(ctx, 1 - this.beamLife / this.beamDuration);
    if (this.ringLife > 0) {
      const progress = 1 - this.ringLife / this.ringDuration;
      this.drawRing(ctx, 34 + progress * (150 + this.intensity * 120), (1 - progress) * 0.54 * this.intensity);
    }
    this.updateAndDrawSparks(ctx, dt);

    if (this.beamLife > 0 || this.ringLife > 0 || this.menuLife > 0 || this.liveSparks > 0) {
      this.animationFrame = window.requestAnimationFrame(this.animate);
    } else {
      this.stopAndClear();
    }
  };

  /** Reset the transform, clear, and switch to additive blending in CSS pixels. */
  private beginFrame(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
  }

  private drawMenuGlow(ctx: CanvasRenderingContext2D, alpha: number): void {
    const centerY = Math.min(210, this.height * 0.2);
    const progress = this.menuDuration > 0 ? 1 - this.menuLife / this.menuDuration : 1;
    const half = (82 + progress * 36) / 2;
    const gradient = ctx.createLinearGradient(0, centerY - half, 0, centerY + half);
    gradient.addColorStop(0, rgba(this.color, 0));
    gradient.addColorStop(0.5, rgba(this.color, alpha));
    gradient.addColorStop(1, rgba(this.color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, centerY - half, this.width, half * 2);
  }

  private drawBeam(ctx: CanvasRenderingContext2D, progress: number): void {
    const alpha = Math.sin(progress * Math.PI) * this.intensity;
    const stretch = 0.42 + progress * 0.28;
    const cx = this.width / 2;
    const cy = this.height / 2 + this.height * 0.05;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(progress * Math.PI * 2) * 0.025);
    const glowW = this.width * (stretch + 0.1);
    const glowH = 34 + alpha * 20;
    ctx.fillStyle = rgba(this.accent, alpha * 0.24);
    ctx.fillRect(-glowW / 2, -glowH / 2, glowW, glowH);
    const coreW = this.width * stretch;
    const coreH = 8 + alpha * 7;
    ctx.fillStyle = rgba(this.color, alpha * 0.82);
    ctx.fillRect(-coreW / 2, -coreH / 2, coreW, coreH);
    ctx.restore();
  }

  private drawRing(ctx: CanvasRenderingContext2D, radius: number, alpha: number): void {
    ctx.save();
    ctx.translate(this.width / 2 + this.width * 0.22, this.height / 2 + this.height * 0.04);
    ctx.rotate(this.ringRotation);
    ctx.strokeStyle = rgba(this.accent, alpha);
    ctx.lineWidth = Math.max(1, radius * 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.93, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private spawnBurst(cue: ArenaEffectCue): void {
    const intensity = Math.max(0.15, this.game.settings().effectIntensity);
    const count = Math.max(1, Math.round(cue.particleBurst * intensity));
    const origin = this.burstOrigin(cue.kind);
    const spread = cue.kind === 'menu' ? this.width * 0.45 : 90 + cue.intensity * 90;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 48 + Math.random() * 170 * cue.intensity;
      this.spawnSpark(
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + (Math.random() - 0.5) * spread * 0.28,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.45 + Math.random() * 0.55,
        i % 3 === 0 ? cue.accentColor : cue.color,
      );
    }
  }

  /** Burst origins in canvas (top-left) coordinates. */
  private burstOrigin(kind: ArenaEffectCue['kind']): { x: number; y: number } {
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (kind === 'menu') return { x: cx, y: Math.min(210, this.height * 0.2) };
    if (kind === 'battle' || kind === 'battle-blocked') return { x: cx + this.width * 0.18, y: cy + this.height * 0.04 };
    if (kind === 'squad') return { x: cx - this.width * 0.24, y: cy + this.height * 0.06 };
    return { x: cx, y: cy + this.height * 0.02 };
  }

  private spawnSpark(x: number, y: number, vx: number, vy: number, life: number, color: string): void {
    let index = this.sparkLife.findIndex((value) => value <= 0);
    if (index < 0) index = Math.floor(Math.random() * MAX_SPARKS);
    else this.liveSparks += 1;
    this.sparkX[index] = x;
    this.sparkY[index] = y;
    this.sparkVx[index] = vx;
    // Canvas y grows downward; flip so bursts rise like the original scene.
    this.sparkVy[index] = -vy;
    this.sparkLife[index] = life;
    this.sparkMaxLife[index] = life;
    this.sparkColor[index] = color;
  }

  private updateAndDrawSparks(ctx: CanvasRenderingContext2D, dt: number): void {
    if (this.liveSparks === 0) return;
    for (let i = 0; i < MAX_SPARKS; i += 1) {
      if (this.sparkLife[i] <= 0) continue;
      this.sparkLife[i] = Math.max(0, this.sparkLife[i] - dt);
      if (this.sparkLife[i] === 0) {
        this.liveSparks -= 1;
        continue;
      }
      this.sparkX[i] += this.sparkVx[i] * dt;
      this.sparkY[i] += this.sparkVy[i] * dt;
      ctx.globalAlpha = 0.85 * (this.sparkLife[i] / this.sparkMaxLife[i]);
      ctx.fillStyle = this.sparkColor[i];
      ctx.fillRect(this.sparkX[i] - 2, this.sparkY[i] - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  /** Stop drawing, wipe the canvas and hide the overlay so idle frames cost nothing. */
  private stopAndClear(): void {
    if (this.animationFrame !== 0) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    this.beamLife = 0;
    this.ringLife = 0;
    this.menuLife = 0;
    this.sparkLife.fill(0);
    this.liveSparks = 0;
    const ctx = this.ctx;
    if (ctx !== null) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    this.idle.set(true);
  }

  private dispose(): void {
    if (this.animationFrame !== 0) window.cancelAnimationFrame(this.animationFrame);
    window.clearTimeout(this.reducedCueTimer);
    if (isPlatformBrowser(this.platformId)) window.removeEventListener('resize', this.handleResize);
    this.mediaQuery?.removeEventListener('change', this.handleMotionPreference);
    this.ctx = null;
  }
}

function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.padEnd(6, '0');
  const num = Number.parseInt(full.slice(0, 6), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
