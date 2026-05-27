import { Component, computed, inject, signal } from '@angular/core';
import { MonsterStage } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';

interface ManualRule {
  code: string;
  label: string;
  detail: string;
  state: string;
  active: boolean;
}

interface StageManualRow {
  stage: MonsterStage;
  className: string;
  glyph: string;
  unlocked: number;
  total: number;
}

const STAGE_GLYPHS: Record<MonsterStage, string> = {
  Baby: 'B-1',
  'In-Training': 'IT',
  Rookie: 'RK',
  Champion: 'CH',
  Ultimate: 'UL',
  Mega: 'MG',
  Special: 'SP',
};

@Component({
  selector: 'app-handbook',
  templateUrl: './handbook.component.html',
  styleUrl: './handbook.component.scss',
})
export class HandbookComponent {
  readonly game = inject(GameStateService);
  readonly resetArmed = signal(false);

  readonly stageRows = computed<StageManualRow[]>(() => {
    const monsters = this.game.monsters();

    return this.game.stages.map((stage) => {
      const stageMonsters = monsters.filter((monster) => monster.stage === stage);

      return {
        stage,
        className: this.game.stageClass(stage),
        glyph: STAGE_GLYPHS[stage],
        unlocked: stageMonsters.filter((monster) => monster.unlocked).length,
        total: stageMonsters.length,
      };
    });
  });

  readonly selectedRoutes = computed(() => {
    const selected = this.game.selectedMonster();

    if (!selected) {
      return [];
    }

    return this.game.getEvolutionTargets(selected).map((target) => {
      const missing = this.game
        .getRequirementStatuses(selected, target)
        .filter((requirement) => !requirement.met)
        .map((requirement) => requirement.label);

      return {
        target,
        ready: this.game.canEvolve(selected, target),
        missingLabel: missing.length ? missing.join(', ') : 'Ready',
      };
    });
  });

  readonly inventoryRows = computed(() =>
    this.game.inventoryItems.map((item) => ({
      item,
      count: this.game.player().inventory.filter((ownedItem) => ownedItem === item).length,
    })),
  );

  readonly latestLogs = computed(() => this.game.battleLogs().slice(0, 4));

  readonly lastRewardLabel = computed(() => {
    const reward = this.game.lastReward();

    if (!reward) {
      return 'No reward packet yet';
    }

    return `${reward.won ? 'Win' : 'Retreat'} +${reward.coins} CR +${reward.dnaShards} DNA +${reward.xp} XP`;
  });

  readonly directive = computed(() => {
    const selected = this.game.selectedMonster();
    const squadSize = this.game.squad().length;
    const readyRoutes = this.selectedRoutes().filter((route) => route.ready);

    if (!selected) {
      return {
        code: 'SCAN',
        label: 'Select a creature signal',
        detail: 'Open the Evolution Tree and lock onto a node before making squad or route calls.',
        tone: 'scan',
      };
    }

    if (squadSize < 3) {
      return {
        code: 'SQUAD',
        label: `Fill ${3 - squadSize} open squad slot${3 - squadSize === 1 ? '' : 's'}`,
        detail: `${selected.name} is selected. Add unlocked allies until the dock has three active units.`,
        tone: 'squad',
      };
    }

    if (readyRoutes.length) {
      return {
        code: 'EVO',
        label: `Evolve into ${readyRoutes[0].target.name}`,
        detail: 'A selected route is funded and unlocked. Use the detail panel evolve command.',
        tone: 'ready',
      };
    }

    return {
      code: 'BATTLE',
      label: 'Run the arena loop',
      detail:
        'Battle for XP, Coins, DNA Shards, and item chances, then recheck the selected route.',
      tone: 'battle',
    };
  });

  readonly nextRules = computed<ManualRule[]>(() => {
    const selected = this.game.selectedMonster();
    const squadSize = this.game.squad().length;
    const readyRouteCount = this.selectedRoutes().filter((route) => route.ready).length;
    const lockedCount = this.game.lockedCount();

    return [
      {
        code: '01',
        label: 'Select a node',
        detail:
          'Every command keys off the selected creature, its stage, and its visible route targets.',
        state: selected ? selected.name : 'Needed',
        active: !selected,
      },
      {
        code: '02',
        label: 'Fill squad dock',
        detail: 'Use unlocked creatures first. Three active slots make battles and XP flow faster.',
        state: `${squadSize}/3 slots`,
        active: squadSize < 3,
      },
      {
        code: '03',
        label: 'Evolve ready routes',
        detail:
          'If a target reads Ready, spend local resources from the detail panel to unlock it.',
        state: readyRouteCount ? `${readyRouteCount} ready` : 'No ready route',
        active: readyRouteCount > 0,
      },
      {
        code: '04',
        label: 'Battle for blockers',
        detail:
          'When routes are blocked, battle to build level, Coins, DNA Shards, and item stock.',
        state: squadSize ? 'Battle enabled' : 'Needs squad',
        active: squadSize > 0 && readyRouteCount === 0,
      },
      {
        code: '05',
        label: 'Use Collection filters',
        detail: 'Filter locked stages to pick a chase target when the current route stalls.',
        state: `${lockedCount} locked`,
        active: lockedCount > 0 && squadSize === 3 && readyRouteCount === 0,
      },
    ];
  });

  saveNow(): void {
    this.game.syncSaveState();
  }

  armReset(): void {
    this.resetArmed.set(true);
  }

  cancelReset(): void {
    this.resetArmed.set(false);
  }

  confirmReset(): void {
    this.game.resetProgress();
    this.resetArmed.set(false);
  }
}
