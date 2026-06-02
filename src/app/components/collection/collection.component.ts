import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Monster, MonsterRarity, MonsterStage, MonsterType } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';

type StatusFilter = 'All' | 'Unlocked' | 'Locked';
type RequirementStatusView = ReturnType<GameStateService['getRequirementStatuses']>[number];
type FilterPresetId = 'ready-soon' | 'item-gated' | 'special-route' | 'reachable';

interface FilterPresetView {
  id: FilterPresetId;
  label: string;
  detail: string;
}

interface StageStat {
  stage: MonsterStage;
  className: string;
  glyph: string;
  total: number;
  unlocked: number;
  locked: number;
  percent: number;
}

interface TypeStat {
  type: MonsterType;
  code: string;
  total: number;
  unlocked: number;
  locked: number;
  percent: number;
}

interface MatrixCell {
  type: MonsterType;
  total: number;
  unlocked: number;
  locked: number;
}

interface MatrixRow {
  stage: MonsterStage;
  className: string;
  glyph: string;
  cells: MatrixCell[];
}

interface ChaseTarget {
  target: Monster;
  source: Monster | null;
  className: string;
  requirements: RequirementStatusView[];
  missing: RequirementStatusView[];
  ready: boolean;
  percent: number;
  actionLabel: string;
}

@Component({
  selector: 'app-collection',
  imports: [FormsModule],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss',
})
export class CollectionComponent {
  readonly game = inject(GameStateService);

  readonly statusOptions: StatusFilter[] = ['All', 'Unlocked', 'Locked'];

  readonly stageFilter = signal<MonsterStage | 'All'>('All');
  readonly typeFilter = signal<MonsterType | 'All'>('All');
  readonly rarityFilter = signal<MonsterRarity | 'All'>('All');
  readonly statusFilter = signal<StatusFilter>('All');
  readonly searchTerm = signal('');
  readonly activePreset = signal<FilterPresetId | null>(null);

  readonly filterPresets: FilterPresetView[] = [
    { id: 'ready-soon', label: 'Ready Soon', detail: 'Locked targets whose requirements are 80%+ complete.' },
    { id: 'item-gated', label: 'Item-Gated', detail: 'Locked targets that need an item from your inventory.' },
    { id: 'special-route', label: 'Special Route', detail: 'Targets on the Special stage (branch routes).' },
    { id: 'reachable', label: 'Reachable Now', detail: 'Locked targets you can evolve into right away.' },
  ];

  readonly readinessIndex = computed(() => {
    const sourceIndex = this.sourceIndex();
    const map = new Map<string, { ready: boolean; percent: number; itemGate: string | null; sourceUnlocked: boolean }>();

    for (const target of this.game.monsters()) {
      if (target.unlocked) {
        continue;
      }

      const source = sourceIndex.get(target.id)?.find((candidate) => candidate.unlocked) ?? null;
      const requirements = source ? this.game.getRequirementStatuses(source, target) : [];
      const met = requirements.filter((req) => req.met).length;
      const percent = requirements.length === 0 ? 0 : Math.round((met / requirements.length) * 100);
      const ready = source ? this.game.canEvolve(source, target) : false;
      const itemGate = target.requirements?.item ?? null;

      map.set(target.id, { ready, percent, itemGate, sourceUnlocked: source !== null });
    }

    return map;
  });

  readonly filteredMonsters = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const preset = this.activePreset();
    const readiness = this.readinessIndex();
    const inventory = new Set(this.game.player().inventory);

