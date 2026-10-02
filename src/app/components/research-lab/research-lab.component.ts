import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CreaturePortraitComponent } from '../creature-portrait/creature-portrait.component';
import { RESEARCH_BRANCH_META, ResearchBranch } from '../../data/research.data';
import { ResearchNodeView, researchNodesByBranch } from '../../rules/research.rules';
import { GameStateService } from '../../services/game-state.service';

interface ResearchBranchView {
  branch: ResearchBranch;
  label: string;
  tag: string;
  blurb: string;
  nodes: ResearchNodeView[];
  ownedCount: number;
  total: number;
}

@Component({
  selector: 'app-research-lab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreaturePortraitComponent],
  templateUrl: './research-lab.component.html',
  styleUrl: './research-lab.component.scss',
})
export class ResearchLabComponent {
  readonly game = inject(GameStateService);

  readonly bioData = this.game.bioData;
  readonly totalBioData = this.game.totalBioData;
  readonly unlockedCount = this.game.researchUnlockedCount;
  readonly totalNodes = this.game.researchTotalCount;
  readonly scanRegistry = this.game.scanRegistry;
  readonly fullyScanned = this.game.fullyScannedCount;
  readonly scanCompletion = this.game.scanCompletionPercent;

  readonly branches = computed<ResearchBranchView[]>(() => {
    const grouped = researchNodesByBranch(this.game.researchTree());
    return (Object.keys(grouped) as ResearchBranch[]).map((branch) => {
      const nodes = grouped[branch];
      const meta = RESEARCH_BRANCH_META[branch];
      return {
        branch,
        label: meta.label,
        tag: meta.tag,
        blurb: meta.blurb,
        nodes,
        ownedCount: nodes.filter((node) => node.status === 'owned').length,
        total: nodes.length,
      };
    });
  });

  /** Next affordable node, to point the player at a clear goal. */
  readonly nextNode = computed<ResearchNodeView | null>(
    () => this.game.researchTree().find((node) => node.status === 'available') ?? null,
  );

  unlock(node: ResearchNodeView): void {
    if (node.status === 'available') {
      this.game.unlockResearch(node.def.id);
    }
  }

  statusLabel(node: ResearchNodeView): string {
    switch (node.status) {
      case 'owned':
        return 'Online';
      case 'available':
        return `Unlock · ${node.def.cost}`;
      case 'unaffordable':
        return `Need ${node.def.cost}`;
      case 'locked':
        return 'Locked';
    }
  }
}
