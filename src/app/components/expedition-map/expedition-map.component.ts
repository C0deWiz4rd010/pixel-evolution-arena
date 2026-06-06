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
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { Application as PixiApplication, Container as PixiContainer, Graphics as PixiGraphics, Text as PixiText } from 'pixi.js';
import { ExpeditionNode, ExpeditionNodeType, ExpeditionState } from '../../models/expedition.model';
import { GameStateService } from '../../services/game-state.service';

type PixiApi = typeof import('pixi.js');

interface RenderedNode {
  node: ExpeditionNode;
  container: PixiContainer;
  glow: PixiGraphics;
  pulsePhase: number;
}

const NODE_COLORS: Record<ExpeditionNodeType, number> = {
  battle: 0x4dd2ff,
  elite: 0xc267ff,
  boss: 0xff5a5a,
  shop: 0xffd23c,
  rest: 0x7cff3a,
  event: 0x18c8ff,
};

const NODE_GLYPH: Record<ExpeditionNodeType, string> = {
  battle: '⚔',
  elite: '★',
  boss: '☠',
  shop: '$',
  rest: '+',
  event: '?',
};

const ROW_GAP = 78;
const TOP_PAD = 44;

@Component({
  selector: 'app-expedition-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="exp-map-host" [class.reduced]="reducedMotion()"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .exp-map-host {
        width: 100%;
        border-radius: 14px;
        overflow: hidden;
        background: radial-gradient(120% 80% at 50% 0%, rgba(24, 200, 255, 0.1), transparent 60%), rgba(6, 11, 22, 0.85);
        box-shadow: inset 0 0 0 1px rgba(60, 120, 200, 0.25);
      }
      .exp-map-host canvas {
        display: block;
        width: 100% !important;
      }
    `,
  ],
})
export class ExpeditionMapComponent {
  readonly enterNode = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly game = inject(GameStateService);

  readonly reducedMotion = signal(false);

  private pixi: PixiApi | null = null;
  private app: PixiApplication | null = null;
  private root: PixiContainer | null = null;
  private edges: PixiGraphics | null = null;
  private readonly rendered: RenderedNode[] = [];
  private width = 600;
  private height = 400;
  private mediaQuery: MediaQueryList | null = null;
  private signature = '';

  constructor() {
    effect(() => {
      const exp = this.game.expedition();
      const sig = exp ? `${exp.seed}:${exp.currentNodeId}:${exp.reachableIds.join(',')}:${exp.map.filter((n) => n.cleared).length}` : 'none';
      if (this.app && sig !== this.signature) {
        this.signature = sig;
        this.rebuild(exp);
      } else {
        this.signature = sig;
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => void this.initialize());
    }
    this.destroyRef.onDestroy(() => this.dispose());
  }

  private async initialize(): Promise<void> {
    const hostEl = this.host().nativeElement;
    try {
      this.pixi = await import('pixi.js');
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(this.mediaQuery.matches);

      const exp = this.game.expedition();
      const rows = exp ? Math.max(...exp.map.map((n) => n.row)) + 1 : 7;
      this.width = Math.max(320, hostEl.clientWidth || 600);
      this.height = TOP_PAD * 2 + (rows - 1) * ROW_GAP;

      const app = new this.pixi.Application();
      await app.init({
        width: this.width,
        height: this.height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        powerPreference: 'low-power',
      });
      if (!this.pixi) {
        app.destroy(true);
        return;
      }
      this.app = app;
      hostEl.appendChild(app.canvas);
      this.root = new this.pixi.Container();
      app.stage.addChild(this.root);
      this.edges = new this.pixi.Graphics();
      this.root.addChild(this.edges);

      this.rebuild(this.game.expedition());

      this.zone.runOutsideAngular(() => {
        app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
        if (this.reducedMotion()) {
          app.ticker.stop();
          app.renderer.render(app.stage);
        }
      });
    } catch {
      // Pixi unavailable — the surrounding tab still shows run state in the DOM.
    }
  }

  private rebuild(exp: ExpeditionState | null): void {
    const pixi = this.pixi;
    if (!pixi || !this.app || !this.root || !this.edges) {
      return;
    }
    for (const item of this.rendered) {
      item.container.destroy({ children: true });
    }
    this.rendered.length = 0;
    this.edges.clear();

    if (!exp) {
      this.app.renderer.render(this.app.stage);
      return;
    }

    const rows = Math.max(...exp.map.map((n) => n.row)) + 1;
    this.height = TOP_PAD * 2 + (rows - 1) * ROW_GAP;
    this.width = Math.max(320, this.host().nativeElement.clientWidth || this.width);
    this.app.renderer.resize(this.width, this.height);

    const reachable = new Set(exp.reachableIds);

    // Edges first.
    for (const node of exp.map) {
      const from = this.nodePosition(node, exp);
      for (const nextId of node.nextIds) {
        const target = exp.map.find((n) => n.id === nextId);
        if (!target) continue;
        const to = this.nodePosition(target, exp);
        const lit = node.cleared || reachable.has(node.id);
        this.edges.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: lit ? 0x4dd2ff : 0x2a3b55, width: lit ? 2 : 1, alpha: lit ? 0.7 : 0.4 });
      }
    }

    // Nodes.
    for (const node of exp.map) {
      this.rendered.push(this.createNode(node, exp, reachable.has(node.id)));
    }
    this.app.renderer.render(this.app.stage);
  }

  private createNode(node: ExpeditionNode, exp: ExpeditionState, isReachable: boolean): RenderedNode {
    const pixi = this.pixi!;
    const pos = this.nodePosition(node, exp);
    const container = new pixi.Container();
    container.position.set(pos.x, pos.y);
    this.root!.addChild(container);

    const isCurrent = exp.currentNodeId === node.id;
    const color = NODE_COLORS[node.type];
    const radius = node.type === 'boss' ? 22 : node.type === 'elite' ? 18 : 16;

    const glow = new pixi.Graphics();
    container.addChild(glow);

    const body = new pixi.Graphics().circle(0, 0, radius).fill({ color: 0x0a1424 }).stroke({ color, width: 2.5, alpha: node.cleared ? 0.5 : 1 });
    container.addChild(body);

    const label = new pixi.Text({
      text: NODE_GLYPH[node.type],
      style: { fill: node.cleared ? 0x6b7d99 : color, fontSize: radius, fontFamily: 'monospace', fontWeight: '700' },
    });
    label.anchor.set(0.5);
    container.addChild(label);

    container.alpha = node.cleared ? 0.55 : isReachable || isCurrent ? 1 : 0.5;

    if (isReachable) {
      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.on('pointertap', () => this.zone.run(() => this.enterNode.emit(node.id)));
    }

    return { node, container, glow, pulsePhase: Math.random() * Math.PI * 2 };
  }

  private nodePosition(node: ExpeditionNode, exp: ExpeditionState): { x: number; y: number } {
    const rowNodes = exp.map.filter((n) => n.row === node.row);
    const count = rowNodes.length;
    const index = rowNodes.findIndex((n) => n.id === node.id);
    const lane = count === 1 ? 0.5 : index / (count - 1);
    const margin = this.width * 0.16;
    const x = margin + lane * (this.width - margin * 2);
    const y = TOP_PAD + node.row * ROW_GAP;
    return { x, y };
  }

  private tick(dt: number): void {
    if (!this.app || this.reducedMotion()) {
      return;
    }
    const reachable = new Set(this.game.expedition()?.reachableIds ?? []);
    const time = performance.now() / 1000;
    for (const item of this.rendered) {
      if (!reachable.has(item.node.id)) {
        item.glow.clear();
        continue;
      }
      item.pulsePhase += dt;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + item.pulsePhase);
      const radius = (item.node.type === 'boss' ? 22 : 16) + 6 + pulse * 6;
      item.glow.clear().circle(0, 0, radius).stroke({ color: NODE_COLORS[item.node.type], width: 2, alpha: 0.2 + pulse * 0.4 });
    }
  }

  private dispose(): void {
    this.mediaQuery = null;
    this.rendered.length = 0;
    const app = this.app;
    this.app = null;
    this.pixi = null;
    this.root = null;
    this.edges = null;
    app?.destroy(true, { children: true });
  }
}