    return this.game.monsters().filter((monster) => {
      const stageMatch = this.stageFilter() === 'All' || monster.stage === this.stageFilter();
      const typeMatch = this.typeFilter() === 'All' || monster.type === this.typeFilter();
      const rarityMatch = this.rarityFilter() === 'All' || monster.rarity === this.rarityFilter();
      const statusMatch =
        this.statusFilter() === 'All' ||
        (this.statusFilter() === 'Unlocked' && monster.unlocked) ||
        (this.statusFilter() === 'Locked' && !monster.unlocked);

      if (!(stageMatch && typeMatch && rarityMatch && statusMatch)) {
        return false;
      }

      if (search) {
        const haystack = `${monster.id} ${monster.name}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (preset) {
        const info = readiness.get(monster.id);
        if (preset === 'ready-soon') {
          if (monster.unlocked || !info || info.percent < 80) {
            return false;
          }
        } else if (preset === 'item-gated') {
          if (monster.unlocked || !info?.itemGate || !inventory.has(info.itemGate)) {
            return false;
          }
        } else if (preset === 'special-route') {
          if (monster.stage !== 'Special') {
            return false;
          }
        } else if (preset === 'reachable') {
          if (monster.unlocked || !info?.ready) {
            return false;
          }
        }
      }

      return true;
    });
  });

  readonly filteredSummary = computed(() => {
    const monsters = this.filteredMonsters();
    const unlocked = monsters.filter((monster) => monster.unlocked).length;

    return {
      total: monsters.length,
      unlocked,
      locked: monsters.length - unlocked,
    };
  });

  readonly archiveCompletion = computed(() =>
    Math.round((this.game.unlockedCount() / this.game.monsters().length) * 100),
  );

  readonly stageStats = computed<StageStat[]>(() =>
    this.game.stages.map((stage) => {
      const monsters = this.game.monsters().filter((monster) => monster.stage === stage);
      const unlocked = monsters.filter((monster) => monster.unlocked).length;

      return {
        stage,
        className: this.game.stageClass(stage),
        glyph: this.stageGlyph(stage),
        total: monsters.length,
        unlocked,
        locked: monsters.length - unlocked,
        percent: this.percent(unlocked, monsters.length),
      };
    }),
  );

  readonly typeStats = computed<TypeStat[]>(() =>
    this.game.types.map((type) => {
      const monsters = this.game.monsters().filter((monster) => monster.type === type);
      const unlocked = monsters.filter((monster) => monster.unlocked).length;

      return {
        type,
        code: this.typeCode(type),
        total: monsters.length,
        unlocked,
        locked: monsters.length - unlocked,
        percent: this.percent(unlocked, monsters.length),
      };
    }),
  );

  readonly stageTypeMatrix = computed<MatrixRow[]>(() =>
    this.game.stages.map((stage) => ({
      stage,
      className: this.game.stageClass(stage),
      glyph: this.stageGlyph(stage),
      cells: this.game.types.map((type) => {
        const monsters = this.game
          .monsters()
          .filter((monster) => monster.stage === stage && monster.type === type);
        const unlocked = monsters.filter((monster) => monster.unlocked).length;

        return {
          type,
          total: monsters.length,
          unlocked,
          locked: monsters.length - unlocked,
        };
      }),
    })),
  );

  readonly sourceIndex = computed(() => {
    const index = new Map<string, Monster[]>();

    for (const source of this.game.monsters()) {
      for (const targetId of source.evolutionTargets) {
        const sources = index.get(targetId) ?? [];
        sources.push(source);
        index.set(targetId, sources);
      }
    }

    return index;
  });

  readonly pinnedChaseProgress = computed<ChaseTarget | null>(() => {
    const pinned = this.game.pinnedChase();
    if (!pinned || pinned.unlocked) {
      return null;
    }
    const source = this.sourceIndex().get(pinned.id)?.find((candidate) => candidate.unlocked) ?? null;
    const requirements = source ? this.game.getRequirementStatuses(source, pinned) : [];
    const missing = requirements.filter((req) => !req.met);
    const ready = source ? this.game.canEvolve(source, pinned) : false;
    const percent =
      requirements.length === 0 ? 0 : this.percent(requirements.length - missing.length, requirements.length);

    return {
      target: pinned,
      source,
      className: this.game.stageClass(pinned.stage),
      requirements,
      missing,
      ready,
      percent,
      actionLabel: this.chaseActionLabel(ready, source, missing),
    };
  });

  readonly nextChase = computed<ChaseTarget | null>(() => {
    const stageOrder = new Map(this.game.stages.map((stage, index) => [stage, index]));
    const candidates = this.game
      .monsters()
      .filter((target) => !target.unlocked)
      .map((target) => {
        const source =
          this.sourceIndex()
            .get(target.id)
            ?.find((candidate) => candidate.unlocked) ?? null;
        const requirements = source ? this.game.getRequirementStatuses(source, target) : [];
        const missing = requirements.filter((requirement) => !requirement.met);
        const ready = source ? this.game.canEvolve(source, target) : false;
        const percent =
          requirements.length > 0
            ? this.percent(requirements.length - missing.length, requirements.length)
            : 0;
        const stagePriority =
          this.game.stages.length - (stageOrder.get(target.stage) ?? this.game.stages.length);
        const score =
          (ready ? 10000 : 0) +
          (source ? 1000 : 0) +
          percent * 8 +
          stagePriority * 12 +
          this.rarityWeight(target.rarity);

        return {
          target,
          source,
          className: this.game.stageClass(target.stage),
          requirements,
          missing,
          ready,
          percent,
          actionLabel: this.chaseActionLabel(ready, source, missing),
          score,
        };
      })
      .filter((candidate) => candidate.source !== null)
      .sort((left, right) => right.score - left.score);

    return candidates[0] ?? null;
  });

  resetFilters(): void {
    this.stageFilter.set('All');
    this.typeFilter.set('All');
    this.rarityFilter.set('All');
    this.statusFilter.set('All');
    this.searchTerm.set('');
    this.activePreset.set(null);
  }

  togglePreset(id: FilterPresetId): void {
    this.activePreset.set(this.activePreset() === id ? null : id);
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  pinChase(id: string): void {
    this.game.pinChaseTarget(id);
  }

  evolveChase(chase: ChaseTarget): void {
    if (!chase.ready || !chase.source) {
      return;
    }

    this.game.evolve(chase.source.id, chase.target.id);
  }

  unpinChase(): void {
    this.game.unpinChaseTarget();
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  toggleStageFilter(stage: MonsterStage): void {
    this.stageFilter.set(this.stageFilter() === stage ? 'All' : stage);
  }

  toggleTypeFilter(type: MonsterType): void {
    this.typeFilter.set(this.typeFilter() === type ? 'All' : type);
  }

  setMatrixFilter(stage: MonsterStage, type: MonsterType): void {
    this.stageFilter.set(stage);
    this.typeFilter.set(type);
  }

  selectMonster(id: string): void {
    this.game.selectMonster(id);
  }

  sourceLabel(monster: Monster): string {
    const sources = this.sourceIndex().get(monster.id) ?? [];

    if (sources.length === 0) {
      return 'Origin';
    }

    return sources
      .slice(0, 2)
      .map((source) => source.id)
      .join(' / ');
  }

  typeCode(type: MonsterType): string {
    const codes: Record<MonsterType, string> = {
      Nature: 'NAT',
      Fire: 'FIR',
      Water: 'WTR',
      Dark: 'DRK',
      Light: 'LGT',
      Machine: 'MCH',
      Beast: 'BST',
      Toxic: 'TOX',
    };

    return codes[type];
  }

  stageGlyph(stage: MonsterStage): string {
    const glyphs: Record<MonsterStage, string> = {
      Baby: 'BB',
      'In-Training': 'IT',
      Rookie: 'RK',
      Champion: 'CH',
      Ultimate: 'UL',
      Mega: 'MG',
      Special: 'SP',
    };

    return glyphs[stage];
  }

  private percent(value: number, total: number): number {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }

  private rarityWeight(rarity: MonsterRarity): number {
    const weights: Record<MonsterRarity, number> = {
      Common: 4,
      Rare: 3,
      Epic: 2,
      Legendary: 1,
    };

    return weights[rarity];
  }

  private chaseActionLabel(
    ready: boolean,
    source: Monster | null,
    missing: RequirementStatusView[],
  ): string {
    if (!source) {
      return 'Trace source line';
    }

    if (ready) {
      return `Ready from ${source.name}`;
    }

    if (missing.length === 0) {
      return `Inspect ${source.name}`;
    }

    return `Need ${missing[0].label}`;
  }
}
