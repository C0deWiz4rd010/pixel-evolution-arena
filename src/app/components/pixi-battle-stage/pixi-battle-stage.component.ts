import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type {
  Application as PixiApplication,
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Text as PixiText,
  Texture as PixiTexture,
} from 'pixi.js';
import { EnemyMonster } from '../../models/battle.model';
import { Monster } from '../../models/monster.model';
import { BattleAnimationService } from '../../services/battle-animation.service';
import { GameStateService } from '../../services/game-state.service';

type PixiApi = typeof import('pixi.js');

type StageSide = 'player' | 'enemy';

/** One rendered combatant on the Pixi stage. */
interface StageUnit {
  side: StageSide;
  id: string;
  name: string;
  container: PixiContainer;
  sprite: PixiSprite | null;
  placeholder: PixiText | null;
  hpTrack: PixiGraphics;
  hpFill: PixiGraphics;
  targetRing: PixiGraphics;
  baseX: number;
  baseY: number;
  /** Lunge progress 0..1 (decays back to 0). */
  lunge: number;
  /** Recoil/hit-flash progress 0..1 (decays back to 0). */
  hit: number;
  /** Faint progress 0..1 (rises to 1 and stays). */
  faint: number;
  bobPhase: number;
  prismatic: boolean;
  hpPercent: number;
}

interface FloatingNumber {
  text: PixiText;
  life: number;
  maxLife: number;
  vy: number;
}

const STAGE_HEIGHT = 360;
const UNIT_SPRITE_HEIGHT = 140;
const HP_BAR_WIDTH = 110;
const HP_BAR_HEIGHT = 7;

