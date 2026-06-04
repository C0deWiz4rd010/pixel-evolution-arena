import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { BattleAnimationService } from '../../services/battle-animation.service';
import { BattleCategoryId, BattleStanceId } from '../../rules/battle.rules';
import { getMonsterMoves, getOverdriveMove } from '../../rules/moves.rules';
import { Monster } from '../../models/monster.model';
import { PixiBattleStageComponent } from '../pixi-battle-stage/pixi-battle-stage.component';

interface BattleCoachPlan {
  title: string;
  detail: string;
  stanceId: BattleStanceId;
  categoryId: BattleCategoryId;
  itemName: string | null;
  actionLabel: string;
}

@Component({
  selector: 'app-arena',
  imports: [PixiBattleStageComponent],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.scss',
})
export class ArenaComponent {
  readonly game = inject(GameStateService);
  readonly anim = inject(BattleAnimationService);

  readonly squadSlots = computed(() => {
    const squad = this.game.squad();
    return [0, 1, 2].map((slot) => squad[slot] ?? null);
  });

  readonly playerPopups = computed(() => this.anim.popups().filter((p) => p.side === 'player'));
  readonly enemyPopups = computed(() => this.anim.popups().filter((p) => p.side === 'enemy'));

  readonly playerHpClass = computed(() => {
    const value = this.anim.playerHpPercent();
    if (value <= 20) return 'critical';
    if (value <= 55) return 'warning';
    return 'safe';
  });

  readonly enemyHpClass = computed(() => {
    const value = this.anim.enemyHpPercent();
    if (value <= 20) return 'critical';
    if (value <= 55) return 'warning';
    return 'safe';
  });

  readonly startBattleLabel = computed(() => {
    if (this.anim.isPlaying()) return 'Battle In Progress...';
    if (this.game.squad().length === 0) return 'Add Squad To Start';
    const reward = this.game.lastReward();
    if (reward === null) return 'Start Battle';
    return reward.won ? 'Queue Next Battle' : 'Retry Battle';
  });

  readonly recentLogs = computed(() => this.game.battleLogs().slice(0, 9));

  readonly powerDelta = computed(() => this.game.teamPower() - this.game.enemyPower());
  readonly arenaDirective = this.game.arenaDirective;
  readonly activeFormation = this.game.activeFormation;
  readonly arenaThreat = this.game.upcomingArenaThreat;
  readonly squadTypeEdge = this.game.squadTypePressure;
  readonly enemyTypeEdge = this.game.enemyTypePressure;
  readonly synergySignals = this.game.squadSynergies;
  readonly battleCategories = this.game.battleCategories;
  readonly activeBattleCategoryId = this.game.battleCategoryId;
  readonly activeBattleCategory = this.game.battleCategory;
  readonly battleOutlook = this.game.battleOutlook;

  setBattleCategory(id: BattleCategoryId): void {
    this.game.setBattleCategory(id);
  }

  // --- Hybrid-Steuerung + neue Modi ---
  readonly battleStances = this.game.battleStances;
  readonly activeBattleStanceId = this.game.battleStanceId;
  readonly activeBattleStance = this.game.battleStance;
  readonly battleMode = this.game.battleMode;
  readonly gauntletWave = this.game.gauntletWave;
  readonly overdrivePercent = this.game.overdrivePercent;
  readonly overdriveReady = this.game.overdriveReady;
  readonly overdriveArmed = this.game.overdriveArmed;
  readonly bestGauntletWave = computed(() => this.game.player().combatStats.gauntletBestWave);

  readonly consumables = this.game.consumables;
  readonly ownedConsumables = this.game.ownedConsumables;
  readonly equippedConsumables = this.game.equippedConsumables;

  readonly dailyDirective = this.game.dailyDirective;
  readonly dailyObjective = this.game.dailyObjective;
  readonly dailyComplete = this.game.dailyComplete;
  readonly dailyProgressLabel = computed(() => `${this.dailyDirective().progress}/${this.dailyObjective().goal}`);

