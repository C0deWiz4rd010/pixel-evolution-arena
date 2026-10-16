import { CountUpDirective } from '../../directives/count-up.directive';
import { stillSprite } from '../../rules/sprite.rules';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { BattleAnimationService } from '../../services/battle-animation.service';
import { BattleCategoryId, BattleStanceId } from '../../rules/battle.rules';
import { Monster } from '../../models/monster.model';
import { PixiBattleStageComponent } from '../pixi-battle-stage/pixi-battle-stage.component';
import { CombatBeatComponent } from '../combat-beat/combat-beat.component';
import { CreaturePortraitComponent } from '../creature-portrait/creature-portrait.component';

interface BattleCoachPlan {
  title: string;
  detail: string;
  stanceId: BattleStanceId;
  categoryId: BattleCategoryId;
  itemName: string | null;
  actionLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-arena',
  imports: [CountUpDirective, PixiBattleStageComponent, CombatBeatComponent, CreaturePortraitComponent],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.scss',
})
export class ArenaComponent {
  /** Frozen sprite copy for list/grid rendering (see sprite.rules). */
  readonly still = stillSprite;
  readonly game = inject(GameStateService);
  readonly anim = inject(BattleAnimationService);

  readonly startBattleLabel = computed(() => {
    if (this.game.battleOrderOpen()) return 'Choose Squad Order';
    if (this.game.tacticalPulseOpen()) return 'Choose Tactical Pulse';
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
  readonly battleCategories = this.game.battleCategories;
  readonly activeBattleCategoryId = this.game.battleCategoryId;
  readonly activeBattleCategory = this.game.battleCategory;
  readonly battleOutlook = this.game.battleOutlook;
  readonly rewardForecast = this.game.arenaRewardForecast;
  readonly masteryAwards = this.game.lastBattleMastery;
  readonly battleSession = this.game.battleSession;
  readonly battlePhase = computed(() => this.battleSession()?.phase ?? 'opening');
  readonly squadPlans: readonly { id: BattleStanceId; label: string; detail: string }[] = [
    { id: 'aggressive', label: 'Assault', detail: 'Faster damage, lighter cover.' },
    { id: 'balanced', label: 'Balance', detail: 'Stable output and defense.' },
    { id: 'defensive', label: 'Guard', detail: 'Lower damage, strong cover.' },
  ];

  setBattleCategory(id: BattleCategoryId): void {
    this.game.setBattleCategory(id);
  }

  // --- Hybrid-Steuerung + neue Modi ---
  readonly activeBattleStanceId = this.game.battleStanceId;
  readonly activeBattleStance = this.game.battleStance;
  readonly battleMode = this.game.battleMode;
  readonly gauntletWave = this.game.gauntletWave;
  readonly overdrivePercent = this.game.overdrivePercent;
  readonly overdriveReady = this.game.overdriveReady;
  readonly overdriveArmed = this.game.overdriveArmed;

  readonly ownedConsumables = this.game.ownedConsumables;
  readonly equippedConsumables = this.game.equippedConsumables;

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

  applyBattleCoach(): void {
    const plan = this.battleCoach();
    this.game.applyBattlePrep(plan.stanceId, plan.categoryId, plan.itemName);
  }

  chooseTacticalPulse(choice: 'break' | 'guard' | 'surge'): void {
    this.game.chooseTacticalPulse(choice);
  }

  chooseBattleOrder(choice: 'focus' | 'protect' | 'charge'): void {
    this.game.chooseBattleOrder(choice);
  }

  continueGrowth(): void {
    this.game.requestTab('Evolution Tree');
  }

  growthMonster(monsterId: string): Monster | null {
    return this.game.monsters().find((monster) => monster.id === monsterId) ?? null;
  }

  nextRouteName(monsterId: string): string {
    const monster = this.growthMonster(monsterId);
    const target = monster ? this.game.getEvolutionTargets(monster).find((entry) => !entry.unlocked) : null;
    return target?.name ?? 'Family mastery';
  }

  masteryPercent(total: number): number {
    return Math.min(100, Math.round((total / 50) * 100));
  }

  @HostListener('window:keydown', ['$event'])
  handlePulseKey(event: KeyboardEvent): void {
    if ((!this.game.tacticalPulseOpen() && !this.game.battleOrderOpen()) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (this.game.battleOrderOpen()) {
      const order = event.key === '1' ? 'focus' : event.key === '2' ? 'protect' : event.key === '3' ? 'charge' : null;
      if (order) this.chooseBattleOrder(order);
      return;
    }
    const pulse = event.key === '1' ? 'break' : event.key === '2' ? 'guard' : event.key === '3' ? 'surge' : null;
    if (pulse) this.chooseTacticalPulse(pulse);
  }

  isEquipped(name: string): boolean {
    return this.equippedConsumables().includes(name);
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

}
