import { Component, HostListener, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { BattleAnimationService } from '../../services/battle-animation.service';
import { BattleCategoryId, BattleStanceId } from '../../rules/battle.rules';
import { getMonsterMoves, getOverdriveMove } from '../../rules/moves.rules';
import { Monster } from '../../models/monster.model';
import { AfterActionCard } from '../../rules/after-action.rules';
import { BattleContractCard } from '../../rules/battle-contract.rules';
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

interface ReadinessCheck {
  label: string;
  value: string;
  detail: string;
  ready: boolean;
  tone: 'ready' | 'warn' | 'boost';
}

@Component({
  selector: 'app-arena',
  imports: [PixiBattleStageComponent, CombatBeatComponent, CreaturePortraitComponent],
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
  readonly enemyTypeEdge = this.game.enemyTypePressure;
  readonly synergySignals = this.game.squadSynergies;
  readonly battleCategories = this.game.battleCategories;
  readonly activeBattleCategoryId = this.game.battleCategoryId;
  readonly activeBattleCategory = this.game.battleCategory;
  readonly battleOutlook = this.game.battleOutlook;
  readonly rewardForecast = this.game.arenaRewardForecast;
  readonly nextBattleMilestone = this.game.nextBattleMilestone;
  readonly arenaMomentum = this.game.arenaMomentum;
  readonly arenaObjectiveCards = this.game.arenaObjectiveCards;
  readonly recentBattles = this.game.recentBattles;
  readonly battleIntelSummary = this.game.battleIntelSummary;
  readonly afterActionCards = this.game.afterActionCards;
  readonly battleContractCards = this.game.battleContractCards;
  readonly masteryAwards = this.game.lastBattleMastery;
  readonly battleSession = this.game.battleSession;
  readonly battleRound = computed(() => this.battleSession()?.round ?? 0);
  readonly battlePhase = computed(() => this.battleSession()?.phase ?? 'opening');
  readonly masteryGoals = computed(() =>
    this.game.squad().map((monster) => ({
      monster,
      goal: this.game.masteryGoal(monster),
      progress: this.game.monsterMastery(monster.id),
    })),
  );
  readonly squadPlans: readonly { id: BattleStanceId; label: string; detail: string }[] = [
    { id: 'aggressive', label: 'Assault', detail: 'Faster damage, lighter cover.' },
    { id: 'balanced', label: 'Balance', detail: 'Stable output and defense.' },
    { id: 'defensive', label: 'Guard', detail: 'Lower damage, strong cover.' },
  ];

  readonly readinessChecks = computed<ReadinessCheck[]>(() => {
    const squadSize = this.game.squad().length;
    const outlook = this.battleOutlook();
    const typeEdge = this.squadTypeEdge();
    const reward = this.rewardForecast();

    return [
      {
        label: 'Squad',
        value: `${squadSize}/3`,
        detail: squadSize === 3 ? 'Full formation loaded.' : 'Fill every slot to stabilize battle rolls.',
        ready: squadSize === 3,
        tone: squadSize === 3 ? 'ready' : 'warn',
      },
      {
        label: 'Forecast',
        value: outlook.label,
        detail: outlook.detail,
        ready: outlook.tone !== 'low',
        tone: outlook.tone === 'strong' ? 'boost' : outlook.tone === 'even' ? 'ready' : 'warn',
      },
      {
        label: 'Type Edge',
        value: typeEdge.label,
        detail: typeEdge.detail,
        ready: typeEdge.modifier >= 0,
        tone: typeEdge.modifier > 0 ? 'boost' : typeEdge.modifier === 0 ? 'ready' : 'warn',
      },
      {
        label: 'Loadout',
        value: `${this.equippedConsumables().length}/2`,
        detail:
          this.equippedConsumables().length > 0
            ? 'Consumable support armed for the next run.'
            : 'Equip a consumable for risky or boss runs.',
        ready: this.equippedConsumables().length > 0 || outlook.tone === 'strong',
        tone: this.equippedConsumables().length > 0 ? 'boost' : outlook.tone === 'strong' ? 'ready' : 'warn',
      },
      {
        label: 'Payout',
        value: `${reward.itemChancePercent}% item`,
        detail: `Win preview: +${reward.win.coins} CR / +${reward.win.dnaShards} DNA / +${reward.win.xp} XP.`,
        ready: reward.itemChancePercent >= 25,
        tone: reward.itemChancePercent >= 33 ? 'boost' : 'ready',
      },
      {
        label: 'Overdrive',
        value: this.overdriveReady() ? (this.overdriveArmed() ? 'ARMED' : 'READY') : `${this.overdrivePercent()}%`,
        detail: this.overdriveReady()
          ? 'Spend it on a valuable run or keep banking it.'
          : 'Battles charge the core. Wins charge faster.',
        ready: this.overdriveReady(),
        tone: this.overdriveArmed() ? 'boost' : this.overdriveReady() ? 'ready' : 'warn',
      },
    ];
  });

  readonly readinessPercent = computed(() => {
    const checks = this.readinessChecks();
    const ready = checks.filter((check) => check.ready).length;
    return Math.round((ready / checks.length) * 100);
  });

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
  readonly squadTrainingDrill = this.game.squadTrainingDrill;
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

  applyBattleCoachAndLaunch(): void {
    const plan = this.battleCoach();
    this.game.applyBattlePrepAndLaunch(plan.stanceId, plan.categoryId, plan.itemName);
  }

  runCalibrationDrill(): void {
    this.game.runSquadTrainingDrill();
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

  multiplierLabel(value: number): string {
    return `${value.toFixed(2)}x`;
  }

  battleRecordMetric(record: ReturnType<GameStateService['recentBattles']>[number]): string {
    return `+${record.coins} CR / +${record.xp} XP`;
  }

  runAfterAction(card: AfterActionCard): void {
    this.game.runMetaAction(card.actionId);
  }

  applyBattleContract(card: BattleContractCard): void {
    this.game.applyBattleContract(card.id, false);
  }

  launchBattleContract(card: BattleContractCard): void {
    this.game.applyBattleContract(card.id, true);
  }
}
