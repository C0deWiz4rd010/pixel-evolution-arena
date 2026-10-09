import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MonsterStage } from '../../models/monster.model';
import { heroSprite, stillSprite } from '../../rules/sprite.rules';
import { stageClass } from '../../rules/stage.rules';
import { GameStore } from '../../services/game-store.service';

export type CreaturePortraitSize = 'micro' | 'compact' | 'card' | 'hero' | 'battle';

/** Sizes that show the animated sprite; everything smaller uses the frozen still copy. */
const ANIMATED_SIZES: ReadonlySet<CreaturePortraitSize> = new Set(['hero', 'battle']);

@Component({
  selector: 'app-creature-portrait',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (resolvedSrc()) { <img [src]="resolvedSrc()" [alt]="decorative() ? '' : name()" [class.silhouette]="silhouette()" loading="lazy" decoding="async" /> } @else { <span aria-hidden="true">?</span> }`,
  styleUrl: './creature-portrait.component.scss',
  host: {
    '[class]': "'portrait size-' + size() + ' stage-' + stageClassName()",
    '[style.--portrait-scale]': 'scale()',
  },
})
export class CreaturePortraitComponent {
  private readonly store = inject(GameStore);

  readonly src = input<string | undefined>();
  readonly name = input('');
  readonly stage = input<MonsterStage>('Rookie');
  readonly size = input<CreaturePortraitSize>('compact');
  readonly silhouette = input(false);
  readonly decorative = input(false);
  readonly scale = input<number | null>(null);

  readonly stageClassName = computed(() => stageClass(this.stage()));
  readonly resolvedSrc = computed(() =>
    ANIMATED_SIZES.has(this.size()) ? heroSprite(this.src(), this.store.motionReduced()) : stillSprite(this.src()),
  );
}
