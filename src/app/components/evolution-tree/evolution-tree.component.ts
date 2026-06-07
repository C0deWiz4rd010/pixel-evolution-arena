import { Component, computed, inject } from '@angular/core';
import { MonsterCardComponent } from '../monster-card/monster-card.component';
import { MonsterDetailComponent } from '../monster-detail/monster-detail.component';
import { Monster, MonsterStage } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';
import { MonsterTrainingDrill } from '../../rules/training.rules';

interface StageRowView {
  stage: MonsterStage;
  className: string;
  glyph: string;
  ordinal: string;
  idRange: string;
  unlocked: number;
  locked: number;
  total: number;
  routeCount: number;
  branchCount: number;
  progress: number;
  readyRoutes: number;
  trackedRoutes: number;
  monsters: Monster[];
}

interface RouteAdvisory {
  status: string;
  title: string;
  body: string;
  tone: 'empty' | 'squad' | 'ready' | 'train' | 'endpoint';
}

@Component({
  selector: 'app-evolution-tree',
  imports: [MonsterCardComponent, MonsterDetailComponent],
  templateUrl: './evolution-tree.component.html',
  styleUrl: './evolution-tree.component.scss',
})
export class EvolutionTreeComponent {
  readonly game = inject(GameStateService);

  readonly latestBattleLogs = computed(() => this.game.battleLogs().slice(0, 4));

  readonly stageRows = computed<StageRowView[]>(() =>
    this.game.stages.map((stage, stageIndex) => {
      const monsters = this.game.monsters().filter((monster) => monster.stage === stage);
      const unlocked = monsters.filter((monster) => monster.unlocked).length;
      const routeCount = monsters.reduce((total, monster) => total + monster.evolutionTargets.length, 0);
      const branchCount = monsters.filter((monster) => monster.evolutionTargets.length > 1).length;
      const stageCandidates = this.game.evolutionCandidates().filter((candidate) => candidate.target.stage === stage);

      return {
        stage,
        className: this.game.stageClass(stage),
        glyph: this.stageGlyph(stage),
        ordinal: String(stageIndex + 1).padStart(2, '0'),
        idRange: this.stageIdRange(monsters),
        unlocked,
        locked: monsters.length - unlocked,
        total: monsters.length,
        routeCount,
        branchCount,
        progress: monsters.length > 0 ? Math.round((unlocked / monsters.length) * 100) : 0,
        readyRoutes: stageCandidates.filter((candidate) => candidate.ready).length,
        trackedRoutes: stageCandidates.length,
        monsters,
      };
    }),
  );

  readonly selectedTargets = computed(() => {
    const selected = this.game.selectedMonster();
    return selected ? this.game.getEvolutionTargets(selected) : [];
  });

  readonly readySelectedTargets = computed(() => {
    const selected = this.game.selectedMonster();
    return selected ? this.selectedTargets().filter((target) => this.game.canEvolve(selected, target)) : [];
  });

  readonly primarySelectedTarget = computed(() => this.readySelectedTargets()[0] ?? this.selectedTargets().find((target) => !target.unlocked) ?? null);

  readonly squadSlots = computed<(Monster | null)[]>(() => {
    const squad = this.game.squad();
    return [squad[0] ?? null, squad[1] ?? null, squad[2] ?? null];
  });

  readonly familyIndex = computed<Map<string, string>>(() => {
    const monsters = this.game.monsters();
    const sourceIndex = new Map<string, string[]>();
    for (const source of monsters) {
      for (const targetId of source.evolutionTargets) {
        const list = sourceIndex.get(targetId) ?? [];
        list.push(source.id);
        sourceIndex.set(targetId, list);
      }
    }

    const familyMap = new Map<string, string>();
    const resolveRoot = (id: string, seen: Set<string>): string => {
      if (familyMap.has(id)) {
        return familyMap.get(id)!;
      }
      if (seen.has(id)) {
        return id;
      }
      seen.add(id);
      const parents = sourceIndex.get(id) ?? [];
      if (parents.length === 0) {
        familyMap.set(id, id);
        return id;
      }
      const root = resolveRoot(parents[0], seen);
      familyMap.set(id, root);
      return root;
    };

    for (const monster of monsters) {
      resolveRoot(monster.id, new Set());
    }

    return familyMap;
  });

  familyId(monster: Monster): string {
    return this.familyIndex().get(monster.id) ?? monster.id;
  }

  readonly battleDelta = computed(() => this.game.teamPower() - this.game.enemyPower());
  readonly arenaDirective = this.game.arenaDirective;
  readonly activeFormation = this.game.activeFormation;
  readonly routePressure = computed(() => {
    const ready = this.game.readyEvolutionCount();
    const tracked = this.game.evolutionCandidates().length;
    return {
      ready,
      tracked,
      label: ready > 0 ? `${ready} ready route${ready === 1 ? '' : 's'}` : tracked > 0 ? `${tracked} tracked routes` : 'Routes clear',
    };
  });

  readonly battlePosture = computed(() => {
    const squadSize = this.game.squad().length;
    if (squadSize === 0) {
      return 'NO SQUAD';
    }

    const delta = this.battleDelta();
    return delta >= 0 ? `ADV +${delta}` : `UNDERDOG ${Math.abs(delta)}`;
  });