@Component({
  selector: 'app-pixi-battle-stage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="pixi-host" [class.is-reduced]="reducedMotion()" aria-hidden="true"></div>
    @if (failed()) {
      <p class="pixi-fallback-note">Live stage unavailable — using data view below.</p>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
        width: 100%;
        height: ${STAGE_HEIGHT}px;
        border-radius: 14px;
        overflow: hidden;
        background:
          radial-gradient(120% 90% at 50% 8%, rgba(18, 216, 255, 0.14), transparent 60%),
          linear-gradient(180deg, rgba(8, 14, 28, 0.92), rgba(6, 10, 22, 0.96));
        box-shadow: inset 0 0 0 1px rgba(60, 120, 200, 0.25), inset 0 -30px 60px rgba(0, 0, 0, 0.45);
      }
      .pixi-host {
        position: absolute;
        inset: 0;
      }
      .pixi-host canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
      .pixi-fallback-note {
        position: absolute;
        inset-block-end: 6px;
        inset-inline: 0;
        margin: 0;
        text-align: center;
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        color: rgba(190, 210, 240, 0.7);
      }
    `,
  ],
})
export class PixiBattleStageComponent {
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly game = inject(GameStateService);
  private readonly anim = inject(BattleAnimationService);

  readonly reducedMotion = signal(false);
  readonly failed = signal(false);

  private pixi: PixiApi | null = null;
  private app: PixiApplication | null = null;
  private root: PixiContainer | null = null;
  private floor: PixiGraphics | null = null;
  private bgWash: PixiGraphics | null = null;
  private washColor = 0x12d8ff;
  private readonly units: StageUnit[] = [];
  private readonly floaters: FloatingNumber[] = [];
  private readonly textureCache = new Map<string, PixiTexture>();

  private width = 600;
  private mediaQuery: MediaQueryList | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private seenPopupIds = new Set<number>();
  private seenCueIds = new Set<number>();
  private lastPhase = 'idle';
  private shakeTime = 0;
  private banner: PixiText | null = null;
  private bannerLife = 0;
  private readonly bannerMaxLife = 1.5;

  private readonly handleMotionChange = (event: MediaQueryListEvent): void => {
    this.applyMotionPreference(event.matches);
  };

  private applyMotionPreference(systemPrefersReduced = this.mediaQuery?.matches === true): void {
    const reduced = this.game.settings().motionMode === 'reduced' || systemPrefersReduced;
    this.reducedMotion.set(reduced);
    if (this.app) {
      if (reduced) {
        this.app.ticker.stop();
        this.renderStaticFrame();
      } else {
        this.app.ticker.start();
      }
    }
  }

  constructor() {
    this.registerObservers();

    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => void this.initialize());
    }

    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Reactively rebuild the roster and feed per-frame inputs from the services. */
  private registerObservers(): void {
    effect(() => {
      this.game.settings().motionMode;
      this.applyMotionPreference();
    });

    effect(() => {
      const squad = this.game.squad();
      const enemies = this.game.enemies;
      // Rebuild only when the line-up identity changes (cheap signature).
      const signature = `${squad.map((m) => m.id).join(',')}|${enemies.map((e) => e.id ?? e.name).join(',')}`;
      if (this.app && signature !== this.rosterSignature) {
        this.rosterSignature = signature;
        this.buildRoster(squad, enemies);
      } else {
        this.rosterSignature = signature;
      }
    });

    effect(() => {
      const session = this.game.battleSession();
      if (!this.app || !session) return;
      this.syncSessionState(session.combatants, session.activeOrder?.id === 'focus' ? session.activeOrder.targetId : undefined);
    });

    // New damage popups -> lunge attacker, hit the receiving side, spawn a number.
    effect(() => {
      const popups = this.anim.popups();
      if (!this.app) {
        return;
      }
      for (const popup of popups) {
        if (this.seenPopupIds.has(popup.id)) {
          continue;
        }
        this.seenPopupIds.add(popup.id);
        this.onDamageBeat(popup.side, popup.amount, popup.critical, popup.offset, popup.effective, popup.overdrive, popup.actorName, popup.targetName, popup.moveName, popup.targetHp, popup.targetMaxHp);
      }
      if (this.seenPopupIds.size > 256) {
        this.seenPopupIds = new Set(popups.map((p) => p.id));
      }
    });

    // Status-effect cues -> floating status glyph over the carrying side.
    effect(() => {
      const cues = this.anim.statusCues();
      if (!this.app) {
        return;
      }
      for (const cue of cues) {
        if (this.seenCueIds.has(cue.id)) {
          continue;
        }
        this.seenCueIds.add(cue.id);
        this.spawnStatusIcon(cue.side, cue.icon, cue.carrierName);
      }
      if (this.seenCueIds.size > 256) {
        this.seenCueIds = new Set(cues.map((c) => c.id));
      }
    });

    // Phase transitions -> entrance, finale faint, reset.
    effect(() => {
      const phase = this.anim.phase();
      if (!this.app) {
        return;
      }
      this.onPhaseChange(phase);
    });

    // Crit/finale shake.
    effect(() => {
      const shake = this.anim.shake();
      if (shake && !this.reducedMotion()) {
        this.shakeTime = 0.38;
      }
    });

    // Battlefield mutator -> ambient wash tint.
    effect(() => {
      const tint = this.game.activeMutator().tint;
      this.washColor = hexToColor(tint);
      if (this.app) {
        this.drawWash();
        if (this.reducedMotion()) {
          this.renderStaticFrame();
        }
      }
    });
  }

  private rosterSignature = '';

  private async initialize(): Promise<void> {
    const hostEl = this.host().nativeElement;
    try {
      this.pixi = await import('pixi.js');
      this.configureMotion();

      this.width = Math.max(320, hostEl.clientWidth || 600);
      const app = new this.pixi.Application();
      await app.init({
        width: this.width,
        height: STAGE_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        powerPreference: 'low-power',
      });
      // Component may have been destroyed while awaiting init.
      if (!this.pixi) {
        app.destroy(true);
        return;
      }
      this.app = app;
      hostEl.appendChild(app.canvas);

      this.root = new this.pixi.Container();
      app.stage.addChild(this.root);
      this.drawFloor();
      this.bgWash = new this.pixi.Graphics();
      this.root.addChildAt(this.bgWash, 0);
      this.drawWash();

      this.banner = new this.pixi.Text({
        text: '',
        style: { fill: 0xffffff, fontSize: 38, fontFamily: 'monospace', fontWeight: '800', align: 'center' },
      });
      this.banner.anchor.set(0.5);
      this.banner.alpha = 0;
      this.banner.position.set(this.width / 2, STAGE_HEIGHT * 0.42);
      this.root.addChild(this.banner);

      this.buildRoster(this.game.squad(), this.game.enemies);
      this.rosterSignature = `${this.game
        .squad()
        .map((m) => m.id)
        .join(',')}|${this.game.enemies.map((e) => e.id ?? e.name).join(',')}`;

      this.observeResize(hostEl);

      this.zone.runOutsideAngular(() => {
        app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
        if (this.reducedMotion()) {
          app.ticker.stop();
          this.renderStaticFrame();
        }
      });
    } catch {
      this.failed.set(true);
    }
  }

  private configureMotion(): void {
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.applyMotionPreference(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.handleMotionChange);
  }

  private observeResize(hostEl: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      const next = Math.max(320, hostEl.clientWidth || this.width);
      if (Math.abs(next - this.width) < 2 || !this.app) {
        return;
      }
      this.width = next;
      this.app.renderer.resize(this.width, STAGE_HEIGHT);
      this.drawFloor();
      this.drawWash();
      this.layoutUnits();
      if (this.reducedMotion()) {
        this.renderStaticFrame();
      }
    });
    this.resizeObserver.observe(hostEl);
  }

  private drawWash(): void {
    if (!this.bgWash) {
      return;
    }
    this.bgWash
      .clear()
      .rect(0, 0, this.width, STAGE_HEIGHT)
      .fill({ color: this.washColor, alpha: this.reducedMotion() ? 0.05 : 0.09 });
  }

  private drawFloor(): void {
    const pixi = this.pixi;
    if (!pixi || !this.root) {
      return;
    }
    if (!this.floor) {
      this.floor = new pixi.Graphics();
      this.root.addChildAt(this.floor, 0);
    }
    const y = STAGE_HEIGHT - 46;
    this.floor
      .clear()
      .moveTo(0, y)
      .lineTo(this.width, y)
      .stroke({ color: 0x1f6fb0, width: 1, alpha: 0.5 })
      .ellipse(this.width * 0.27, y + 18, this.width * 0.2, 14)
      .fill({ color: 0x0c2440, alpha: 0.5 })
      .ellipse(this.width * 0.73, y + 18, this.width * 0.2, 14)
      .fill({ color: 0x3a0c1c, alpha: 0.5 });
  }

  private buildRoster(squad: Monster[], enemies: EnemyMonster[]): void {
    const pixi = this.pixi;
    if (!pixi || !this.root) {
      return;
    }
    for (const unit of this.units) {
      unit.container.destroy({ children: true });
    }
    this.units.length = 0;

    squad.slice(0, 3).forEach((monster, index) => {
      this.units.push(this.createUnit('player', monster.id, monster.name, monster.icon, monster.spriteUrl, index, monster.prismatic === true));
    });
    enemies.slice(0, 3).forEach((enemy, index) => {
      this.units.push(this.createUnit('enemy', enemy.id ?? enemy.name, enemy.name, enemy.icon, enemy.spriteUrl, index, false));
    });

    this.layoutUnits();
    const session = this.game.battleSession();
    if (session) this.syncSessionState(session.combatants, session.activeOrder?.id === 'focus' ? session.activeOrder.targetId : undefined);
  }

  private createUnit(
    side: StageSide,
    id: string,
    name: string,
    icon: string,
    spriteUrl: string | undefined,
    index: number,
    prismatic: boolean,
  ): StageUnit {
    const pixi = this.pixi!;
    const container = new pixi.Container();
    this.root!.addChild(container);

    const hpTrack = new pixi.Graphics()
      .roundRect(-HP_BAR_WIDTH / 2, -UNIT_SPRITE_HEIGHT - 16, HP_BAR_WIDTH, HP_BAR_HEIGHT, 3)
      .fill({ color: 0x0a1424, alpha: 0.85 });
    const hpFill = new pixi.Graphics();
    const targetRing = new pixi.Graphics().ellipse(0, -4, 48, 14).stroke({ color: 0x12d8ff, width: 3, alpha: 0.95 });
    targetRing.visible = false;
    container.addChild(targetRing, hpTrack, hpFill);

    const unit: StageUnit = {
      side,
      id,
      name,
      container,
      sprite: null,
      placeholder: null,
      hpTrack,
      hpFill,
      targetRing,
      baseX: 0,
      baseY: 0,
      lunge: 0,
      hit: 0,
      faint: 0,
      bobPhase: index * 1.7 + (side === 'enemy' ? Math.PI : 0),
      prismatic,
      hpPercent: 100,
    };

    if (spriteUrl) {
      void this.attachSprite(unit, spriteUrl, side);
    } else {
      const placeholder = new pixi.Text({
        text: icon || name.slice(0, 2),
        style: { fill: 0xdce8ff, fontSize: 44, fontFamily: 'monospace' },
      });
      placeholder.anchor.set(0.5, 1);
      placeholder.position.set(0, -8);
      container.addChild(placeholder);
      unit.placeholder = placeholder;
    }

    this.updateUnitHp(unit, unit.hpPercent);
    return unit;
  }

  private async attachSprite(unit: StageUnit, url: string, side: StageSide): Promise<void> {
    const pixi = this.pixi;
    if (!pixi) {
      return;
    }
    try {
      let texture = this.textureCache.get(url) ?? null;
      if (!texture) {
        texture = (await pixi.Assets.load(url)) as PixiTexture;
        this.textureCache.set(url, texture);
      }
      // Component or unit may have gone away during the async load.
      if (!this.pixi || unit.container.destroyed) {
        return;
      }
      const sprite = new pixi.Sprite(texture);
      sprite.anchor.set(0.5, 1);
      const scale = UNIT_SPRITE_HEIGHT / (texture.height || UNIT_SPRITE_HEIGHT);
      sprite.scale.set(scale);
      sprite.position.set(0, -8);
      if (side === 'enemy') {
        sprite.scale.x = -scale; // face the squad
      }
      unit.container.addChildAt(sprite, 0);
      unit.sprite = sprite;
    } catch {
      // Keep the unit without a sprite; placeholder/HP bar still render.
    }
  }

  private layoutUnits(): void {
    const players = this.units.filter((u) => u.side === 'player');
    const enemies = this.units.filter((u) => u.side === 'enemy');
    const groundY = STAGE_HEIGHT - 40;

    const place = (group: StageUnit[], leftRatio: number, rightRatio: number) => {
      const span = (rightRatio - leftRatio) * this.width;
      group.forEach((unit, index) => {
        const t = group.length === 1 ? 0.5 : index / (group.length - 1);
        const x = leftRatio * this.width + span * t;
        const depth = index * 10;
        unit.baseX = x;
        unit.baseY = groundY - depth;
        unit.container.position.set(x, unit.baseY);
        unit.container.zIndex = unit.baseY;
      });
    };

    place(players, 0.08, 0.4);
    place(enemies, 0.6, 0.92);
    if (this.banner) {
      this.banner.position.set(this.width / 2, STAGE_HEIGHT * 0.42);
    }
    this.root?.sortChildren?.();
  }

  private onDamageBeat(
    side: StageSide,
    amount: number,
    critical: boolean,
    offset: number,
    effective?: -1 | 0 | 1,
    overdrive?: boolean,
    actorName?: string,
    targetName?: string,
    moveName?: string,
    targetHp?: number,
    targetMaxHp?: number,
  ): void {
    // `side` is the side that TAKES damage.
    const attackerSide: StageSide = side === 'player' ? 'enemy' : 'player';
    // Choreograph the actual combatants from the timeline so the whole squad
    // participates; fall back to each side's lead when a name is unknown.
    const attacker = this.unitByName(attackerSide, actorName) ?? this.leadOf(attackerSide);
    const target = this.unitByName(side, targetName) ?? this.leadOf(side);

    if (attacker && !this.reducedMotion()) {
      attacker.lunge = 1;
    }
    if (target) {
      target.hit = 1;
      target.hpPercent = typeof targetHp === 'number' && targetMaxHp
        ? Math.max(0, Math.min(100, (targetHp / targetMaxHp) * 100))
        : Math.max(0, target.hpPercent - Math.min(55, Math.max(14, amount / 9)));
    }
    this.spawnFloatingNumber(target, amount, critical, offset);

    if (moveName && attacker) {
      this.spawnLabel(attacker, moveName.toUpperCase(), overdrive ? 0xffd23c : 0x7de8ff, -22);
    }

    if (effective) {
      this.spawnLabel(target, effective > 0 ? 'SUPER' : 'RESIST', effective > 0 ? 0x9dff5a : 0x9fb0c8, -28);
    }
    if (overdrive) {
      this.spawnLabel(target, 'OVERDRIVE', 0xffd23c, -50);
      this.shakeTime = 0.42;
    }
  }

  private spawnLabel(target: StageUnit | null, text: string, color: number, dy: number): void {
    const pixi = this.pixi;
    if (!pixi || !this.root || !target) {
      return;
    }
    const label = new pixi.Text({
      text,
      style: { fill: color, fontSize: 16, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
    });
    label.anchor.set(0.5, 1);
    label.position.set(target.baseX, target.baseY - UNIT_SPRITE_HEIGHT - 24 + dy);
    this.root.addChild(label);
    this.floaters.push({ text: label, life: 1, maxLife: 1, vy: 30 });
  }

  private spawnStatusIcon(side: StageSide, icon: string, carrierName?: string): void {
    const pixi = this.pixi;
    if (!pixi || !this.root) {
      return;
    }
    const target = this.unitByName(side, carrierName) ?? this.leadOf(side);
    if (!target) {
      return;
    }
    const label = new pixi.Text({
      text: icon,
      style: { fill: 0xffffff, fontSize: 22, fontFamily: 'monospace' },
    });
    label.anchor.set(0.5, 1);
    label.position.set(target.baseX + (side === 'player' ? -26 : 26), target.baseY - UNIT_SPRITE_HEIGHT - 6);
    this.root.addChild(label);
    this.floaters.push({ text: label, life: 1.1, maxLife: 1.1, vy: 22 });
  }

  private spawnFloatingNumber(target: StageUnit | null, amount: number, critical: boolean, offset: number): void {
    const pixi = this.pixi;
    if (!pixi || !this.root || !target) {
      return;
    }
    const text = new pixi.Text({
      text: `-${amount}`,
      style: {
        fill: critical ? 0xffd23c : target.side === 'player' ? 0xff6f6f : 0x9dff5a,
        fontSize: critical ? 26 : 19,
        fontFamily: 'monospace',
        fontWeight: critical ? '700' : '500',
      },
    });
    text.anchor.set(0.5, 1);
    text.position.set(target.baseX + offset * 0.4, target.baseY - UNIT_SPRITE_HEIGHT - 10);
    this.root.addChild(text);
    this.floaters.push({ text, life: 1, maxLife: 1, vy: 46 + (critical ? 14 : 0) });
  }

  private onPhaseChange(phase: string): void {
    if (phase === this.lastPhase) {
      return;
    }
    const previous = this.lastPhase;
    this.lastPhase = phase;

    if (phase === 'idle' && previous !== 'idle') {
      for (const unit of this.units) {
        unit.faint = 0;
        unit.hit = 0;
        unit.lunge = 0;
        unit.container.alpha = 1;
        unit.container.rotation = 0;
        if (!this.game.battleSession()) unit.hpPercent = 100;
      }
    }

    if (phase === 'pulse') {
      this.showBanner('TACTICAL PULSE', 0x12d8ff);
    }

    if (phase === 'finale') {
      const outcome = this.anim.outcome();
      const losingSide: StageSide = outcome === 'defeat' ? 'player' : 'enemy';
      const lead = this.leadOf(losingSide);
      for (const unit of this.units.filter((entry) => entry.side === losingSide)) {
        unit.hpPercent = 0;
      }
      if (lead) {
        lead.faint = 0.0001; // start the dissolve
      }
      const flash = this.anim.flash();
      if (outcome === 'victory') {
        this.showBanner(flash === 'crit' ? 'CRITICAL OVERLOAD' : 'VICTORY', flash === 'crit' ? 0xffd23c : 0x7cff3a);
      } else if (outcome === 'defeat') {
        this.showBanner('RETREAT', 0xff6f6f);
      }
    }

    if (this.reducedMotion()) {
      this.renderStaticFrame();
    }
  }

  private tick(dt: number): void {
    if (!this.app || this.reducedMotion()) {
      return;
    }
    const clamped = Math.min(0.05, Math.max(0.001, dt));
    for (const unit of this.units) {
      this.updateUnit(unit, clamped);
    }
    this.updateFloaters(clamped);
    this.updateShake(clamped);
    this.updateBanner(clamped);
  }

  private showBanner(text: string, color: number): void {
    if (!this.banner) {
      return;
    }
    this.banner.text = text;
    this.banner.style.fill = color;
    this.banner.position.set(this.width / 2, STAGE_HEIGHT * 0.42);
    this.bannerLife = this.bannerMaxLife;
    if (this.reducedMotion()) {
      this.banner.alpha = 0.95;
      this.renderStaticFrame();
    }
  }

  private updateBanner(dt: number): void {
    if (!this.banner || this.bannerLife <= 0) {
      return;
    }
    this.bannerLife = Math.max(0, this.bannerLife - dt);
    const progress = this.bannerLife / this.bannerMaxLife;
    this.banner.alpha = Math.sin(progress * Math.PI);
    this.banner.scale.set(1 + (1 - progress) * 0.16);
    if (this.bannerLife === 0) {
      this.banner.alpha = 0;
    }
  }

  private updateUnit(unit: StageUnit, dt: number): void {
    unit.bobPhase += dt * 2.4;
    const dir = unit.side === 'player' ? 1 : -1;

    // Decays.
    unit.lunge = Math.max(0, unit.lunge - dt * 3.4);
    unit.hit = Math.max(0, unit.hit - dt * 3);

    const bob = unit.faint > 0 ? 0 : Math.sin(unit.bobPhase) * 2.4;
    const lungeOffset = Math.sin(unit.lunge * Math.PI) * 26 * dir;
    const hitOffset = unit.hit > 0 ? Math.sin(unit.hit * Math.PI * 3) * 5 * -dir : 0;

    if (unit.faint > 0 && unit.faint < 1) {
      unit.faint = Math.min(1, unit.faint + dt * 1.6);
    }

    unit.container.position.x = unit.baseX + lungeOffset + hitOffset;
    unit.container.position.y = unit.baseY + bob + unit.faint * 26;
    unit.container.alpha = 1 - unit.faint * 0.85;
    unit.container.rotation = unit.faint * 0.5 * dir;

    const target = unit.sprite ?? unit.placeholder;
    if (target) {
      const flash = unit.hit;
      if (flash > 0.05) {
        target.alpha = 0.55 + Math.sin(flash * Math.PI) * 0.45;
        target.tint = 0xffffff;
      } else {
        target.alpha = 1;
        target.tint = unit.prismatic ? prismaticTint(unit.bobPhase) : 0xffffff;
      }
    }

    this.updateUnitHp(unit, unit.hpPercent);
  }

  private updateUnitHp(unit: StageUnit, hpPercent: number): void {
    const pixi = this.pixi;
    if (!pixi) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, hpPercent / 100));
    const color = ratio <= 0.2 ? 0xff4d4d : ratio <= 0.55 ? 0xffb020 : unit.side === 'player' ? 0x4dd2ff : 0xff7a7a;
    unit.hpFill
      .clear()
      .roundRect(-HP_BAR_WIDTH / 2, -UNIT_SPRITE_HEIGHT - 16, Math.max(1, HP_BAR_WIDTH * ratio), HP_BAR_HEIGHT, 3)
      .fill({ color });
  }

  private updateFloaters(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const floater = this.floaters[i];
      floater.life -= dt * 0.9;
      floater.text.position.y -= floater.vy * dt;
      floater.text.alpha = Math.max(0, floater.life);
      floater.text.scale.set(1 + (1 - floater.life) * 0.2);
      if (floater.life <= 0) {
        floater.text.destroy();
        this.floaters.splice(i, 1);
      }
    }
  }

  private updateShake(dt: number): void {
    if (!this.root) {
      return;
    }
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const magnitude = this.shakeTime * 14;
      this.root.position.set((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    } else {
      this.root.position.set(0, 0);
    }
  }

  /** Single composed frame for reduced-motion: pose units, no animation. */
  private renderStaticFrame(): void {
    if (!this.app) {
      return;
    }
    for (const unit of this.units) {
      unit.container.position.set(unit.baseX, unit.baseY);
      unit.container.alpha = unit.faint > 0 ? 0.4 : 1;
      this.updateUnitHp(unit, unit.hpPercent);
    }
    this.root?.position.set(0, 0);
    this.app.renderer.render(this.app.stage);
  }

  private syncSessionState(combatants: readonly { id: string; currentHp: number; maxHp: number; defeated: boolean }[], focusTargetId?: string): void {
    for (const unit of this.units) {
      const state = combatants.find((entry) => entry.id === unit.id);
      if (!state) continue;
      unit.hpPercent = state.maxHp > 0 ? (state.currentHp / state.maxHp) * 100 : 0;
      unit.targetRing.visible = unit.id === focusTargetId && !state.defeated;
      if (state.defeated) unit.faint = Math.max(unit.faint, 0.72);
      this.updateUnitHp(unit, unit.hpPercent);
    }
    if (this.reducedMotion()) this.renderStaticFrame();
  }

  private leadOf(side: StageSide): StageUnit | null {
    return this.units.find((unit) => unit.side === side) ?? null;
  }

  /** Find the on-stage unit for a timeline actor/target by name, restricted to its side. */
  private unitByName(side: StageSide, name: string | undefined): StageUnit | null {
    if (!name) {
      return null;
    }
    return this.units.find((unit) => unit.side === side && unit.name === name) ?? null;
  }

  private dispose(): void {
    this.mediaQuery?.removeEventListener('change', this.handleMotionChange);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    for (const floater of this.floaters) {
      floater.text.destroy();
    }
    this.floaters.length = 0;
    this.units.length = 0;
    const app = this.app;
    this.app = null;
    this.pixi = null;
    this.root = null;
    this.floor = null;
    this.banner = null;
    this.bgWash = null;
    this.textureCache.clear();
    app?.destroy(true, { children: true, texture: false });
  }
}

/** Parses a '#rrggbb' string into a 0xRRGGBB number (falls back to cyan). */
function hexToColor(hex: string): number {
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : 0x12d8ff;
}

/** Smoothly cycling pastel tint for prismatic units (Pixi tint as 0xRRGGBB). */
function prismaticTint(phase: number): number {
  const r = 200 + Math.round(55 * (0.5 + 0.5 * Math.sin(phase)));
  const g = 200 + Math.round(55 * (0.5 + 0.5 * Math.sin(phase + 2.1)));
  const b = 220 + Math.round(35 * (0.5 + 0.5 * Math.sin(phase + 4.2)));
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
}