  readonly battleCoach = computed<BattleCoachPlan>(() => {
    if (this.game.squad().length === 0) {
      return {
        title: 'Load squad first',
        detail: 'The coach needs at least one allied signal before it can tune stance, risk, or item loadout.',
        stanceId: 'balanced',
        categoryId: 'training',
        itemName: null,
        actionLabel: 'No Squad',
      };
    }

    const outlook = this.battleOutlook();
    if (outlook.tone === 'low') {
      return {
        title: 'Survival plan',
        detail: 'Guard stance plus Training lowers pressure. Aegis or Repair helps stabilize weak lines.',
        stanceId: 'defensive',
        categoryId: 'training',
        itemName: this.firstOwnedConsumable(['Aegis Plating', 'Repair Cell']),
        actionLabel: 'Apply Safe Plan',
      };
    }

    if (outlook.tone === 'even') {
      return {
        title: 'Tempo plan',
        detail: 'Balanced stance keeps variance low. Focus Capsule can tip a close match without overcommitting.',
        stanceId: 'balanced',
        categoryId: 'standard',
        itemName: this.firstOwnedConsumable(['Focus Capsule', 'Repair Cell']),
        actionLabel: 'Apply Tempo Plan',
      };
    }

    return {
      title: this.game.winStreak() >= 2 ? 'Cash-out plan' : 'Pressure plan',
      detail:
        this.game.winStreak() >= 2
          ? 'Aggro plus Risk can cash in a strong forecast and streak bonus.'
          : 'Aggro stance speeds up a favored run. Stay Standard if you want steadier gauntlet setup.',
      stanceId: 'aggressive',
      categoryId: this.game.winStreak() >= 2 ? 'risk' : 'standard',
      itemName: this.firstOwnedConsumable(['Focus Capsule']),
      actionLabel: 'Apply Push Plan',
    };
  });

  readonly leadOverdriveName = computed(() => {
    const lead = this.game.squad()[0];
    return lead ? getOverdriveMove(lead.type).name : 'Overdrive Core';
  });

  setBattleStance(id: BattleStanceId): void {
    this.game.setBattleStance(id);
  }

  setBattleMode(mode: 'standard' | 'gauntlet'): void {
    this.game.setBattleMode(mode);
  }

  toggleOverdrive(): void {
    this.game.toggleOverdriveArmed();
  }

  toggleConsumable(name: string): void {
    this.game.toggleConsumable(name);
  }

  buyConsumable(name: string): void {
    this.game.buyConsumable(name);
  }

  applyBattleCoach(): void {
    const plan = this.battleCoach();
    if (this.game.squad().length === 0) {
      return;
    }

    this.game.setBattleStance(plan.stanceId);
    this.game.setBattleCategory(plan.categoryId);
    if (plan.itemName && !this.isEquipped(plan.itemName) && this.equippedConsumables().length < 2) {
      this.game.toggleConsumable(plan.itemName);
    }
  }

  isEquipped(name: string): boolean {
    return this.equippedConsumables().includes(name);
  }

  movesFor(monster: Monster): string[] {
    return getMonsterMoves(monster).map((move) => move.name);
  }

  private firstOwnedConsumable(names: string[]): string | null {
    const owned = this.ownedConsumables();
    return names.find((name) => (owned.find((entry) => entry.def.name === name)?.count ?? 0) > 0) ?? null;
  }

  readonly powerDeltaLabel = computed(() => {
    const delta = this.powerDelta();
    return `${delta >= 0 ? '+' : ''}${delta}`;
  });

  readonly pressureLabel = computed(() => {
    if (this.game.squad().length === 0) {
      return 'No squad signal';
    }

    if (this.squadTypeEdge().modifier >= 0.07) {
      return 'Type edge online';
    }

    const delta = this.powerDelta();

    if (delta >= 160) {
      return 'Allied advantage';
    }

    if (delta >= -80) {
      return 'Contested signal';
    }

    return 'Enemy pressure';
  });

  readonly terminalStatus = computed(() => {
    if (this.game.squad().length === 0) {
      return 'Squad required';
    }

    const reward = this.game.lastReward();

    if (reward === null) {
      return 'Ready';
    }

    return reward.won ? 'Victory cached' : 'Retreat cached';
  });

  readonly terminalTone = computed(() => {
    const reward = this.game.lastReward();

    if (this.game.squad().length === 0) {
      return 'is-blocked';
    }

    if (reward === null) {
      return 'is-ready';
    }

    return reward.won ? 'is-victory' : 'is-retreat';
  });
}