  readonly routeAdvisory = computed<RouteAdvisory>(() => {
    const selected = this.game.selectedMonster();
    const squadSize = this.game.squad().length;

    if (!selected) {
      return {
        status: 'NO SIGNAL',
        title: 'Select an online form',
        body: 'Start from an unlocked node, then trace its next target and squad value.',
        tone: 'empty',
      };
    }

    if (squadSize === 0 && selected.unlocked) {
      return {
        status: 'SQUAD EMPTY',
        title: `${selected.name} can anchor slot 01`,
        body: 'Add an unlocked form before starting arena runs for XP and resources.',
        tone: 'squad',
      };
    }

    const readyTarget = this.readySelectedTargets()[0];
    if (readyTarget) {
      return {
        status: 'EVOLVE READY',
        title: `${readyTarget.name} route is open`,
        body: `${selected.name} meets the route requirements. Evolve now or battle once more for extra margin.`,
        tone: 'ready',
      };
    }

    const lockedTarget = this.selectedTargets().find((target) => !target.unlocked);
    if (lockedTarget) {
      const missing = this.missingRequirementLabels(selected, lockedTarget);
      return {
        status: 'ROUTE LOCKED',
        title: `${lockedTarget.name} is the next chase`,
        body: missing.length > 0 ? `Missing ${missing.join(' + ')}. Battle runs feed XP, coins, DNA, and item chances.` : 'Target is traced but not ready yet.',
        tone: 'train',
      };
    }

    if (squadSize < 3 && selected.unlocked) {
      return {
        status: 'OPEN SLOT',
        title: 'Squad has room for another signal',
        body: 'Fill the dock before arena runs to improve the battle roll and reward pace.',
        tone: 'squad',
      };
    }

    return {
      status: 'ENDPOINT',
      title: `${selected.name} has no locked exits`,
      body: 'Pick another branch line or keep battling to raise the current squad power.',
      tone: 'endpoint',
    };
  });

  stageMonsters(stage: MonsterStage): Monster[] {
    return this.stageRows().find((row) => row.stage === stage)?.monsters ?? [];
  }

  unlockedStageCount(stage: MonsterStage): number {
    return this.stageRows().find((row) => row.stage === stage)?.unlocked ?? 0;
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

  isSelectedSource(monster: Monster): boolean {
    return this.game.player().selectedMonsterId === monster.id;
  }

  isSelectedTarget(monster: Monster): boolean {
    return this.selectedTargets().some((target) => target.id === monster.id);
  }

  isReadyTarget(monster: Monster): boolean {
    const selected = this.game.selectedMonster();
    return Boolean(selected && this.game.canEvolve(selected, monster));
  }

  isSpecialRoute(monster: Monster): boolean {
    return monster.stage === 'Special' || Boolean(monster.requirements?.item);
  }

  nodeRouteTag(monster: Monster): string {
    if (this.isSelectedTarget(monster)) {
      return this.isReadyTarget(monster) ? 'READY TARGET' : 'TARGET';
    }

    if (monster.evolutionTargets.length > 1) {
      return `BRANCH x${monster.evolutionTargets.length}`;
    }

    if (this.isSpecialRoute(monster)) {
      return 'ITEM ROUTE';
    }

    if (monster.evolutionTargets.length === 0) {
      return 'ENDPOINT';
    }

    return 'STANDARD';
  }

  targetRouteStatus(source: Monster, target: Monster): string {
    if (target.unlocked) {
      return 'ONLINE';
    }

    if (this.game.canEvolve(source, target)) {
      return 'READY';
    }

    const missing = this.missingRequirementLabels(source, target).slice(0, 2);
    return missing.length > 0 ? `NEEDS ${missing.join(' + ')}` : 'LOCKED';
  }

  executePrimaryRouteAction(): void {
    const selected = this.game.selectedMonster();
    const target = this.primarySelectedTarget();

    if (!selected || !target) {
      return;
    }

    if (this.game.canEvolve(selected, target)) {
      this.game.evolve(selected.id, target.id);
      return;
    }

    if (!target.unlocked) {
      this.game.pinChaseTarget(target.id);
    }
  }

  primaryRouteActionDisabled(): boolean {
    const target = this.primarySelectedTarget();
    return !target || target.unlocked;
  }

  primaryRouteActionReady(source: Monster): boolean {
    const target = this.primarySelectedTarget();
    return Boolean(target && this.game.canEvolve(source, target));
  }

  primaryRouteActionLabel(): string {
    const selected = this.game.selectedMonster();
    const target = this.primarySelectedTarget();

    if (!selected || !target) {
      return 'Select Route';
    }

    if (this.game.canEvolve(selected, target)) {
      return `Evolve ${target.name}`;
    }

    if (target.unlocked) {
      return 'Route Online';
    }

    return `Pin ${target.name}`;
  }

  recommendedTrainingDrill(monster: Monster): MonsterTrainingDrill | null {
    return this.game.getMonsterTrainingDrills(monster).find((drill) => this.game.canAffordCoins(drill.costCoins)) ?? this.game.getMonsterTrainingDrills(monster)[0] ?? null;
  }

  runRecommendedTraining(monster: Monster): void {
    const drill = this.recommendedTrainingDrill(monster);
    if (!drill) {
      return;
    }
    this.game.runMonsterTraining(monster.id, drill.id);
  }

  private missingRequirementLabels(source: Monster, target: Monster): string[] {
    return this.game
      .getRequirementStatuses(source, target)
      .filter((status) => !status.met)
      .map((status) => status.label.toUpperCase());
  }

  private stageIdRange(monsters: Monster[]): string {
    const first = monsters[0]?.id ?? 'M---';
    const last = monsters[monsters.length - 1]?.id ?? 'M---';
    return `${first}-${last}`;
  }
}
