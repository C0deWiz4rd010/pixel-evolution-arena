import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MonsterStage } from '../../models/monster.model';

export type CreaturePortraitSize = 'micro' | 'compact' | 'card' | 'hero' | 'battle';

@Component({
  selector: 'app-creature-portrait',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (src) { <img [src]="src" [alt]="decorative ? '' : name" [class.silhouette]="silhouette" loading="lazy" /> } @else { <span aria-hidden="true">?</span> }`,
  styleUrl: './creature-portrait.component.scss',
  host: {
    '[class]': "'portrait size-' + size + ' stage-' + stageClass",
    '[style.--portrait-scale]': 'scale',
  },
})
export class CreaturePortraitComponent {
  @Input() src?: string;
  @Input() name = '';
  @Input() stage: MonsterStage = 'Rookie';
  @Input() size: CreaturePortraitSize = 'compact';
  @Input() silhouette = false;
  @Input() decorative = false;
  @Input() scale: number | null = null;

  get stageClass(): string {
    return this.stage.toLowerCase().replace(/[^a-z]/g, '');
  }
}
