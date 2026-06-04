import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { getRelicDef } from '../../data/relics.data';
import { ExpeditionMapComponent } from '../expedition-map/expedition-map.component';

@Component({
  selector: 'app-expedition',
  standalone: true,
  imports: [ExpeditionMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expedition.component.html',
  styleUrl: './expedition.component.scss',
})
export class ExpeditionComponent {
  readonly game = inject(GameStateService);

  readonly run = this.game.expedition;
  readonly relics = this.game.expeditionRelics;
  readonly cores = this.game.expeditionCores;
  readonly relicChoices = this.game.relicChoices;
  readonly relicDefs = this.game.relicDefs;

  readonly hpPercent = computed(() => {
    const run = this.run();
    return run ? Math.round((run.hp / run.maxHp) * 100) : 0;
  });

  relicName(id: string): string {
    return getRelicDef(id)?.name ?? id;
  }

  relicDetail(id: string): string {
    return getRelicDef(id)?.detail ?? '';
  }

  relicIcon(id: string): string {
    return getRelicDef(id)?.icon ?? '?';
  }

  launch(): void {
    this.game.startExpedition();
  }

  enter(nodeId: string): void {
    this.game.enterExpeditionNode(nodeId);
  }

  pick(id: string): void {
    this.game.pickExpeditionRelic(id);
  }

  claim(): void {
    this.game.claimExpedition();
  }

  abandon(): void {
    this.game.abandonExpedition();
  }
}
