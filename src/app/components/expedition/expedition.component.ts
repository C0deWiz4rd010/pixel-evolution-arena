import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { getRelicDef } from '../../data/relics.data';
import { ExpeditionMapComponent } from '../expedition-map/expedition-map.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-expedition',
  standalone: true,
  imports: [ExpeditionMapComponent, TranslatePipe],
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

  readonly relayStatus = computed(() => {
    const run = this.run();
    if (!run) {
      return this.game.squad().length === 0
        ? { status: 'SQUAD REQUIRED', title: 'Load a squad for a deep-grid run', detail: 'A squad is required before the relay can launch.', action: 'Load Squad' }
        : { status: 'READY', title: 'Expedition relay is cleared for launch', detail: 'Temporary relics and core payouts are ready whenever you want a side run.', action: 'Launch Run' };
    }
    if (run.status === 'active') {
      return { status: 'RUN ACTIVE', title: `Depth ${run.depth}/7 // HP ${run.hp}/${run.maxHp}`, detail: run.lastEvent, action: 'Resume Run' };
    }
    return { status: 'BANK CORES', title: run.status === 'won' ? 'Run clear secured' : 'Run salvage ready', detail: run.lastEvent, action: 'Bank Cores' };
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

  quickAction(): void {
    const run = this.run();
    if (!run) {
      if (this.game.squad().length > 0) {
        this.launch();
      }
      return;
    }

    if (run.status === 'active') {
      return;
    }

    this.claim();
  }
}
