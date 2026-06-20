import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Monster, MonsterStage } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';
import { MonsterDetailComponent } from '../monster-detail/monster-detail.component';

const STAGE_ORDER: MonsterStage[] = ['Baby', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Special'];

@Component({
  selector: 'app-evolution-tree',
  standalone: true,
  imports: [MonsterDetailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evolution-tree.component.html',
  styleUrl: './evolution-tree.component.scss',
})
export class EvolutionTreeComponent {
  readonly game = inject(GameStateService);

  readonly dexPercent = computed(() => Math.round((this.game.unlockedCount() / Math.max(1, this.game.monsters().length)) * 100));

  readonly familyIndex = computed(() => {
    const parents = new Map<string, string>();
    for (const monster of this.game.monsters()) {
      for (const target of monster.evolutionTargets) {
        if (!parents.has(target)) parents.set(target, monster.id);
      }
    }

    const roots = new Map<string, string>();
    const rootFor = (id: string): string => {
      if (roots.has(id)) return roots.get(id)!;
      const parent = parents.get(id);
      const root = parent ? rootFor(parent) : id;
      roots.set(id, root);
      return root;
    };

    for (const monster of this.game.monsters()) rootFor(monster.id);
    return roots;
  });

  readonly activeFamily = computed(() => {
    const selected = this.game.selectedMonster();
    if (!selected) return [];
    const root = this.familyIndex().get(selected.id) ?? selected.id;
    return this.game
      .monsters()
      .filter((monster) => (this.familyIndex().get(monster.id) ?? monster.id) === root)
      .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  });

  readonly familyUnlocked = computed(() => this.activeFamily().filter((monster) => monster.unlocked).length);
  readonly visibleFamily = computed(() => {
    const family = this.activeFamily();
    const selectedIndex = family.findIndex((monster) => monster.id === this.game.player().selectedMonsterId);
    const start = Math.max(0, Math.min(selectedIndex - 1, family.length - 6));
    return family.slice(start, start + 6);
  });
  readonly hiddenFamilyCount = computed(() => Math.max(0, this.activeFamily().length - this.visibleFamily().length));
  readonly nextDiscovery = computed(() => {
    const selected = this.game.selectedMonster();
    const direct = selected ? this.game.getEvolutionTargets(selected).find((target) => !target.unlocked) : null;
    return direct ?? this.activeFamily().find((monster) => !monster.unlocked) ?? this.game.evolutionCandidates()[0]?.target ?? null;
  });
  readonly recentDiscoveries = computed(() => this.game.monsters().filter((monster) => monster.unlocked).slice(-3).reverse());

  selectMonster(monster: Monster): void {
    this.game.selectMonster(monster.id);
  }

  isReady(monster: Monster): boolean {
    return this.game.evolutionCandidates().some((candidate) => candidate.target.id === monster.id && candidate.ready);
  }

  discoverNext(): void {
    const target = this.nextDiscovery();
    if (!target) return;
    const candidate = this.game.evolutionCandidates().find((entry) => entry.target.id === target.id);
    if (candidate?.ready && candidate.source) {
      this.game.evolve(candidate.source.id, target.id);
      return;
    }
    if (candidate?.source) this.game.selectMonster(candidate.source.id);
    this.game.pinChaseTarget(target.id);
  }

  nextActionLabel(): string {
    const target = this.nextDiscovery();
    if (!target) return 'Collection Complete';
    return this.isReady(target) ? `Evolve ${target.name}` : `Track ${target.name}`;
  }
}
