import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type * as Three from 'three';
import { ArenaEffectCue, ArenaEffectsService } from '../../services/effects/arena-effects.service';
import { GameStateService } from '../../services/game-state.service';

type EffectMesh = Three.Mesh<Three.BufferGeometry, Three.MeshBasicMaterial>;
type ThreeApi = typeof import('three');

@Component({
  selector: 'app-arena-effects',
  standalone: true,
  templateUrl: './arena-effects.component.html',
  styleUrl: './arena-effects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.reduced-motion]': 'reducedMotion()',
  },
})
export class ArenaEffectsComponent {
  readonly activeTab = input('Evolution Tree');
  readonly reducedMotion = signal(false);

  @ViewChild('canvas', { static: true })
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly effectRules = inject(ArenaEffectsService);
  private readonly game = inject(GameStateService);

  private readonly maxSparks = 160;
  private readonly sparkPositions = new Float32Array(this.maxSparks * 3);
  private readonly sparkVelocities = new Float32Array(this.maxSparks * 3);
  private readonly sparkColors = new Float32Array(this.maxSparks * 3);
  private readonly sparkBaseColors = new Float32Array(this.maxSparks * 3);
  private readonly sparkLives = new Float32Array(this.maxSparks);
  private readonly sparkMaxLives = new Float32Array(this.maxSparks);
  private readonly pendingCues: ArenaEffectCue[] = [];
  private readonly handleResize = (): void => this.resize();
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.stopLoop();
  };
  private readonly handleContextRestored = (): void => {
    this.renderFrame();
    this.ensureLoop();
  };
  private readonly handleMotionPreference = (event: MediaQueryListEvent): void => {
    this.reducedMotion.set(event.matches);

    if (event.matches) {
      this.stopLoop();
      this.renderFrame();
      return;
    }

    this.ensureLoop();
  };

  private three: ThreeApi | null = null;
  private cueColor: Three.Color | null = null;
  private cueAccentColor: Three.Color | null = null;
  private renderer: Three.WebGLRenderer | null = null;
  private scene: Three.Scene | null = null;
  private camera: Three.OrthographicCamera | null = null;
  private grid: Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial> | null = null;
  private sparkGeometry: Three.BufferGeometry | null = null;
  private sparks: Three.Points<Three.BufferGeometry, Three.PointsMaterial> | null = null;
  private beamCore: EffectMesh | null = null;
  private beamGlow: EffectMesh | null = null;
  private ring: EffectMesh | null = null;
  private menuGlow: EffectMesh | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private animationFrame = 0;
  private reducedCueTimer = 0;
  private width = 1;
  private height = 1;
  private lastFrameMs = 0;
  private beamLife = 0;
  private beamDuration = 0.7;
  private ringLife = 0;
  private ringDuration = 0.65;
  private menuLife = 0;
  private menuDuration = 0.5;
  private cueIntensity = 0.5;
  private previousTab: string | null = null;
  private previousBattleSignature: string | null = null;
  private previousSelectedMonsterId: string | null = null;
  private previousSquadSignature: string | null = null;

  constructor() {
    this.registerCueObservers();

    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        void this.initialize();
      });
    }

    this.destroyRef.onDestroy(() => this.dispose());
  }

  private registerCueObservers(): void {
    effect(() => {
      const tab = this.activeTab();

      if (this.previousTab === null) {
        this.previousTab = tab;
        return;
      }

      if (tab !== this.previousTab) {
        this.previousTab = tab;
        this.enqueueCue(this.effectRules.createMenuCue(tab));
      }
    });

    effect(() => {
      const monster = this.game.selectedMonster();
      const monsterId = monster?.id ?? '';

      if (this.previousSelectedMonsterId === null) {
        this.previousSelectedMonsterId = monsterId;
        return;
      }

      if (monsterId !== this.previousSelectedMonsterId) {
        this.previousSelectedMonsterId = monsterId;
        const cue = this.effectRules.createSelectionCue(monster);

        if (cue !== null) {
          this.enqueueCue(cue);
        }
      }
    });

    effect(() => {
      const squad = this.game.squad();
      const teamPower = this.game.teamPower();
      const signature = `${squad.map((monster) => `${monster.id}:${monster.level}`).join('|')}@${teamPower}`;

      if (this.previousSquadSignature === null) {
        this.previousSquadSignature = signature;
        return;
      }

      if (signature !== this.previousSquadSignature) {
        this.previousSquadSignature = signature;
        this.enqueueCue(this.effectRules.createSquadCue(teamPower, squad.length));
      }
    });

    effect(() => {
      const reward = this.game.lastReward();
      const leadingLog = this.game.battleLogs()[0]?.text ?? '';
      const signature = `${leadingLog}|${reward?.won ?? 'none'}|${reward?.coins ?? 0}|${reward?.dnaShards ?? 0}|${reward?.xp ?? 0}|${reward?.item ?? ''}`;

      if (this.previousBattleSignature === null) {
        this.previousBattleSignature = signature;
        return;
      }

      if (signature !== this.previousBattleSignature && leadingLog.length > 0) {
        this.previousBattleSignature = signature;
        this.enqueueCue(
          this.effectRules.createBattleCue(reward, leadingLog, this.game.teamPower()),
        );
      }
    });
  }

  private async initialize(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;

    if (!canvas || this.renderer !== null) {
      return;
    }

    this.three = await import('three');
    this.cueColor = new this.three.Color('#12d8ff');
    this.cueAccentColor = new this.three.Color('#7cff3a');
    this.configureMotionPreference();
    this.scene = new this.three.Scene();
    this.camera = new this.three.OrthographicCamera(-1, 1, 1, -1, -50, 50);
    this.renderer = new this.three.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: 'low-power',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.createSceneObjects();
    this.resize();
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.flushPendingCues();
    this.renderFrame();

    if (!this.reducedMotion()) {
      this.ensureLoop();
    }
  }

  private configureMotionPreference(): void {
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion.set(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.handleMotionPreference);
  }

  private createSceneObjects(): void {
    const three = this.three;

    if (this.scene === null || three === null) {
      return;
    }

    this.beamGlow = new three.Mesh(
      new three.PlaneGeometry(1, 1),
      this.createAdditiveMaterial('#7cff3a', 0),
    );
    this.beamCore = new three.Mesh(
      new three.PlaneGeometry(1, 1),
      this.createAdditiveMaterial('#12d8ff', 0),
    );
    this.ring = new three.Mesh(
      new three.RingGeometry(0.86, 1, 64),
      this.createAdditiveMaterial('#12d8ff', 0),
    );
    this.menuGlow = new three.Mesh(
      new three.PlaneGeometry(1, 1),
      this.createAdditiveMaterial('#ff5bd8', 0),
    );
    this.sparkGeometry = new three.BufferGeometry();
    this.sparkGeometry.setAttribute('position', new three.BufferAttribute(this.sparkPositions, 3));
    this.sparkGeometry.setAttribute('color', new three.BufferAttribute(this.sparkColors, 3));
    this.sparks = new three.Points(
      this.sparkGeometry,
      new three.PointsMaterial({
        blending: three.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85,
        size: 4,
        transparent: true,
        vertexColors: true,
      }),
    );

    this.hideTransientMeshes();
    this.clearSparks();
    this.scene.add(this.menuGlow, this.beamGlow, this.beamCore, this.ring, this.sparks);
  }

  private resize(): void {
    if (this.renderer === null || this.camera === null) {
      return;
    }

    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
    this.rebuildGrid();
    this.positionTransientMeshes();
    this.renderFrame();
  }

  private rebuildGrid(): void {
    const three = this.three;

    if (this.scene === null || three === null) {
      return;
    }

    if (this.grid !== null) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      this.grid.material.dispose();
    }

    const step = 64;
    const positions: number[] = [];
    const startX = -this.width / 2 - step * 2;
    const endX = this.width / 2 + step * 2;
    const startY = -this.height / 2 - step * 2;
    const endY = this.height / 2 + step * 2;

    for (let x = startX; x <= endX; x += step) {
      positions.push(x, startY, -4, x, endY, -4);
    }

    for (let y = startY; y <= endY; y += step) {
      positions.push(startX, y, -4, endX, y, -4);
    }

    const geometry = new three.BufferGeometry();
    geometry.setAttribute('position', new three.Float32BufferAttribute(positions, 3));
    const material = new three.LineBasicMaterial({
      blending: three.AdditiveBlending,
      color: '#12d8ff',
      depthWrite: false,
      opacity: this.reducedMotion() ? 0.06 : 0.11,
      transparent: true,
    });

    this.grid = new three.LineSegments(geometry, material);
    this.scene.add(this.grid);
  }

  private positionTransientMeshes(): void {
    if (
      this.beamCore === null ||
      this.beamGlow === null ||
      this.ring === null ||
      this.menuGlow === null
    ) {
      return;
    }

    this.beamCore.position.set(0, -this.height * 0.05, 1);
    this.beamGlow.position.copy(this.beamCore.position);
    this.beamCore.scale.set(this.width * 0.5, 8, 1);
    this.beamGlow.scale.set(this.width * 0.58, 34, 1);
    this.ring.position.set(this.width * 0.22, -this.height * 0.04, 2);
    this.menuGlow.position.set(0, this.height / 2 - Math.min(210, this.height * 0.2), 0);
    this.menuGlow.scale.set(this.width, 92, 1);
  }

  private enqueueCue(cue: ArenaEffectCue): void {
    this.pendingCues.push(cue);

    if (this.pendingCues.length > 8) {
      this.pendingCues.shift();
    }

    this.flushPendingCues();
  }

  private flushPendingCues(): void {
    if (this.renderer === null) {
      return;
    }

    while (this.pendingCues.length > 0) {
      const cue = this.pendingCues.shift();

      if (cue !== undefined) {
        this.playCue(cue);
      }
    }
  }

  private playCue(cue: ArenaEffectCue): void {
    if (this.cueColor === null || this.cueAccentColor === null) {
      return;
    }

    this.cueColor.set(cue.color);
    this.cueAccentColor.set(cue.accentColor);
    this.cueIntensity = cue.intensity;

    if (this.reducedMotion()) {
      this.playReducedCue(cue);
      return;
    }

    this.applyCueColors();

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

  private playReducedCue(cue: ArenaEffectCue): void {
    window.clearTimeout(this.reducedCueTimer);
    this.applyCueColors();

    if (this.menuGlow !== null) {
      this.setMaterialOpacity(this.menuGlow, cue.kind === 'menu' ? 0.1 : 0.04);
    }

    if (this.ring !== null && cue.ring) {
      this.ring.scale.setScalar(82);
      this.setMaterialOpacity(this.ring, 0.12);
    }

    this.renderFrame();
    this.reducedCueTimer = window.setTimeout(() => {
      this.hideTransientMeshes();
      this.renderFrame();
    }, 180);
  }

  private applyCueColors(): void {
    if (this.cueColor === null || this.cueAccentColor === null) {
      return;
    }

    if (this.beamCore !== null) {
      this.beamCore.material.color.copy(this.cueColor);
    }

    if (this.beamGlow !== null) {
      this.beamGlow.material.color.copy(this.cueAccentColor);
    }

    if (this.ring !== null) {
      this.ring.material.color.copy(this.cueAccentColor);
    }

    if (this.menuGlow !== null) {
      this.menuGlow.material.color.copy(this.cueColor);
    }
  }

  private ensureLoop(): void {
    if (this.animationFrame !== 0 || this.renderer === null || this.reducedMotion()) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.lastFrameMs = performance.now();
      this.animationFrame = window.requestAnimationFrame(this.animate);
    });
  }

  private readonly animate = (timeMs: number): void => {
    this.animationFrame = 0;

    if (
      this.renderer === null ||
      this.scene === null ||
      this.camera === null ||
      this.reducedMotion()
    ) {
      return;
    }

    const deltaSeconds = Math.min(0.05, Math.max(0.001, (timeMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = timeMs;
    this.updateAtmosphere(timeMs / 1000);
    this.updateBeam(deltaSeconds);
    this.updateRing(deltaSeconds);
    this.updateMenuGlow(deltaSeconds);
    this.updateSparks(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.animate);
  };

  private updateAtmosphere(timeSeconds: number): void {
    if (this.grid !== null) {
      this.grid.position.y = (timeSeconds * 9) % 64;
      this.grid.material.opacity = 0.09 + Math.sin(timeSeconds * 1.3) * 0.018;
    }

    if (Math.random() < 0.18 && this.cueAccentColor !== null) {
      this.spawnSpark(
        -this.width / 2 + Math.random() * this.width,
        -this.height / 2 + Math.random() * this.height,
        (Math.random() - 0.5) * 18,
        16 + Math.random() * 34,
        0.7 + Math.random() * 0.6,
        this.cueAccentColor,
      );
    }
  }

  private updateBeam(deltaSeconds: number): void {
    if (this.beamCore === null || this.beamGlow === null || this.beamLife <= 0) {
      return;
    }

    this.beamLife = Math.max(0, this.beamLife - deltaSeconds);
    const progress = 1 - this.beamLife / this.beamDuration;
    const alpha = Math.sin(progress * Math.PI) * this.cueIntensity;
    const stretch = 0.42 + progress * 0.28;
    this.beamCore.scale.set(this.width * stretch, 8 + alpha * 7, 1);
    this.beamGlow.scale.set(this.width * (stretch + 0.1), 34 + alpha * 20, 1);
    this.beamCore.rotation.z = Math.sin(progress * Math.PI * 2) * 0.025;
    this.beamGlow.rotation.z = this.beamCore.rotation.z;
    this.setMaterialOpacity(this.beamCore, alpha * 0.82);
    this.setMaterialOpacity(this.beamGlow, alpha * 0.24);

    if (this.beamLife === 0) {
      this.setMaterialOpacity(this.beamCore, 0);
      this.setMaterialOpacity(this.beamGlow, 0);
    }
  }

  private updateRing(deltaSeconds: number): void {
    if (this.ring === null || this.ringLife <= 0) {
      return;
    }

    this.ringLife = Math.max(0, this.ringLife - deltaSeconds);
    const progress = 1 - this.ringLife / this.ringDuration;
    const scale = 34 + progress * (150 + this.cueIntensity * 120);
    this.ring.scale.setScalar(scale);
    this.ring.rotation.z += deltaSeconds * 1.8;
    this.setMaterialOpacity(this.ring, (1 - progress) * 0.54 * this.cueIntensity);

    if (this.ringLife === 0) {
      this.setMaterialOpacity(this.ring, 0);
    }
  }

  private updateMenuGlow(deltaSeconds: number): void {
    if (this.menuGlow === null || this.menuLife <= 0) {
      return;
    }

    this.menuLife = Math.max(0, this.menuLife - deltaSeconds);
    const progress = 1 - this.menuLife / this.menuDuration;
    this.menuGlow.scale.set(this.width, 82 + progress * 36, 1);
    this.setMaterialOpacity(this.menuGlow, (1 - progress) * 0.18 * this.cueIntensity);

    if (this.menuLife === 0) {
      this.setMaterialOpacity(this.menuGlow, 0);
    }
  }

  private spawnBurst(cue: ArenaEffectCue): void {
    const three = this.three;

    if (three === null) {
      return;
    }

    const primary = new three.Color(cue.color);
    const accent = new three.Color(cue.accentColor);

    for (let index = 0; index < cue.particleBurst; index += 1) {
      const useAccent = index % 3 === 0;
      const color = useAccent ? accent : primary;
      const origin = this.burstOrigin(cue.kind);
      const spread = cue.kind === 'menu' ? this.width * 0.45 : 90 + cue.intensity * 90;
      const angle = Math.random() * Math.PI * 2;
      const speed = 48 + Math.random() * 170 * cue.intensity;
      this.spawnSpark(
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + (Math.random() - 0.5) * spread * 0.28,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.45 + Math.random() * 0.55,
        color,
      );
    }
  }

  private burstOrigin(kind: ArenaEffectCue['kind']): { x: number; y: number } {
    if (kind === 'menu') {
      return { x: 0, y: this.height / 2 - Math.min(210, this.height * 0.2) };
    }

    if (kind === 'battle' || kind === 'battle-blocked') {
      return { x: this.width * 0.18, y: -this.height * 0.04 };
    }

    if (kind === 'squad') {
      return { x: -this.width * 0.24, y: -this.height * 0.06 };
    }

    return { x: 0, y: -this.height * 0.02 };
  }

  private spawnSpark(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    life: number,
    color: Three.Color,
  ): void {
    const index = this.nextSparkIndex();
    const base = index * 3;
    this.sparkPositions[base] = x;
    this.sparkPositions[base + 1] = y;
    this.sparkPositions[base + 2] = 4;
    this.sparkVelocities[base] = velocityX;
    this.sparkVelocities[base + 1] = velocityY;
    this.sparkVelocities[base + 2] = 0;
    this.sparkBaseColors[base] = color.r;
    this.sparkBaseColors[base + 1] = color.g;
    this.sparkBaseColors[base + 2] = color.b;
    this.sparkColors[base] = color.r;
    this.sparkColors[base + 1] = color.g;
    this.sparkColors[base + 2] = color.b;
    this.sparkLives[index] = life;
    this.sparkMaxLives[index] = life;
  }

  private updateSparks(deltaSeconds: number): void {
    if (this.sparkGeometry === null) {
      return;
    }

    for (let index = 0; index < this.maxSparks; index += 1) {
      if (this.sparkLives[index] <= 0) {
        continue;
      }

      const base = index * 3;
      this.sparkLives[index] = Math.max(0, this.sparkLives[index] - deltaSeconds);

      if (this.sparkLives[index] === 0) {
        this.sparkPositions[base] = 99999;
        this.sparkPositions[base + 1] = 99999;
        this.sparkColors[base] = 0;
        this.sparkColors[base + 1] = 0;
        this.sparkColors[base + 2] = 0;
        continue;
      }

      const fade = this.sparkLives[index] / this.sparkMaxLives[index];
      this.sparkPositions[base] += this.sparkVelocities[base] * deltaSeconds;
      this.sparkPositions[base + 1] += this.sparkVelocities[base + 1] * deltaSeconds;
      this.sparkColors[base] = this.sparkBaseColors[base] * fade;
      this.sparkColors[base + 1] = this.sparkBaseColors[base + 1] * fade;
      this.sparkColors[base + 2] = this.sparkBaseColors[base + 2] * fade;
    }

    this.sparkGeometry.attributes['position'].needsUpdate = true;
    this.sparkGeometry.attributes['color'].needsUpdate = true;
  }

  private nextSparkIndex(): number {
    for (let index = 0; index < this.maxSparks; index += 1) {
      if (this.sparkLives[index] <= 0) {
        return index;
      }
    }

    return Math.floor(Math.random() * this.maxSparks);
  }

  private clearSparks(): void {
    for (let index = 0; index < this.maxSparks; index += 1) {
      const base = index * 3;
      this.sparkPositions[base] = 99999;
      this.sparkPositions[base + 1] = 99999;
      this.sparkPositions[base + 2] = 4;
      this.sparkLives[index] = 0;
      this.sparkMaxLives[index] = 1;
    }
  }

  private createAdditiveMaterial(color: string, opacity: number): Three.MeshBasicMaterial {
    const three = this.three;

    if (three === null) {
      throw new Error('Three.js runtime is not initialized.');
    }

    return new three.MeshBasicMaterial({
      blending: three.AdditiveBlending,
      color,
      depthWrite: false,
      opacity,
      transparent: true,
    });
  }

  private setMaterialOpacity(mesh: EffectMesh, opacity: number): void {
    mesh.material.opacity = opacity;
    mesh.visible = opacity > 0;
  }

  private hideTransientMeshes(): void {
    if (this.beamCore !== null) {
      this.setMaterialOpacity(this.beamCore, 0);
    }

    if (this.beamGlow !== null) {
      this.setMaterialOpacity(this.beamGlow, 0);
    }

    if (this.ring !== null) {
      this.setMaterialOpacity(this.ring, 0);
    }

    if (this.menuGlow !== null) {
      this.setMaterialOpacity(this.menuGlow, 0);
    }
  }

  private renderFrame(): void {
    if (this.renderer === null || this.scene === null || this.camera === null) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private stopLoop(): void {
    if (this.animationFrame === 0) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private dispose(): void {
    this.stopLoop();
    window.clearTimeout(this.reducedCueTimer);
    window.removeEventListener('resize', this.handleResize);
    this.mediaQuery?.removeEventListener('change', this.handleMotionPreference);

    const canvas = this.canvasRef?.nativeElement;
    canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas?.removeEventListener('webglcontextrestored', this.handleContextRestored);

    if (this.scene !== null) {
      this.scene.traverse((object) => this.disposeSceneObject(object));
      this.scene.clear();
    }

    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.grid = null;
    this.sparkGeometry = null;
    this.sparks = null;
    this.beamCore = null;
    this.beamGlow = null;
    this.ring = null;
    this.menuGlow = null;
  }

  private disposeSceneObject(object: Three.Object3D): void {
    const disposable = object as Three.Object3D & {
      geometry?: Three.BufferGeometry;
      material?: Three.Material | Three.Material[];
    };

    disposable.geometry?.dispose();

    if (Array.isArray(disposable.material)) {
      disposable.material.forEach((material) => material.dispose());
      return;
    }

    disposable.material?.dispose();
  }
}
