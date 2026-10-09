import { computed, inject, Injectable, signal } from '@angular/core';
import { ARENA_FORMATIONS } from '../data/enemies.data';
import { STAGES, TYPES } from '../data/monsters.data';
import { ArenaFormation, BattleLog, EnemyMonster } from '../models/battle.model';
import { Monster, MonsterRarity, MonsterStage } from '../models/monster.model';
import { CombatStats, RecentBattleRecord } from '../models/player-state.model';
import { serializeMonsterProgress } from '../models/save-state.model';
import {
  ArenaThreatProfile,
  BATTLE_CATEGORIES,
  BATTLE_STANCES,
  BattleCategoryId,
  BattleCategoryProfile,
  BattleStanceId,
  OVERDRIVE_ATTACK_BONUS,
  WIN_STREAK_MILESTONES,
  applyStreakBonus,
  applyTrainingAssist,
  buildBattleLogsFromEvents,
  buildReward,
  calculateEnemyBattleModifier,
  calculateStreakBonus,
  canArmOverdrive,
  chargeOverdrive,
  findCrossedMilestone,
  generateLossHint,
  getBattleCategoryProfile,
  getBattleStanceProfile,
  milestoneLabel,
  predictBattleOutlook,
  shouldAwardItem,
} from '../rules/battle.rules';
import { simulateBattle } from '../rules/combat.engine';
import { ComboBeatResult, resolveComboBeat } from '../rules/combo.rules';
import { CONSUMABLES } from '../data/items.data';
import { CONSUMABLE_NAMES, countInInventory, getConsumableDef, isConsumable, removeOneFromInventory, toCombatEffects } from '../rules/items.rules';
import { ensureDailyDirective, getDailyObjectiveDef, getDateKey, isDailyComplete, progressDaily } from '../rules/daily.rules';
import {
  applyEvolutionToPlayer,
  canEvolve,
  getRequirementStatuses,
  RequirementStatus,
  unlockEvolutionTarget,
} from '../rules/evolution.rules';
import { calculateSquadBattleModifier, evaluateSquadSynergies, getMonsterPower } from '../rules/squad.rules';
import { evaluateTypePressure } from '../rules/type-matchup.rules';
import { applyXpToMonster, applyXpToSquad } from '../rules/xp.rules';
import { BossDef, getBossForBattle } from '../data/bosses.data';
import { SAVE_STATE_VERSION, SaveStateSnapshot } from '../models/save-state.model';
import { stageClass } from '../rules/stage.rules';
import { getMutatorForBattle, MutatorDef } from '../data/mutators.data';
import { resolveMutator } from '../rules/mutators.rules';
import { totalSquadTraitBonus } from '../rules/traits.rules';
import { ExpeditionNodeType, ExpeditionState } from '../models/expedition.model';
import { clearNode, generateExpedition, getNode, relicBonus, rollRelicChoices } from '../rules/expedition.rules';
import { getRelicDef, RELIC_DEFS } from '../data/relics.data';
import {
  dataFromBattle,
  EVOLUTION_DATA_BONUS,
  FULL_SCAN_BONUS,
  scanGain,
  applyResearchYield,
  pickReserveScanTargets,
  reserveScanGain } from '../rules/research.rules';
import { BattleIntelSummary, summarizeBattleRecords } from '../rules/battle-intel.rules';
import {
  buildBossPrepCards,
  buildCommandCenterCards,
  buildMedalFocusCards,
  buildSystemCheckCards,
  CommandCenterCard,
  MetaActionId,
} from '../rules/command-center.rules';
import {
  estimateRouteWins,
  RouteEtaInput,
  SquadPatchInput,
} from '../rules/tactical-directive.rules';
import { AfterActionCard, buildAfterActionQueue } from '../rules/after-action.rules';
import { BattleContractCard, buildBattleContracts } from '../rules/battle-contract.rules';
import { buildSquadOrders, SquadOrderActionId, SquadOrderCard } from '../rules/squad-order.rules';
import { getMonsterTrainingDrills, getSquadTrainingDrill, MonsterTrainingDrill, MonsterTrainingDrillId, SquadTrainingDrill } from '../rules/training.rules';
import {
  BattleMasteryAward,
  applyMasteryAward,
  awardBattleMastery,
  emptyMonsterMastery,
  masteryGoalFor,
} from '../rules/battle-mastery.rules';
import {
  TACTICAL_PULSE_OPTIONS,
  TacticalPulseChoice,
  recommendTacticalPulse,
} from '../rules/tactical-pulse.rules';
import {
  BattleDecision,
  BattleOrderId,
  BattleSessionState,
  TacticalBattleResult,
  advanceBattleSession,
  applyBattleDecision,
  battleResult,
  createBattleSession,
  recommendedDecision,
} from '../rules/tactical-director.rules';
import { AudioService } from './audio.service';
import { BattleAnimationService } from './battle-animation.service';
import { SaveStateService } from './save-state.service';
import { ToastService } from './toast.service';
import { GameStore } from './game-store.service';
import { SquadStore } from './squad.store';
import { CampaignStore } from './campaign.store';
import { AchievementsStore } from './achievements.store';
import { SettingsStore } from './settings.store';
import { ResearchStore } from './research.store';
import { GearStore } from './gear.store';
import {
  MAX_LOADOUT,
  MAX_RECENT_BATTLES,
  STAGE_MILESTONE_REWARD,
  base64Decode,
  base64Encode,
  cloneBattleLogs,
  clonePlayerState,
  createStarterBattleLogs,
  createStarterMonsters,
  createStarterPlayerState,
  formatSaveTimestamp,
  hasProgressBeyondStarter,
  nodeHash,
  rarityWeight,
  sanitizePlayerState } from './game-state.helpers';
import {
  ArenaMomentumPanel,
  ArenaObjectiveCard,
  ArenaRewardForecast,
  ArenaRunDirective,
  BattleMilestonePreview,
  EvolutionCandidate,
  GameSectionName,
  NextCommand,
  RouteStatusChip,
} from './game-state.models';

export * from './game-state.models';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly store = inject(GameStore);
  readonly squadOps = inject(SquadStore);
  readonly campaign = inject(CampaignStore);
  readonly medals = inject(AchievementsStore);
  readonly prefs = inject(SettingsStore);
  readonly research = inject(ResearchStore);
  readonly gear = inject(GearStore);
  private readonly saveState = inject(SaveStateService);
  private readonly audio = inject(AudioService);
  private readonly toast = inject(ToastService);
  private readonly battleAnimation = inject(BattleAnimationService);

  readonly stages = STAGES;
  readonly types = TYPES;
  readonly rarities: MonsterRarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
  readonly arenaFormations = ARENA_FORMATIONS;
  readonly inventoryItems = ['Armor Core', 'Shadow Gem', 'Solar Crest', 'Ancient Gear'];

  readonly battleCategories = BATTLE_CATEGORIES;

  // Root state lives in GameStore; these aliases keep the existing component API stable.
  readonly monsters = this.store.monsters;
  readonly player = this.store.player;
  readonly battleLogs = this.store.battleLogs;
  readonly lastReward = this.store.lastReward;
  readonly lastBattleThreat = this.store.lastBattleThreat;
  readonly battleCategoryId = signal<BattleCategoryId>('training');
  readonly battleCategory = computed<BattleCategoryProfile>(() => getBattleCategoryProfile(this.battleCategoryId()));

  // --- Hybrid-Steuerung + neue Modi (teils transient, teils aus PlayerState) ---
  readonly battleStances = BATTLE_STANCES;
  readonly consumables = CONSUMABLES;
  readonly battleStanceId = signal<BattleStanceId>('balanced');
  readonly battleStance = computed(() => getBattleStanceProfile(this.battleStanceId()));
  readonly battleMode = signal<'standard' | 'gauntlet'>('standard');
  readonly gauntletWave = signal(0);
  readonly overdriveArmed = signal(false);
  /** Transient loadout: up to two consumables for the next battle. */
  readonly equippedConsumables = signal<string[]>([]);
  /** Transient, capped Active-Combat-Beat bonus applied to the next battle. */
  readonly comboCharge = signal(0);
  readonly tacticalPulseOptions = TACTICAL_PULSE_OPTIONS;
  readonly tacticalPulseOpen = signal(false);
  readonly tacticalPulseSeconds = signal(0);
  readonly lastTacticalPulse = signal<TacticalPulseChoice | null>(null);
  readonly lastBattleMastery = signal<BattleMasteryAward[]>([]);
  readonly battleSession = signal<BattleSessionState | null>(null);
  readonly battleOrderOpen = computed(() => this.battleSession()?.pendingDecision === 'order');
  readonly recommendedBattleOrder = computed<BattleOrderId | null>(() => {
    const session = this.battleSession();
    const decision = session?.pendingDecision === 'order' ? recommendedDecision(session) : null;
    return decision?.kind === 'order' ? decision.id : null;
  });
  readonly battleDecisionSeconds = signal(0);
  readonly battleOrderOptions: readonly { id: BattleOrderId; label: string; detail: string; key: string }[] = [
    { id: 'focus', label: 'Focus Target', detail: 'Two stronger attacks, but lighter cover.', key: '1' },
    { id: 'protect', label: 'Protect Lead', detail: 'Reduce the next two enemy impacts.', key: '2' },
    { id: 'charge', label: 'Build Overdrive', detail: '+30 charge for lower short-term damage.', key: '3' },
  ];
  /** Cross-tab navigation requests triggered by shared meta actions. */
  readonly requestedTab = signal<GameSectionName | null>(null);

  /**
   * Locks the combat-beat marker; a Perfect/Good landing grants a tiered,
   * capped attack bonus for the next battle. Returns the result so the UI can
   * reflect the tier.
   */
  lockComboBeat(marker: number): ComboBeatResult {
    const result = resolveComboBeat(marker);
    this.comboCharge.set(result.bonus);
    if (result.tier !== 'miss') {
      this.audio.play('level-up');
      const headline = result.tier === 'perfect' ? 'Perfect Beat' : 'Beat Landed';
      this.toast.push({
        title: headline,
        message: `Next battle primed: +${Math.round(result.bonus * 100)}% attack.`,
        tone: 'success',
        icon: '♪',
        durationMs: 2600,
      });
    }
    return result;
  }

  readonly overdriveCharge = computed(() => this.player().overdriveCharge);
  readonly overdrivePercent = computed(() => Math.round(this.player().overdriveCharge));
  readonly overdriveReady = computed(() => canArmOverdrive(this.player().overdriveCharge));
  private tacticalPulseTimer: ReturnType<typeof setInterval> | null = null;
  private tacticalPulseDeadline = 0;
  private battleDecisionResolve: ((decision: BattleDecision) => void) | null = null;
  private battleRunning = false;

  /** Local calendar day; refreshed at midnight and when the tab becomes visible again. */
  readonly todayKey = signal(getDateKey());
  readonly dailyDirective = computed(() => ensureDailyDirective(this.player().dailyDirective, this.todayKey()));
  readonly dailyObjective = computed(() => getDailyObjectiveDef(this.dailyDirective().objectiveId));
  readonly dailyComplete = computed(() => isDailyComplete(this.dailyDirective()));


  /** Consumable ownership for loadout UI and shop. */
  readonly ownedConsumables = computed(() =>
    this.consumables.map((def) => ({ def, count: countInInventory(this.player().inventory, def.name) })),
  );

  readonly saveSyncState = this.saveState.syncState;
  readonly saveVersion = this.saveState.saveVersion;
  readonly saveStatusLabel = computed(() => {
    switch (this.saveState.syncState()) {
      case 'unsupported':
        return 'VOLATILE';
      case 'error':
        return 'ERROR';
      default:
        return 'SYNCED';
    }
  });
  readonly saveStorageLabel = computed(() => (this.saveState.syncState() === 'unsupported' ? 'Session only' : 'Local archive'));
  readonly lastSavedLabel = computed(() => formatSaveTimestamp(this.saveState.lastSavedAt()));
  readonly hasProgressToReset = computed(() => hasProgressBeyondStarter(this.player(), this.monsters()));

  readonly selectedMonster = computed(() => {
    const selectedId = this.player().selectedMonsterId;
    return (selectedId ? this.store.getMonsterById(selectedId) : undefined) ?? this.monsters().find((monster) => monster.unlocked) ?? null;
  });

  readonly squad = this.store.squad;


  readonly teamPower = computed(() => this.gear.effectiveSquad().reduce((total, monster) => total + getMonsterPower(monster), 0));

  readonly unlockedCount = this.store.unlockedCount;

  readonly lockedCount = computed(() => this.monsters().length - this.unlockedCount());

  readonly activeFormation = computed(() => this.getArenaFormation(this.player().battlesFought + 1));

  /** Enemies for the current battle; gauntlet scales them per wave. */
  readonly activeEnemies = computed<EnemyMonster[]>(() => {
    const base = this.activeFormation().enemies;
    if (this.battleMode() !== 'gauntlet') {
      return base;
    }
    const wave = this.gauntletWave();
    const growth = 1 + 0.14 * wave;
    return base.map((enemy) => ({
      ...enemy,
      name: `${enemy.name} W${wave + 1}`,
      hp: Math.round(enemy.hp * growth),
      attack: Math.round(enemy.attack * growth),
      defense: Math.round(enemy.defense * growth),
      speed: Math.round(enemy.speed * growth),
    }));
  });

  readonly enemyPower = computed(() => this.activeEnemies().reduce((total, enemy) => total + getMonsterPower(enemy), 0));

  readonly upcomingArenaThreat = computed(() => this.getArenaThreatProfile(this.player().battlesFought + 1));

  readonly arenaDirective = computed<ArenaRunDirective>(() => {
    const formation = this.activeFormation();
    const threat = this.upcomingArenaThreat();

    return {
      title: `${formation.tier} // ${formation.name}`,
      objective: formation.objective,
      rewardFocus: `${formation.rewardFocus} ${threat.rewardModifier > 1 ? `${threat.label} bonus live.` : ''}`.trim(),
      tacticalHint: `${formation.tacticalHint} ${threat.detail}`.trim(),
    };
  });

  readonly squadSynergies = computed(() => evaluateSquadSynergies(this.squad()));

  readonly squadTypePressure = computed(() => evaluateTypePressure(this.squad().map((monster) => monster.type), this.activeEnemies().map((enemy) => enemy.type)));

  readonly enemyTypePressure = computed(() => evaluateTypePressure(this.activeEnemies().map((enemy) => enemy.type), this.squad().map((monster) => monster.type), true));

  // --- Signature traits + battlefield mutators (additive, neutral by default) ---
  readonly activeMutator = computed<MutatorDef>(() => getMutatorForBattle(this.player().battlesFought + 1));
  readonly traitBonus = computed(() => totalSquadTraitBonus(this.squad()));
  readonly mutatorModifier = computed(() => resolveMutator(this.activeMutator(), this.squad().map((monster) => monster.type)));

  readonly squadBattleModifier = computed(
    () =>
      calculateSquadBattleModifier(this.squadSynergies(), this.squadTypePressure().modifier) +
      this.traitBonus().attackBonus +
      this.mutatorModifier().playerAttackBonus,
  );

  readonly enemyBattleModifier = computed(() => {
    const baseModifier = calculateEnemyBattleModifier(
      this.activeFormation().enemyModifier +
        this.upcomingArenaThreat().enemyModifier +
        this.battleCategory().enemyModifier +
        this.mutatorModifier().enemyModifier,
      this.enemyTypePressure().modifier,
    );
    return this.battleCategoryId() === 'training'
      ? applyTrainingAssist(baseModifier, this.teamPower(), this.enemyPower(), this.squad().length)
      : baseModifier;
  });

  /** Summed attack bonus from the currently equipped consumables (matches the engine). */
  readonly equippedAttackBonus = computed(() =>
    this.equippedConsumables().reduce((total, name) => {
      const effect = getConsumableDef(name)?.effect;
      return total + (effect?.attackBonus ?? (effect?.kind === 'rally' ? 0.06 : 0));
    }, 0),
  );

  /**
   * Every active player-side attack modifier folded into one number, mirroring
   * the engine's playerAttackBonus so the forecast reflects stance, combo,
   * consumables and an armed Overdrive — not just squad synergy.
   */
  readonly effectivePlayerModifier = computed(
    () =>
      this.squadBattleModifier() +
      this.battleStance().attackMod +
      this.comboCharge() +
      this.equippedAttackBonus() +
      (this.overdriveArmed() && this.overdriveReady() ? OVERDRIVE_ATTACK_BONUS : 0),
  );

  readonly battleOutlook = computed(() =>
    predictBattleOutlook({
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      playerModifier: this.effectivePlayerModifier(),
      enemyModifier: this.enemyBattleModifier(),
      hasSquad: this.squad().length > 0,
    }),
  );
  readonly recommendedTacticalPulse = computed<TacticalPulseChoice>(() => {
    const session = this.battleSession();
    const decision = session?.pendingDecision === 'pulse' ? recommendedDecision(session) : null;
    return decision?.kind === 'pulse' ? decision.id : recommendTacticalPulse(this.battleOutlook().winChancePercent);
  });

  readonly arenaRewardForecast = computed<ArenaRewardForecast>(() => {
    const formation = this.activeFormation();
    const threat = this.upcomingArenaThreat();
    const category = this.battleCategory();
    const gauntletRewardBoost = this.battleMode() === 'gauntlet' ? 1 + 0.08 * this.gauntletWave() : 1;
    const multiplier =
      formation.rewardModifier *
      threat.rewardModifier *
      category.rewardModifier *
      gauntletRewardBoost *
      (1 + this.traitBonus().rewardBonus);
    const baseWin = buildReward(true, false, multiplier);
    const nextStreak = this.player().winStreak + 1;
    const streakBonus = calculateStreakBonus(nextStreak, baseWin);
    const win = applyStreakBonus(baseWin, streakBonus, nextStreak);
    const loss = buildReward(false, false, multiplier);
    const research = this.research.researchModifiers();
    const itemChance = Math.min(
      0.65,
      Math.max(0.05, 0.25 + formation.itemBonus + threat.itemBonus + category.itemBonus + research.itemChanceBonus / 100),
    );

    return {
      win: applyResearchYield(win, research),
      loss: applyResearchYield(loss, research),
      itemChancePercent: Math.round(itemChance * 100),
      multiplier,
      nextStreak,
      streakBonus,
    };
  });

  readonly winStreak = computed(() => this.player().winStreak);
  readonly bestWinStreak = computed(() => this.player().bestWinStreak);

  readonly nextBattleMilestone = computed<BattleMilestonePreview | null>(() => {
    const player = this.player();
    const next = WIN_STREAK_MILESTONES.find(
      (threshold) => player.battlesWon < threshold && !player.claimedMilestones.includes(threshold),
    );

    if (next === undefined) {
      return null;
    }

    return {
      threshold: next,
      winsNeeded: next - player.battlesWon,
      label: milestoneLabel(next),
    };
  });

  readonly arenaMomentum = computed<ArenaMomentumPanel>(() => {
    const squadSize = this.squad().length;
    const forecast = this.arenaRewardForecast();
    if (squadSize === 0) {
      return {
        title: 'Momentum Offline',
        status: 'Squad Required',
        detail: 'Load at least one allied signal before the Arena can build a battle chain.',
        meterPercent: 0,
        nextGoalLabel: '0/3 squad online',
        rewardHint: 'Rewards unlock once a squad enters the sim.',
        tone: 'blocked',
      };
    }

    const player = this.player();
    const streak = player.winStreak;
    const nextGoal = WIN_STREAK_MILESTONES.find((threshold) => streak < threshold) ?? streak + 1;
    const winsNeeded = Math.max(1, nextGoal - streak);
    const outlook = this.battleOutlook();
    const tone: ArenaMomentumPanel['tone'] = this.overdriveReady()
      ? 'charged'
      : outlook.tone === 'low'
        ? 'risk'
        : streak >= 3
          ? 'hot'
          : 'building';

    return {
      title: streak > 0 ? `Chain x${streak}` : 'Ignition Run',
      status: this.overdriveReady() ? 'Overdrive Banked' : streak > 0 ? 'Momentum Live' : 'Chain Ready',
      detail:
        tone === 'risk'
          ? 'Forecast is unstable. Guard, Training, or a stronger slot protects the next run.'
          : tone === 'charged'
            ? 'Spend the charged core on a boss, gauntlet push, or high-value Risk run.'
            : streak > 0
              ? 'Keep winning to stack payout pressure and push the next milestone.'
              : 'The next win starts the bonus chain and charges Overdrive faster.',
      meterPercent: Math.min(100, Math.round((streak / nextGoal) * 100)),
      nextGoalLabel: `${winsNeeded} win${winsNeeded === 1 ? '' : 's'} to x${nextGoal}`,
      rewardHint: `Next win: +${forecast.win.coins} CR / +${forecast.win.xp} XP / ${forecast.itemChancePercent}% item.`,
      tone,
    };
  });

  readonly arenaObjectiveCards = computed<ArenaObjectiveCard[]>(() => {
    const daily = this.dailyObjective();
    const directive = this.dailyDirective();
    const chase = this.pinnedChaseId()
      ? this.evolutionCandidates().find((candidate) => candidate.target.id === this.pinnedChaseId()) ?? this.nextEvolutionCandidate()
      : this.nextEvolutionCandidate();
    const milestone = this.nextBattleMilestone();
    const dailyDone = this.dailyComplete();

    return [
      {
        label: 'Daily Directive',
        value: dailyDone ? 'Claimed' : `${directive.progress}/${daily.goal}`,
        detail: daily.label,
        progressPercent: dailyDone ? 100 : Math.round((directive.progress / daily.goal) * 100),
        tone: 'daily',
      },
      {
        label: chase ? 'Next Evolution' : 'Roster Network',
        value: chase ? `${chase.percent}%` : `${this.unlockedCount()}/${this.monsters().length}`,
        detail: chase ? `${chase.target.name}: ${chase.missing[0]?.label ?? 'ready now'}` : 'All current chase routes are complete.',
        progressPercent: chase ? chase.percent : 100,
        tone: 'evolution',
      },
      {
        label: 'Battle Milestone',
        value: milestone ? `${milestone.winsNeeded} wins` : 'Cleared',
        detail: milestone ? milestone.label : 'All milestone rewards claimed.',
        progressPercent: milestone ? Math.round(((milestone.threshold - milestone.winsNeeded) / milestone.threshold) * 100) : 100,
        tone: 'milestone',
      },
    ];
  });

  // --- Gear, Boss, Campaign, Settings (new feature surfaces) ---

  readonly settings = this.store.settings;
  readonly motionReduced = this.store.motionReduced;

  /** Named boss for the upcoming run, if it is a Boss Surge battle. */
  readonly activeBoss = computed<BossDef | null>(() =>
    this.upcomingArenaThreat().id === 'boss' ? getBossForBattle(this.player().battlesFought + 1) : null,
  );







  readonly prismaticCount = computed(() => this.monsters().filter((monster) => monster.prismatic).length);

  readonly pinnedChaseId = computed(() => this.player().pinnedChaseId);
  readonly pinnedChase = computed(() => {
    const id = this.pinnedChaseId();
    if (!id) {
      return null;
    }
    return this.getMonsterById(id) ?? null;
  });

  readonly evolutionSourceIndex = computed(() => {
    const index = new Map<string, Monster[]>();

    for (const source of this.monsters()) {
      for (const targetId of source.evolutionTargets) {
        const sources = index.get(targetId) ?? [];
        sources.push(source);
        index.set(targetId, sources);
      }
    }

    return index;
  });

  readonly evolutionCandidates = computed<EvolutionCandidate[]>(() => {
    const stageOrder = new Map(this.stages.map((stage, index) => [stage, index]));

    return this.monsters()
      .filter((target) => !target.unlocked)
      .map((target) => {
        const source = this.evolutionSourceIndex().get(target.id)?.find((candidate) => candidate.unlocked) ?? null;
        const requirements = source ? this.getRequirementStatuses(source, target) : [];
        const missing = requirements.filter((requirement) => !requirement.met);
        const ready = source ? this.canEvolve(source, target) : false;
        const percent =
          requirements.length === 0 ? 0 : Math.round(((requirements.length - missing.length) / requirements.length) * 100);
        const stagePriority = this.stages.length - (stageOrder.get(target.stage) ?? this.stages.length);
        const score =
          (ready ? 10000 : 0) +
          (source ? 1000 : 0) +
          percent * 8 +
          stagePriority * 12 +
          rarityWeight(target.rarity);

        return { target, source, requirements, missing, ready, percent, score };
      })
      .filter((candidate) => candidate.source !== null)
      .sort((left, right) => right.score - left.score);
  });

  readonly readyEvolutionCandidate = computed(() => this.evolutionCandidates().find((candidate) => candidate.ready) ?? null);
  readonly nextEvolutionCandidate = computed(() => this.evolutionCandidates()[0] ?? null);
  readonly readyEvolutionCount = computed(() => this.evolutionCandidates().filter((candidate) => candidate.ready).length);
  readonly routeStatusChip = computed<RouteStatusChip>(() => {
    const ready = this.readyEvolutionCount();
    const next = this.pinnedChase()
      ? this.evolutionCandidates().find((candidate) => candidate.target.id === this.pinnedChaseId()) ?? this.nextEvolutionCandidate()
      : this.nextEvolutionCandidate();

    if (ready > 0 && next?.source) {
      return {
        status: `${ready} READY`,
        detail: `${next.target.name} can go online from ${next.source.name}.`,
        metric: `${next.target.stage} route`,
        tone: 'ready',
      };
    }

    if (next?.source) {
      return {
        status: 'TRACKING',
        detail: `${next.target.name} is the next unlock pressure point.`,
        metric: `${next.percent}% sync`,
        tone: 'train',
      };
    }

    return {
      status: 'CLEAR',
      detail: 'Current reachable routes are already online.',
      metric: `${this.unlockedCount()}/${this.monsters().length}`,
      tone: 'clear',
    };
  });
  readonly squadTrainingDrill = computed<SquadTrainingDrill>(() => getSquadTrainingDrill(this.squad()));
  readonly recentBattles = computed(() => this.player().recentBattles.slice(0, MAX_RECENT_BATTLES));
  readonly battleIntelSummary = computed<BattleIntelSummary>(() => summarizeBattleRecords(this.recentBattles()));
  readonly battleContractCards = computed<BattleContractCard[]>(() => {
    const reward = this.arenaRewardForecast();
    const readyEvolution = this.readyEvolutionCandidate();
    const nextEvolution = readyEvolution ?? this.nextEvolutionCandidate();
    const route = this.buildRouteEtaInput(nextEvolution, reward);

    return buildBattleContracts({
      squadSize: this.squad().length,
      winChancePercent: this.battleOutlook().winChancePercent,
      nextWinCoins: reward.win.coins,
      nextWinDna: reward.win.dnaShards,
      nextWinXp: reward.win.xp,
      itemChancePercent: reward.itemChancePercent,
      winStreak: this.winStreak(),
      overdriveReady: this.overdriveReady(),
      dailyObjectiveId: this.dailyDirective().objectiveId,
      dailyLabel: this.dailyObjective().label,
      dailyProgress: this.dailyDirective().progress,
      dailyGoal: this.dailyObjective().goal,
      dailyComplete: this.dailyComplete(),
      routeTargetName: route.targetName,
      routeReady: route.ready,
      routePercent: route.percent,
      routeWinsNeeded: estimateRouteWins(route),
      claimableChapterTitle: this.campaign.claimableChapter()?.title ?? null,
      safeItemName: this.firstOwnedConsumable(['Aegis Plating', 'Repair Cell']),
      pushItemName: this.firstOwnedConsumable(['Focus Capsule']),
    });
  });
  readonly squadOrderCards = computed<SquadOrderCard[]>(() => {
    const patch = this.buildSquadPatchInput();
    const drill = this.squadTrainingDrill();
    const gear = this.gear.squadLoadoutPlan();

    return buildSquadOrders({
      squadSize: this.squad().length,
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      winChancePercent: this.battleOutlook().winChancePercent,
      candidateName: patch.candidateName,
      weakestName: patch.weakestName,
      powerGain: patch.powerGain,
      trainingLabel: drill.label,
      trainingXp: drill.xpGain,
      trainingCost: drill.costCoins,
      canTrain: this.squad().length > 0 && this.canAffordCoins(drill.costCoins),
      gearReady: gear.assignedSlots > gear.currentEquippedSlots || gear.powerGain > 0,
      gearPowerGain: gear.powerGain,
      readyEvolutionName: this.readyEvolutionCandidate()?.target.name ?? null,
      typePressureLabel: this.squadTypePressure().label,
      synergyCount: this.squadSynergies().length,
    });
  });
  readonly afterActionCards = computed<AfterActionCard[]>(() => {
    const reward = this.lastReward();
    const expedition = this.expedition();
    const forge = this.gear.forgeQuickRecommendation();

    return buildAfterActionQueue({
      hasBattleResult: reward !== null,
      won: reward?.won ?? false,
      coins: reward?.coins ?? 0,
      dnaShards: reward?.dnaShards ?? 0,
      xp: reward?.xp ?? 0,
      itemName: reward?.item ?? null,
      readyEvolutionName: this.readyEvolutionCandidate()?.target.name ?? null,
      claimableChapterTitle: this.campaign.claimableChapter()?.title ?? null,
      squadSize: this.squad().length,
      winChancePercent: this.battleOutlook().winChancePercent,
      forgeReady: forge.kind !== 'blocked' && forge.kind !== 'open',
      forgeTitle: forge.title,
      expeditionStatus: !expedition ? 'idle' : expedition.status === 'active' ? 'active' : 'reward',
      expeditionCores: expedition?.rewardCores ?? this.expeditionCores(),
      dailyComplete: this.dailyComplete(),
    });
  });
  readonly nextWinStreakMilestone = computed(() => WIN_STREAK_MILESTONES.find((milestone) => milestone > this.bestWinStreak()) ?? null);
  readonly commandCenterCards = computed<CommandCenterCard[]>(() => {
    const daily = this.dailyObjective();
    const directive = this.dailyDirective();
    const readyEvolution = this.readyEvolutionCandidate();
    const nextEvolution = this.nextEvolutionCandidate();
    const claimableChapter = this.campaign.claimableChapter();
    const nextChapter = this.campaign.nextCampaignEntry();
    const expedition = this.expedition();
    const forge = this.gear.forgeQuickRecommendation();

    return buildCommandCenterCards({
      squadSize: this.squad().length,
      dailyLabel: daily.label,
      dailyDetail: daily.detail,
      dailyProgress: directive.progress,
      dailyGoal: daily.goal,
      dailyComplete: this.dailyComplete(),
      readyEvolutionName: readyEvolution?.target.name ?? null,
      nextEvolutionName: nextEvolution?.target.name ?? null,
      nextEvolutionPercent: nextEvolution?.percent ?? 100,
      claimableChapterTitle: claimableChapter?.title ?? null,
      nextChapterTitle: nextChapter?.chapter.title ?? null,
      nextChapterProgress: nextChapter?.current ?? 0,
      nextChapterGoal: nextChapter?.goal ?? 0,
      nextChapterPercent: nextChapter?.percent ?? 100,
      expeditionStatus: !expedition ? 'idle' : expedition.status === 'active' ? 'active' : 'reward',
      expeditionDepth: expedition?.depth ?? 0,
      expeditionMaxDepth: 7,
      expeditionHp: expedition?.hp ?? 0,
      expeditionMaxHp: expedition?.maxHp ?? 0,
      expeditionCores: expedition?.rewardCores ?? this.expeditionCores(),
      forgeTitle: forge.title,
      forgeDetail: forge.detail,
      forgeMetric: forge.metric,
      forgeReady: forge.kind !== 'blocked' && forge.kind !== 'open',
    });
  });
  readonly medalFocusCards = computed<CommandCenterCard[]>(() =>
    buildMedalFocusCards({
      dailyLabel: this.dailyObjective().label,
      dailyProgress: this.dailyDirective().progress,
      dailyGoal: this.dailyObjective().goal,
      dailyComplete: this.dailyComplete(),
      bestStreak: this.bestWinStreak(),
      nextStreakMilestone: this.nextWinStreakMilestone(),
      bossesDefeated: this.player().defeatedBosses.length,
      totalBosses: this.campaign.bosses.length,
      unlockedMonsters: this.unlockedCount(),
      totalMonsters: this.monsters().length,
    }),
  );
  readonly bossPrepCards = computed<CommandCenterCard[]>(() =>
    buildBossPrepCards({
      bossName: this.activeBoss()?.name ?? null,
      bossTelegraph: this.activeBoss()?.mechanic.telegraph ?? null,
      bossCounter: this.activeBoss()?.mechanic.counter ?? null,
      bossRewardCoins: this.activeBoss()?.reward.coins ?? 0,
      bossRewardDna: this.activeBoss()?.reward.dnaShards ?? 0,
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      battleTrend: this.battleIntelSummary().trend,
      overdriveReady: this.overdriveReady(),
    }),
  );
  readonly systemCheckCards = computed<CommandCenterCard[]>(() =>
    buildSystemCheckCards({
      saveStatus: this.saveStatusLabel(),
      lastSavedLabel: this.lastSavedLabel(),
      exportReady: this.saveSyncState() !== 'unsupported',
      colorblindMode: this.settings().colorblindMode,
      combatBeats: this.settings().combatBeats,
      effectIntensity: this.settings().effectIntensity,
      audioEnabled: this.player().audioEnabled,
    }),
  );

  readonly nextCommand = computed<NextCommand>(() => {
    const squadSize = this.squad().length;
    const pinned = this.pinnedChase();
    const pinnedCandidate = pinned
      ? this.evolutionCandidates().find((candidate) => candidate.target.id === pinned.id) ?? null
      : null;
    const readyEvolution = pinnedCandidate?.ready ? pinnedCandidate : this.readyEvolutionCandidate();

    if (squadSize === 0) {
      return {
        tab: 'Squad',
        status: 'SQUAD OFFLINE',
        title: 'Load your first squad signal',
        detail: 'Add an unlocked creature so Arena runs can generate XP, coins, DNA, and item drops.',
        actionLabel: 'Open Squad',
        tone: 'blocked',
      };
    }

    if (readyEvolution) {
      return {
        tab: 'Evolution Tree',
        status: pinnedCandidate?.ready ? 'CHASE READY' : 'EVOLVE READY',
        title: `${readyEvolution.target.name} can go online`,
        detail: `${readyEvolution.source?.name ?? 'Source'} meets every requirement. Evolve now to raise roster power.`,
        actionLabel: 'Open Evolution',
        tone: 'ready',
      };
    }

    if (squadSize < 3) {
      return {
        tab: 'Squad',
        status: 'OPEN SLOT',
        title: `${3 - squadSize} squad slot${squadSize === 2 ? '' : 's'} still empty`,
        detail: 'A fuller squad improves battle odds and makes reward runs more reliable.',
        actionLabel: 'Fill Squad',
        tone: 'squad',
      };
    }

    if (this.battleOutlook().tone === 'low') {
      return {
        tab: 'Arena',
        status: 'LOW OUTLOOK',
        title: 'Stabilize before the next run',
        detail: 'Use Training or Guard stance, equip a defensive consumable, or rebuild the weakest slot.',
        actionLabel: 'Tune Arena',
        tone: 'battle',
      };
    }

    if (this.overdriveReady() && !this.overdriveArmed()) {
      return {
        tab: 'Arena',
        status: 'OVERDRIVE READY',
        title: 'Arm the Overdrive core',
        detail: 'Spend the full meter on a high-value run, boss surge, or gauntlet push.',
        actionLabel: 'Open Arena',
        tone: 'battle',
      };
    }

    if (!this.dailyComplete()) {
      const daily = this.dailyObjective();
      return {
        tab: 'Arena',
        status: 'DAILY LIVE',
        title: daily.label,
        detail: `${daily.detail} Progress ${this.dailyDirective().progress}/${daily.goal}.`,
        actionLabel: 'Run Battle',
        tone: 'meta',
      };
    }

    const availableResearch = this.research.recommendedResearch();
    if (availableResearch) {
      return {
        tab: 'Research',
        status: 'RESEARCH READY',
        title: `Unlock ${availableResearch.def.name}`,
        detail: `${availableResearch.def.detail} Costs ${availableResearch.def.cost} Bio-Data you already have.`,
        actionLabel: 'Open Research',
        tone: 'meta',
      };
    }

    const nextChase = pinnedCandidate ?? this.nextEvolutionCandidate();
    if (nextChase) {
      return {
        tab: 'Collection',
        status: 'NEXT CHASE',
        title: `${nextChase.target.name} at ${nextChase.percent}% sync`,
        detail:
          nextChase.missing.length > 0
            ? `Missing ${nextChase.missing[0].label}. Pin the target or farm the requirement.`
            : 'Trace the source line and keep building toward the next unlock.',
        actionLabel: 'Open Archive',
        tone: 'collection',
      };
    }

    return {
      tab: 'Arena',
      status: 'RUN READY',
      title: 'Queue another arena battle',
      detail: 'The squad is online. Battle for XP, streak bonuses, medals, and item drops.',
      actionLabel: 'Open Arena',
      tone: 'battle',
    };
  });

  constructor() {
    this.watchCalendarDay();
    const savedState = this.saveState.loadState();

    if (savedState) {
      this.applySnapshot(savedState);
      return;
    }

    const issue = this.saveState.loadIssue();
    if (issue) {
      this.toast.push({
        title: 'Save Backed Up',
        message:
          issue === 'newer-version'
            ? 'Your save is from a newer version. It was kept as a backup and a fresh run started.'
            : 'Your save could not be read. It was kept as a backup and a fresh run started.',
        tone: 'warn',
        icon: '!',
        durationMs: 6000,
      });
    }

    this.audio.setEnabled(this.player().audioEnabled);
    this.audio.setMasterVolume(this.player().settings.masterVolume);
    this.audio.setMusicEnabled(this.player().settings.musicEnabled);
    this.battleAnimation.setSpeed(this.player().settings.battleSpeed);
    this.ensureDailyDirectiveState();
  }

  requestTab(tab: GameSectionName): void {
    this.requestedTab.set(tab);
  }

  clearRequestedTab(): void {
    this.requestedTab.set(null);
  }

  /** Rollt eine frische Tages-Directive, falls keine existiert oder der Tag wechselte. */
  /** Roll the Daily Directive over at local midnight, even if the tab stays open. */
  private watchCalendarDay(): void {
    if (typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const key = getDateKey();
      if (key !== this.todayKey()) {
        this.todayKey.set(key);
        this.ensureDailyDirectiveState();
      }
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    };
    // Timers are throttled in background tabs, so re-check whenever the player returns.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
    schedule();
  }

  private ensureDailyDirectiveState(): void {
    const current = this.player().dailyDirective;
    const ensured = ensureDailyDirective(current, this.todayKey());
    if (ensured !== current) {
      this.player.update((player) => ({ ...player, dailyDirective: ensured }));
    }
  }



  get enemies(): EnemyMonster[] {
    return this.activeEnemies();
  }

  getMonsterPower(monster: Monster): number {
    return getMonsterPower(monster);
  }

  stageClass(stage: MonsterStage): string {
    return stageClass(stage);
  }

  getMonsterById(id: string): Monster | undefined {
    return this.store.getMonsterById(id);
  }







  getMonsterTrainingDrills(monster: Monster): MonsterTrainingDrill[] {
    return getMonsterTrainingDrills(monster.stage);
  }

  canAffordCoins(costCoins: number): boolean {
    return this.player().coins >= costCoins;
  }

  runMonsterTraining(monsterId: string, drillId: MonsterTrainingDrillId): boolean {
    const monster = this.getMonsterById(monsterId);
    if (!monster?.unlocked) {
      this.prependLog('Unlock the signal before running lab drills.', 'system');
      return false;
    }

    const drill = this.getMonsterTrainingDrills(monster).find((entry) => entry.id === drillId);
    if (!drill) {
      return false;
    }

    if (!this.canAffordCoins(drill.costCoins)) {
      this.toast.push({
        title: 'Insufficient Coins',
        message: `${drill.label} costs ${drill.costCoins} CR.`,
        tone: 'warn',
        icon: '!',
        durationMs: 3000,
      });
      return false;
    }

    const xpResult = applyXpToMonster(this.monsters(), monster.id, drill.xpGain);
    this.monsters.set(xpResult.updatedMonsters);
    this.player.update((player) => ({ ...player, coins: player.coins - drill.costCoins }));
    this.prependLog(`${drill.label}: ${monster.name} gained +${drill.xpGain} XP for -${drill.costCoins} Coins.`, 'info');
    this.toast.push({
      title: drill.label,
      message: `${monster.name} gained +${drill.xpGain} XP.`,
      tone: 'info',
      icon: 'TR',
      durationMs: 3200,
    });

    const levelUpLogs = xpResult.logs.filter((entry) => entry.text.toLowerCase().includes('level'));
    if (levelUpLogs.length > 0) {
      this.audio.play('level-up');
      this.battleLogs.update((logs) => [...xpResult.logs, ...logs].slice(0, 36));
      this.toast.push({
        title: levelUpLogs.length === 1 ? 'Level Up' : `${levelUpLogs.length} Level Ups`,
        message: levelUpLogs.map((entry) => entry.text).join(' '),
        tone: 'success',
        icon: 'UP',
        durationMs: 3600,
      });
    }

    return true;
  }

  runSquadTrainingDrill(): boolean {
    const squad = this.squad();
    if (squad.length === 0) {
      this.toast.push({
        title: 'Squad Required',
        message: 'Load at least one monster before running a calibration sim.',
        tone: 'warn',
        icon: '!',
        durationMs: 3200,
      });
      return false;
    }

    const drill = this.squadTrainingDrill();
    if (!this.canAffordCoins(drill.costCoins)) {
      this.toast.push({
        title: 'Insufficient Coins',
        message: `${drill.label} costs ${drill.costCoins} CR.`,
        tone: 'warn',
        icon: '!',
        durationMs: 3000,
      });
      return false;
    }

    const xpResult = applyXpToSquad(this.monsters(), this.player().squadIds, drill.xpGain);
    this.monsters.set(xpResult.updatedMonsters);
    this.player.update((player) => ({ ...player, coins: player.coins - drill.costCoins }));
    this.prependLog(`${drill.label}: squad gained +${drill.xpGain} XP each for -${drill.costCoins} Coins.`, 'info');
    this.toast.push({
      title: drill.label,
      message: `Squad calibration complete. +${drill.xpGain} XP to each online signal.`,
      tone: 'info',
      icon: 'SQ',
      durationMs: 3400,
    });

    const levelUpLogs = xpResult.logs.filter((entry) => entry.text.toLowerCase().includes('level'));
    if (levelUpLogs.length > 0) {
      this.audio.play('level-up');
      this.battleLogs.update((logs) => [...xpResult.logs, ...logs].slice(0, 36));
      this.toast.push({
        title: levelUpLogs.length === 1 ? 'Level Up' : `${levelUpLogs.length} Level Ups`,
        message: levelUpLogs.map((entry) => entry.text).join(' '),
        tone: 'success',
        icon: 'UP',
        durationMs: 3600,
      });
    }

    return true;
  }

  setBattleCategory(id: BattleCategoryId): void {
    this.battleCategoryId.set(id);
  }

  monsterMastery(monsterId: string) {
    return this.player().monsterMastery[monsterId] ?? emptyMonsterMastery();
  }

  masteryGoal(monster: Monster) {
    return masteryGoalFor(monster);
  }

  chooseTacticalPulse(choice: TacticalPulseChoice): boolean {
    if (!this.tacticalPulseOpen()) return false;
    this.lastTacticalPulse.set(choice);
    this.audio.play('menu');
    this.resolveBattleDecision({ kind: 'pulse', id: choice });
    return true;
  }

  chooseBattleOrder(choice: BattleOrderId, targetId?: string): boolean {
    if (!this.battleOrderOpen()) return false;
    this.audio.play('menu');
    this.resolveBattleDecision({ kind: 'order', id: choice, targetId });
    return true;
  }

  private waitForBattleDecision(session: BattleSessionState): Promise<BattleDecision> {
    this.clearTacticalPulseTimer();
    const recommended = recommendedDecision(session);
    const mode = this.settings().battleControlMode;
    if (mode === 'auto') return Promise.resolve(recommended);
    const duration = session.pendingDecision === 'pulse' ? 6 : mode === 'assist' ? 3 : 8;
    this.tacticalPulseOpen.set(session.pendingDecision === 'pulse');
    this.battleDecisionSeconds.set(duration);
    this.tacticalPulseSeconds.set(session.pendingDecision === 'pulse' ? duration : 0);
    this.tacticalPulseDeadline = Date.now() + duration * 1000;
    if (session.pendingDecision === 'pulse') this.battleAnimation.beginTacticalPulse();
    this.tacticalPulseTimer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((this.tacticalPulseDeadline - Date.now()) / 1000));
      this.battleDecisionSeconds.set(seconds);
      if (session.pendingDecision === 'pulse') this.tacticalPulseSeconds.set(seconds);
      if (seconds === 0) this.resolveBattleDecision(recommended);
    }, 120);
    return new Promise((resolve) => { this.battleDecisionResolve = resolve; });
  }

  private resolveBattleDecision(decision: BattleDecision): void {
    this.clearTacticalPulseTimer();
    this.tacticalPulseOpen.set(false);
    this.tacticalPulseSeconds.set(0);
    this.battleDecisionSeconds.set(0);
    const resolve = this.battleDecisionResolve;
    this.battleDecisionResolve = null;
    resolve?.(decision);
  }

  private clearTacticalPulseTimer(): void {
    if (this.tacticalPulseTimer !== null) {
      clearInterval(this.tacticalPulseTimer);
      this.tacticalPulseTimer = null;
    }
  }

  setBattleStance(id: BattleStanceId): void {
    this.battleStanceId.set(id);
  }

  setBattleMode(mode: 'standard' | 'gauntlet'): void {
    if (this.battleAnimation.isPlaying() || this.battleMode() === mode) {
      return;
    }
    this.battleMode.set(mode);
    this.gauntletWave.set(0);
    this.prependLog(
      mode === 'gauntlet'
        ? 'Endless Gauntlet engaged - waves scale until your first loss.'
        : 'Standard arena restored.',
      'system',
    );
  }

  applyBattlePrep(stanceId: BattleStanceId, categoryId: BattleCategoryId, itemName: string | null = null): boolean {
    if (this.battleAnimation.isPlaying() || this.squad().length === 0) {
      return false;
    }

    this.setBattleStance(stanceId);
    this.setBattleCategory(categoryId);

    if (itemName && !this.equippedConsumables().includes(itemName) && this.equippedConsumables().length < MAX_LOADOUT) {
      this.toggleConsumable(itemName);
    }

    this.prependLog(`Battle prep loaded: ${stanceId.toUpperCase()} stance / ${categoryId.toUpperCase()} risk.`, 'system');
    return true;
  }

  applyBattlePrepAndLaunch(stanceId: BattleStanceId, categoryId: BattleCategoryId, itemName: string | null = null): boolean {
    const applied = this.applyBattlePrep(stanceId, categoryId, itemName);
    if (!applied) {
      return false;
    }
    this.startBattle();
    return true;
  }

  applyBattleContract(contractId: string, launch = false): boolean {
    const contract = this.battleContractCards().find((card) => card.id === contractId);
    if (!contract || contract.disabled) {
      if (contractId === 'load-squad') {
        this.requestedTab.set('Squad');
      }
      return false;
    }

    const applied = launch
      ? this.applyBattlePrepAndLaunch(contract.stanceId, contract.categoryId, contract.itemName)
      : this.applyBattlePrep(contract.stanceId, contract.categoryId, contract.itemName);

    if (applied && !launch) {
      this.prependLog(`Contract loaded: ${contract.title}.`, 'info');
    }

    return applied;
  }

  runSquadOrder(actionId: SquadOrderActionId): boolean {
    switch (actionId) {
      case 'auto-squad':
        this.squadOps.autoBuildBestSquad();
        return true;
      case 'swap-reserve': {
        const patch = this.buildSquadPatchInput();
        const candidate = patch.candidateName
          ? this.monsters().find((monster) => monster.name === patch.candidateName && monster.unlocked)
          : null;
        const weakest = patch.weakestName ? this.squad().find((monster) => monster.name === patch.weakestName) : null;
        if (!candidate || !weakest || patch.powerGain <= 0) {
          return false;
        }
        this.squadOps.replaceSquadMember(weakest.id, candidate.id);
        return true;
      }
      case 'train-squad':
        return this.runSquadTrainingDrill();
      case 'auto-equip':
        return this.gear.autoEquipBestGear();
      case 'evolve-ready':
        return this.runMetaAction('evolve-ready');
      case 'open-arena':
        this.requestTab('Arena');
        return true;
    }
  }

  /** Arms or disarms Overdrive for the next loaded run. */
  toggleOverdriveArmed(): void {
    if (!this.overdriveReady()) {
      return;
    }
    this.overdriveArmed.update((armed) => !armed);
  }

  /** Adds or removes a consumable from the two-slot battle loadout. */
  toggleConsumable(name: string): void {
    if (!isConsumable(name)) {
      return;
    }
    this.equippedConsumables.update((current) => {
      if (current.includes(name)) {
        return current.filter((entry) => entry !== name);
      }
      const owned = countInInventory(this.player().inventory, name);
      const alreadyEquipped = current.filter((entry) => entry === name).length;
      if (owned <= alreadyEquipped || current.length >= MAX_LOADOUT) {
        return current;
      }
      return [...current, name];
    });
  }

  /** Buys a combat consumable with coins. */
  buyConsumable(name: string): void {
    const def = getConsumableDef(name);
    if (!def) {
      return;
    }
    if (this.player().coins < def.cost) {
      this.toast.push({ title: 'Insufficient Coins', message: `${def.name} costs ${def.cost} CR.`, tone: 'warn', icon: '!', durationMs: 3000 });
      return;
    }
    this.player.update((player) => ({ ...player, coins: player.coins - def.cost, inventory: [...player.inventory, def.name] }));
    this.audio.play('item');
    this.toast.push({ title: 'Fabricated', message: `${def.name} added to inventory (-${def.cost} CR).`, tone: 'info', icon: def.icon, durationMs: 3200 });
  }






  resetProgress(): void {
    this.saveState.clearState();
    this.monsters.set(createStarterMonsters());
    this.player.set(createStarterPlayerState());
    this.lastReward.set(null);
    this.lastBattleThreat.set(null);
    this.battleLogs.set([{ text: 'Archive reset complete. Starter squad and resources restored.', type: 'system' as const }, ...createStarterBattleLogs()].slice(0, 36));
  }

  // --- Prismatic variants (shiny system) ---
  private readonly PRISMATIC_WIN_CHANCE = 0.04;

  private rollPrismaticVariant(): void {
    if (Math.random() > this.PRISMATIC_WIN_CHANCE) {
      return;
    }
    const eligible = this.squad().filter((monster) => monster.unlocked && !monster.prismatic);
    if (eligible.length === 0) {
      return;
    }
    const chosen = this.randomFrom(eligible);
    this.monsters.update((monsters) => monsters.map((monster) => (monster.id === chosen.id ? { ...monster, prismatic: true } : monster)));
    this.prependLog(`Prismatic surge! ${chosen.name} turned prismatic (+8% stats).`, 'reward');
    this.audio.play('evolve');
    this.toast.push({
      title: 'Prismatic Variant',
      message: `${chosen.name} is now prismatic — a rare shimmer and a permanent stat boost.`,
      tone: 'evolution',
      icon: '✦',
      durationMs: 5200,
    });
  }

  // --- Gear / Forge ---








  // --- Settings + accessibility ---









  // --- Campaign ---

  runMetaAction(actionId: MetaActionId): boolean {
    switch (actionId) {
      case 'auto-squad':
        this.requestTab('Squad');
        this.squadOps.autoBuildBestSquad();
        return true;
      case 'evolve-ready':
        this.requestTab('Evolution Tree');
        if (this.readyEvolutionCandidate()) {
          return this.evolveReadyCandidate();
        }
        return true;
      case 'run-battle':
        if (this.squad().length === 0) {
          this.squadOps.autoBuildBestSquad();
        }
        this.requestTab('Arena');
        if (this.squad().length === 0) {
          return false;
        }
        this.startBattle();
        return true;
      case 'claim-chapter':
        this.requestTab('Campaign');
        return this.campaign.claimReadyChapter() || true;
      case 'forge-quick':
        this.requestTab('Forge');
        if (this.gear.forgeQuickRecommendation().kind !== 'blocked') {
          return this.gear.runForgeQuickAction();
        }
        return true;
      case 'expedition': {
        const expedition = this.expedition();
        if (!expedition && this.squad().length === 0) {
          this.squadOps.autoBuildBestSquad();
        }
        this.requestTab(expedition || this.squad().length > 0 ? 'Expedition' : 'Squad');
        if (!expedition) {
          if (this.squad().length === 0) {
            return false;
          }
          this.startExpedition();
          return true;
        }
        if (expedition.status !== 'active') {
          this.claimExpedition();
        }
        return true;
      }
      case 'save-now':
        this.syncSaveState();
        return true;
    }
  }


  // --- Onboarding ---
  completeTutorial(): void {
    if (this.player().tutorialDone) {
      return;
    }
    this.player.update((player) => ({ ...player, tutorialDone: true }));
  }

  // --- Expedition (roguelite) ---
  readonly expedition = computed(() => this.player().expedition);
  readonly expeditionRelics = computed(() =>
    (this.player().expedition?.relicIds ?? []).map((id) => getRelicDef(id)).filter((def): def is NonNullable<typeof def> => Boolean(def)),
  );
  readonly expeditionCores = computed(() => this.player().expeditionCores);
  readonly relicDefs = RELIC_DEFS;

  // --- Bio-Data & Research Lab (Datenbeschaffung) ---


  /** Transient relic options the player may pick from a reward/shop node. */
  readonly relicChoices = signal<string[]>([]);

  startExpedition(): void {
    if (this.squad().length === 0) {
      this.toast.push({ title: 'Squad Required', message: 'Load a squad before launching an expedition.', tone: 'warn', icon: '!', durationMs: 3200 });
      return;
    }
    const state = generateExpedition((Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0);
    this.relicChoices.set([]);
    this.player.update((player) => ({ ...player, expedition: state }));
    this.prependLog('Expedition launched. Descend the grid node by node.', 'system');
    this.audio.play('menu');
  }

  abandonExpedition(): void {
    this.relicChoices.set([]);
    this.player.update((player) => ({ ...player, expedition: null }));
    this.prependLog('Expedition abandoned.', 'system');
  }

  /** Banks accrued Cores and clears the finished run. */
  claimExpedition(): void {
    const exp = this.player().expedition;
    if (!exp || exp.status === 'active') {
      return;
    }
    const relics = relicBonus(exp.relicIds);
    const payout = exp.status === 'won' ? exp.rewardCores + relics.coresOnClear : Math.floor(exp.rewardCores * 0.5);
    const dataPayout = Math.max(6, Math.round(payout * 1.5));
    this.player.update((player) => ({
      ...player,
      expedition: null,
      expeditionCores: player.expeditionCores + payout,
      bioData: player.bioData + dataPayout,
      totalBioData: player.totalBioData + dataPayout,
    }));
    this.prependLog(`Expedition ${exp.status === 'won' ? 'cleared' : 'ended'}: +${payout} Cores, +${dataPayout} Bio-Data banked.`, 'reward');
    this.audio.play(exp.status === 'won' ? 'win' : 'loss');
    this.toast.push({
      title: exp.status === 'won' ? 'Expedition Cleared' : 'Expedition Ended',
      message: `+${payout} Cores banked to your meta-progress.`,
      tone: exp.status === 'won' ? 'success' : 'warn',
      icon: 'CO',
      durationMs: 4200,
    });
  }

  pickExpeditionRelic(relicId: string): void {
    if (!this.relicChoices().includes(relicId)) {
      return;
    }
    const def = getRelicDef(relicId);
    this.player.update((player) => {
      if (!player.expedition) {
        return player;
      }
      return { ...player, expedition: { ...player.expedition, relicIds: [...player.expedition.relicIds, relicId] } };
    });
    this.relicChoices.set([]);
    if (def) {
      this.prependLog(`Relic acquired: ${def.name}.`, 'reward');
      this.audio.play('item');
    }
  }

  enterExpeditionNode(nodeId: string): void {
    const exp = this.player().expedition;
    if (!exp || exp.status !== 'active' || !exp.reachableIds.includes(nodeId) || this.relicChoices().length > 0) {
      return;
    }
    const node = getNode(exp, nodeId);
    if (!node) {
      return;
    }

    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      this.resolveExpeditionBattle(exp, node.id, node.type, node.row);
      return;
    }

    let next: ExpeditionState = clearNode(exp, nodeId);
    let message = '';
    if (node.type === 'rest') {
      const heal = Math.round(exp.maxHp * 0.32);
      next = { ...next, hp: Math.min(exp.maxHp, exp.hp + heal), lastEvent: `Rest node: recovered ${heal} run HP.` };
      message = `Rest node: +${heal} run HP.`;
    } else if (node.type === 'shop') {
      next = { ...next, lastEvent: 'Shop node: choose a relic.' };
      message = 'Shop node: pick a relic.';
      this.relicChoices.set(rollRelicChoices((exp.seed ^ nodeHash(nodeId)) >>> 0, exp.relicIds));
    } else {
      // event: random boon/bane
      const roll = Math.random();
      if (roll < 0.45) {
        this.relicChoices.set(rollRelicChoices((exp.seed ^ nodeHash(nodeId)) >>> 0, exp.relicIds));
        next = { ...next, lastEvent: 'Event: a cache of relics appears.' };
        message = 'Event: relic cache — pick one.';
      } else if (roll < 0.75) {
        next = { ...next, rewardCores: next.rewardCores + 4, lastEvent: 'Event: +4 Cores.' };
        message = 'Event: +4 Cores.';
      } else {
        const dmg = Math.round(exp.maxHp * 0.12);
        next = { ...next, hp: Math.max(0, exp.hp - dmg), lastEvent: `Event: hazard, -${dmg} run HP.` };
        message = `Event: hazard -${dmg} run HP.`;
        if (next.hp <= 0) {
          next = { ...next, status: 'lost' };
        }
      }
    }

    this.player.update((player) => ({ ...player, expedition: next }));
    if (message) {
      this.prependLog(`Expedition — ${message}`, 'info');
    }
  }

  private resolveExpeditionBattle(exp: ExpeditionState, nodeId: string, type: ExpeditionNodeType, depth: number): void {
    const relics = relicBonus(exp.relicIds);
    const eliteBump = type === 'elite' ? 0.12 : type === 'boss' ? 0.25 : 0;
    const growth = 1 + 0.12 * depth + eliteBump;
    const baseFormation = this.arenaFormations[depth % this.arenaFormations.length];
    const enemies = baseFormation.enemies.map((enemy) => ({
      ...enemy,
      name: `${enemy.name}`,
      hp: Math.round(enemy.hp * growth),
      attack: Math.round(enemy.attack * growth),
      defense: Math.round(enemy.defense * growth),
      speed: Math.round(enemy.speed * growth),
    }));

    const sim = simulateBattle({
      squad: this.gear.effectiveSquad(),
      enemies,
      playerModifier: this.squadBattleModifier() + relics.attackBonus,
      enemyModifier: calculateEnemyBattleModifier(0.04 + 0.04 * depth + eliteBump, 0),
      stanceAttackMod: 0,
      stanceMitigation: relics.mitigation,
      overdrive: false,
      overdriveAttackBonus: OVERDRIVE_ATTACK_BONUS,
      consumables: [],
      synergyLabel: this.squadSynergies()[0]?.label ?? null,
      randomBetween: (min, max) => this.randomBetween(min, max),
      randomFrom: <T>(items: T[]) => this.randomFrom(items),
    });

    if (sim.won) {
      const cleared = clearNode(exp, nodeId);
      const cores = type === 'boss' ? 15 : type === 'elite' ? 6 : 3;
      const heal = Math.round(relics.healOnWin * exp.maxHp);
      const rewardMult = relics.rewardMultiplier * (type === 'boss' ? 1.6 : type === 'elite' ? 1.25 : 1);
      const reward = buildReward(true, sim.criticalHit, rewardMult);
      const xpResult = applyXpToSquad(this.monsters(), this.player().squadIds, reward.xp);
      this.monsters.set(xpResult.updatedMonsters);

      const next: ExpeditionState = {
        ...cleared,
        hp: Math.min(exp.maxHp, exp.hp + heal),
        rewardCores: cleared.rewardCores + cores,
        lastEvent: `${type} cleared: +${reward.coins} CR, +${reward.dnaShards} DNA, +${cores} Cores.`,
      };
      this.player.update((player) => ({
        ...player,
        coins: player.coins + reward.coins,
        dnaShards: player.dnaShards + reward.dnaShards,
        expedition: next,
      }));
      if (type === 'elite' || type === 'boss') {
        this.relicChoices.set(rollRelicChoices((exp.seed ^ nodeHash(nodeId)) >>> 0, exp.relicIds));
      }
      this.prependLog(`Expedition — ${type} node cleared (+${cores} Cores).`, 'reward');
      this.audio.play(type === 'boss' ? 'boss' : 'win');
    } else {
      const cost = type === 'boss' ? 40 : type === 'elite' ? 28 : 18;
      const hp = Math.max(0, exp.hp - cost);
      const next: ExpeditionState = {
        ...exp,
        hp,
        status: hp <= 0 ? 'lost' : 'active',
        lastEvent: hp <= 0 ? 'Run ended — out of run HP.' : `Repelled: -${cost} run HP.`,
      };
      this.player.update((player) => ({ ...player, expedition: next }));
      this.prependLog(`Expedition — battle lost (-${cost} run HP).`, 'system');
      this.audio.play('loss');
    }
  }

  // --- Save export / import ---
  exportSave(): string {
    const snapshot: SaveStateSnapshot = {
      player: clonePlayerState(this.player()),
      monsters: this.monsters().map((monster) => serializeMonsterProgress(monster)),
      battleLogs: cloneBattleLogs(this.battleLogs()),
      lastReward: this.lastReward() ? { ...this.lastReward()! } : null,
      lastBattleThreat: this.lastBattleThreat() ? { ...this.lastBattleThreat()! } : null,
      saveVersion: SAVE_STATE_VERSION,
      savedAt: new Date().toISOString(),
    };
    return base64Encode(JSON.stringify(snapshot));
  }

  importSave(code: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(base64Decode(code.trim()));
    } catch {
      parsed = null;
    }
    // Imported codes travel the same validate -> migrate -> sanitize path as local saves,
    // so codes exported by any older version still restore.
    const { snapshot, issue } = this.saveState.parseSnapshot(parsed);
    if (!snapshot) {
      this.toast.push({
        title: 'Import Failed',
        message:
          issue === 'newer-version'
            ? 'That save code comes from a newer game version.'
            : 'That save code could not be read.',
        tone: 'warn',
        icon: '!',
        durationMs: 3600,
      });
      return false;
    }
    this.applySnapshot(snapshot);
    this.toast.push({ title: 'Save Imported', message: 'Progress restored from your code.', tone: 'success', icon: 'IN', durationMs: 3600 });
    return true;
  }

  /** Load a validated snapshot into live state and sync the audio/animation side services. */
  private applySnapshot(snapshot: SaveStateSnapshot): void {
    this.monsters.set(this.saveState.restoreMonsters(createStarterMonsters(), snapshot.monsters));
    this.player.set(sanitizePlayerState(snapshot.player));
    this.battleLogs.set(snapshot.battleLogs.length ? cloneBattleLogs(snapshot.battleLogs) : createStarterBattleLogs());
    this.lastReward.set(snapshot.lastReward ? { ...snapshot.lastReward } : null);
    this.lastBattleThreat.set(snapshot.lastBattleThreat ? { ...snapshot.lastBattleThreat } : null);
    this.audio.setEnabled(this.player().audioEnabled);
    this.audio.setMasterVolume(this.player().settings.masterVolume);
    this.audio.setMusicEnabled(this.player().settings.musicEnabled);
    this.battleAnimation.setSpeed(this.player().settings.battleSpeed);
    this.ensureDailyDirectiveState();
  }

  getEvolutionTargets(monster: Monster): Monster[] {
    return monster.evolutionTargets.map((targetId) => this.getMonsterById(targetId)).filter((target): target is Monster => Boolean(target));
  }

  getRequirementStatuses(source: Monster, target: Monster): RequirementStatus[] {
    return getRequirementStatuses(source, target, this.player());
  }

  canEvolve(source: Monster, target: Monster): boolean {
    return canEvolve(source, target, this.player());
  }

  evolve(sourceId: string, targetId: string): void {
    const source = this.getMonsterById(sourceId);
    const target = this.getMonsterById(targetId);
    if (!source || !target || !this.canEvolve(source, target)) {
      this.prependLog('Evolution requirements are not met yet.', 'system');
      return;
    }

    this.player.update((player) => {
      const evolved = applyEvolutionToPlayer(player, target);
      return {
        ...evolved,
        bioData: evolved.bioData + EVOLUTION_DATA_BONUS,
        totalBioData: evolved.totalBioData + EVOLUTION_DATA_BONUS,
      };
    });
    this.monsters.update((monsters) => unlockEvolutionTarget(monsters, source, target));
    this.prependLog(`${source.name} evolved into ${target.name}!`, 'reward');
    this.prependLog(`New form catalogued: +${EVOLUTION_DATA_BONUS} Bio-Data.`, 'reward');
    this.audio.play('evolve');
    this.toast.push({
      title: 'Evolution Complete',
      message: `${source.name} -> ${target.name} (${target.stage}).`,
      tone: 'evolution',
      icon: target.icon ?? '*',
      durationMs: 4500,
    });

    if (this.player().pinnedChaseId === target.id) {
      this.squadOps.unpinChaseTarget();
    }

    this.awardStageMilestoneIfComplete(target.stage);
  }

  evolveReadyCandidate(): boolean {
    const candidate = this.readyEvolutionCandidate();
    if (!candidate?.source) {
      return false;
    }

    this.evolve(candidate.source.id, candidate.target.id);
    return true;
  }

  private awardStageMilestoneIfComplete(stage: MonsterStage): void {
    const player = this.player();
    if (player.claimedStageMilestones.includes(stage)) {
      return;
    }

    const stageMonsters = this.monsters().filter((monster) => monster.stage === stage);
    if (stageMonsters.length === 0 || stageMonsters.some((monster) => !monster.unlocked)) {
      return;
    }

    this.player.update((current) => ({
      ...current,
      coins: current.coins + STAGE_MILESTONE_REWARD.coins,
      dnaShards: current.dnaShards + STAGE_MILESTONE_REWARD.dnaShards,
      claimedStageMilestones: [...current.claimedStageMilestones, stage],
    }));

    this.prependLog(
      `${stage} stage fully online: +${STAGE_MILESTONE_REWARD.coins} Coins, +${STAGE_MILESTONE_REWARD.dnaShards} DNA Shards.`,
      'reward',
    );
    this.toast.push({
      title: `${stage} Stage Cleared`,
      message: `+${STAGE_MILESTONE_REWARD.coins} Coins, +${STAGE_MILESTONE_REWARD.dnaShards} DNA Shards.`,
      tone: 'reward',
      icon: '*',
      durationMs: 4200,
    });
  }

  async startBattle(): Promise<void> {
    if (this.battleRunning || this.tacticalPulseOpen() || this.battleOrderOpen() || this.battleAnimation.isPlaying()) return;

    const squad = this.squad();
    if (squad.length === 0) {
      this.lastReward.set(null);
      this.lastBattleThreat.set(null);
      this.prependLog('Add at least one monster to your squad.', 'system');
      this.toast.push({
        title: 'Squad Required',
        message: 'Load at least one monster before queueing a battle.',
        tone: 'warn',
        icon: '!',
        durationMs: 3200,
      });
      return;
    }

    const formation = this.activeFormation();
    const threat = this.upcomingArenaThreat();
    const category = this.battleCategory();
    const stance = this.battleStance();
    const overdriveArmed = this.overdriveArmed() && this.overdriveReady();
    const equipped = [...this.equippedConsumables()];
    const isGauntlet = this.battleMode() === 'gauntlet';
    const gauntletStartWave = this.gauntletWave();
    this.battleRunning = true;
    this.lastReward.set(null);
    this.lastBattleMastery.set([]);
    this.lastTacticalPulse.set(null);
    let session = createBattleSession({
      squad: this.gear.effectiveSquad(),
      enemies: this.enemies,
      seed: Date.now(),
      playerAttackModifier: this.effectivePlayerModifier(),
      enemyAttackModifier: this.enemyBattleModifier(),
      playerMitigation: stance.mitigation + this.traitBonus().mitigation + this.mutatorModifier().playerMitigation,
      overdriveCharge: this.overdriveCharge(),
      overdriveArmed,
      consumables: toCombatEffects(this.equippedConsumables()),
    });
    this.battleSession.set(session);
    while (!session.completed) {
      session = advanceBattleSession(session);
      this.battleSession.set(session);
      if (session.completed) break;
      await this.battleAnimation.playSegment(session.lastBatch);
      if (session.pendingDecision) {
        const decision = await this.waitForBattleDecision(session);
        session = applyBattleDecision(session, decision);
        this.battleSession.set(session);
      }
    }
    const sim: TacticalBattleResult = battleResult(session);
    const pulseChoice: TacticalPulseChoice = sim.pulseChoice;
    this.lastTacticalPulse.set(pulseChoice);
    await this.battleAnimation.play({
      won: sim.won,
      criticalHit: sim.criticalHit,
      events: session.lastBatch,
    });
    const gauntletRewardBoost = isGauntlet ? 1 + 0.08 * gauntletStartWave : 1;
    const rewardMultiplier =
      formation.rewardModifier * threat.rewardModifier * category.rewardModifier * gauntletRewardBoost * (1 + this.traitBonus().rewardBonus);
    const baseReward = buildReward(sim.won, sim.criticalHit, rewardMultiplier);
    const currentPlayer = this.player();
    const masteryAwards = squad.map((monster) =>
      awardBattleMastery(monster, currentPlayer.monsterMastery[monster.id], sim.events, sim.won, pulseChoice),
    );
    const nextMonsterMastery = { ...currentPlayer.monsterMastery };
    for (const award of masteryAwards) {
      nextMonsterMastery[award.monsterId] = applyMasteryAward(nextMonsterMastery[award.monsterId], award);
    }
    const nextStreak = sim.won ? currentPlayer.winStreak + 1 : 0;
    const streakBonus = sim.won ? calculateStreakBonus(nextStreak, baseReward) : { coins: 0, xp: 0 };
    let reward = sim.won ? applyStreakBonus(baseReward, streakBonus, nextStreak) : { ...baseReward, streakAfter: 0 };

    const xpResult = applyXpToSquad(this.monsters(), this.player().squadIds, reward.xp);
    this.monsters.set(xpResult.updatedMonsters);

    const itemChance = Math.min(
      0.65,
      Math.max(0.05, 0.25 + formation.itemBonus + threat.itemBonus + category.itemBonus + this.research.researchModifiers().itemChanceBonus / 100),
    );
    const item = shouldAwardItem(sim.won, itemChance, Math.random()) ? this.randomDropItem() : undefined;

    if (item) {
      reward.item = item;
    }

    const nextBattlesWon = currentPlayer.battlesWon + (sim.won ? 1 : 0);
    const crossedMilestone = sim.won
      ? findCrossedMilestone(currentPlayer.battlesWon, nextBattlesWon, currentPlayer.claimedMilestones)
      : null;

    if (crossedMilestone !== null) {
      reward = { ...reward, milestoneLabel: milestoneLabel(crossedMilestone) };
    }

    if (!sim.won) {
      reward = {
        ...reward,
        lossHint: generateLossHint({
          squad,
          enemies: this.enemies,
          teamPower: this.teamPower(),
          enemyPower: this.enemyPower(),
          typePressureLabel: this.squadTypePressure().label,
          squadSize: squad.length,
        }),
      };
    }

    // Equipped consumables are spent from inventory.
    let inventoryAfter = currentPlayer.inventory;
    let itemsUsedCount = 0;
    for (const name of equipped) {
      if (countInInventory(inventoryAfter, name) > 0) {
        inventoryAfter = removeOneFromInventory(inventoryAfter, name);
        itemsUsedCount += 1;
      }
    }

    // Overdrive is consumed when armed; otherwise it charges after battle.
    const overdriveCharge = sim.overdriveUsed ? sim.overdriveCharge : chargeOverdrive(sim.overdriveCharge, sim.won);

    // Advance gauntlet wave state.
    let nextGauntletWave = gauntletStartWave;
    let gauntletBest = currentPlayer.combatStats.gauntletBestWave;
    if (isGauntlet) {
      if (sim.won) {
        nextGauntletWave = gauntletStartWave + 1;
        gauntletBest = Math.max(gauntletBest, nextGauntletWave);
      } else {
        nextGauntletWave = 0;
      }
    }

    const combatStats: CombatStats = {
      criticalWins: currentPlayer.combatStats.criticalWins + (sim.won && sim.criticalHit ? 1 : 0),
      overdrivesUsed: currentPlayer.combatStats.overdrivesUsed + (overdriveArmed ? 1 : 0),
      itemsUsed: currentPlayer.combatStats.itemsUsed + itemsUsedCount,
      flawlessWins: currentPlayer.combatStats.flawlessWins + (sim.flawless ? 1 : 0),
      gauntletBestWave: gauntletBest,
    };

    // Advance the daily directive and auto-claim on completion.
    let daily = ensureDailyDirective(currentPlayer.dailyDirective, this.todayKey());
    daily = progressDaily(daily, {
      won: sim.won,
      criticalHit: sim.criticalHit,
      flawless: sim.flawless,
      overdriveUsed: overdriveArmed,
      category: this.battleCategoryId(),
      streakAfter: nextStreak,
    });
    let dailyBonusCoins = 0;
    let dailyBonusDna = 0;
    let dailyClaimedNow = false;
    if (isDailyComplete(daily) && !daily.claimed) {
      const objective = getDailyObjectiveDef(daily.objectiveId);
      dailyBonusCoins = objective.reward.coins;
      dailyBonusDna = objective.reward.dnaShards;
      daily = { ...daily, claimed: true };
      dailyClaimedNow = true;
    }

    // Boss encounter: named boss on every fifth (Boss Surge) battle.
    const isBoss = threat.id === 'boss';
    const activeBoss = isBoss ? getBossForBattle(currentPlayer.battlesFought + 1) : null;
    const bossNewlyDefeated = activeBoss && sim.won && !currentPlayer.defeatedBosses.includes(activeBoss.id) ? activeBoss : null;

    // Fast-clear (flawless) boss kills pay a bonus.
    let bossBonusCoins = 0;
    let bossBonusDna = 0;
    if (activeBoss && sim.won) {
      const multiplier = sim.flawless ? activeBoss.fastClearBonus : 1;
      bossBonusCoins = Math.round(activeBoss.reward.coins * multiplier);
      bossBonusDna = Math.round(activeBoss.reward.dnaShards * multiplier);
    }

    // Bestiary: record every enemy seen this run.
    const enemyIds = this.enemies.map((enemy) => enemy.id ?? enemy.name);
    const encounteredAfter = Array.from(new Set([...currentPlayer.encounteredEnemies, ...enemyIds]));

    // --- Datenbeschaffung: Bio-Data accrual + creature scan progress ---
    const research = this.research.researchModifiers();
    const knownEnemies = new Set(currentPlayer.encounteredEnemies);
    const newEnemyCount = enemyIds.filter((id) => !knownEnemies.has(id)).length;
    // Research yield is folded into the reward itself so logs, toasts, records and the
    // reward reveal all show exactly what lands in the wallet.
    reward = applyResearchYield(reward, research);
    const coinFromBattle = reward.coins;
    const dnaFromBattle = reward.dnaShards;
    let bioDataGain = dataFromBattle({
      won: sim.won,
      threatMultiplier: threat.rewardModifier,
      newEnemyCount,
      squadSize: currentPlayer.squadIds.length,
      modifiers: research,
    });
    const squadScanIds = new Set(currentPlayer.squadIds);
    const reserveScanIds = research.autoScanReserves
      ? pickReserveScanTargets(
          this.monsters()
            .filter((monster) => monster.unlocked && !squadScanIds.has(monster.id))
            .map((monster) => monster.id),
          currentPlayer.scanProgress,
        )
      : [];
    const scanStep = scanGain(sim.won, research);
    const reserveStep = reserveScanGain(sim.won, research);
    const nextScanProgress = { ...currentPlayer.scanProgress };
    const newlyScanned: string[] = [];
    for (const id of [...squadScanIds, ...reserveScanIds]) {
      const before = nextScanProgress[id] ?? 0;
      if (before >= 100) continue;
      const after = Math.min(100, before + (squadScanIds.has(id) ? scanStep : reserveStep));
      nextScanProgress[id] = after;
      if (after >= 100) {
        newlyScanned.push(id);
        bioDataGain += FULL_SCAN_BONUS;
      }
    }

    const battleRecord: RecentBattleRecord = {
      id: `battle-${Date.now()}`,
      timestamp: new Date().toISOString(),
      won: sim.won,
      mode: this.battleMode(),
      category: this.battleCategoryId(),
      formationName: formation.name,
      threatLabel: threat.label,
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      coins: reward.coins,
      dnaShards: reward.dnaShards,
      xp: reward.xp,
      streakAfter: reward.streakAfter ?? nextStreak,
      orders: sim.orderHistory,
      pulse: sim.pulseChoice,
      survivors: sim.survivors,
      rounds: sim.rounds,
      controlMode: this.settings().battleControlMode,
    };

    this.player.update((player) => ({
      ...player,
      coins: player.coins + coinFromBattle + dailyBonusCoins + bossBonusCoins,
      dnaShards: player.dnaShards + dnaFromBattle + dailyBonusDna + bossBonusDna,
      bioData: player.bioData + bioDataGain,
      totalBioData: player.totalBioData + bioDataGain,
      scanProgress: nextScanProgress,
      battlesFought: player.battlesFought + 1,
      battlesWon: nextBattlesWon,
      inventory: item ? [...inventoryAfter, item] : inventoryAfter,
      winStreak: nextStreak,
      bestWinStreak: Math.max(player.bestWinStreak, nextStreak),
      claimedMilestones:
        crossedMilestone !== null ? [...player.claimedMilestones, crossedMilestone] : player.claimedMilestones,
      overdriveCharge,
      combatStats,
      monsterMastery: nextMonsterMastery,
      dailyDirective: daily,
      recentBattles: [battleRecord, ...player.recentBattles].slice(0, MAX_RECENT_BATTLES),
      defeatedBosses: bossNewlyDefeated ? [...player.defeatedBosses, bossNewlyDefeated.id] : player.defeatedBosses,
      encounteredEnemies: encounteredAfter,
    }));

    // Prismatic (shiny) variant chance on a win: upgrade a random eligible squad member.
    if (sim.won) {
      this.rollPrismaticVariant();
    }

    if (bossNewlyDefeated) {
      this.prependLog(`Boss defeated: ${bossNewlyDefeated.name} added to the Boss Codex.`, 'reward');
      this.audio.play('boss');
      this.toast.push({
        title: 'Boss Down',
        message: `${bossNewlyDefeated.name} — Codex updated. +${bossBonusCoins} CR, +${bossBonusDna} DNA.`,
        tone: 'reward',
        icon: bossNewlyDefeated.icon,
        durationMs: 4600,
      });
    }

    if (newlyScanned.length > 0) {
      const names = newlyScanned
        .map((id) => this.getMonsterById(id)?.name ?? id)
        .slice(0, 3)
        .join(', ');
      this.prependLog(`Full data profile secured: ${names}. +${newlyScanned.length * FULL_SCAN_BONUS} Bio-Data.`, 'reward');
      this.toast.push({
        title: 'Scan Complete',
        message: `${names} fully catalogued. +${newlyScanned.length * FULL_SCAN_BONUS} Bio-Data.`,
        tone: 'reward',
        icon: 'SC',
        durationMs: 4200,
      });
    }

    this.overdriveArmed.set(false);
    this.equippedConsumables.set([]);
    this.comboCharge.set(0);
    this.gauntletWave.set(nextGauntletWave);

    const logs = buildBattleLogsFromEvents({
      events: sim.events,
      reward,
      formation,
      threat,
      marginScore: sim.marginScore,
      criticalHit: sim.criticalHit,
      won: sim.won,
    });
    const milestoneLog =
      crossedMilestone !== null
        ? [{ text: milestoneLabel(crossedMilestone), type: 'reward' as const }]
        : [];
    const streakLog =
      sim.won && (reward.streakBonusCoins ?? 0) + (reward.streakBonusXp ?? 0) > 0
        ? [
            {
              text: `Win streak x${nextStreak}: +${reward.streakBonusCoins ?? 0} Coins, +${reward.streakBonusXp ?? 0} XP bonus.`,
              type: 'reward' as const,
            },
          ]
        : [];
    const lossHintLog = reward.lossHint ? [{ text: reward.lossHint, type: 'system' as const }] : [];
    const overdriveLog = overdriveArmed ? [{ text: 'Overdrive discharged - meter reset.', type: 'system' as const }] : [];
    const dailyLog = dailyClaimedNow
      ? [{ text: `Daily Directive cleared: +${dailyBonusCoins} Coins, +${dailyBonusDna} DNA.`, type: 'reward' as const }]
      : [];
    const gauntletLog = isGauntlet
      ? [{ text: sim.won ? `Gauntlet wave ${nextGauntletWave} reached.` : `Gauntlet ended at wave ${gauntletStartWave + 1}.`, type: 'system' as const }]
      : [];
    const masteryLogs = masteryAwards.map((award) => ({
      text: `${award.monsterName} gained ${award.points} ${award.type} Mastery${award.goalCompleted ? ` and completed ${award.goal.label}` : ''}.`,
      type: 'reward' as const,
    }));
    const dataLog = [
      {
        text:
          newEnemyCount > 0
            ? `Bio-Data gathered: +${bioDataGain} (incl. ${newEnemyCount} first-contact scan${newEnemyCount > 1 ? 's' : ''}).`
            : `Bio-Data gathered: +${bioDataGain}.`,
        type: 'reward' as const,
      },
    ];

    this.lastReward.set(reward);
    this.lastBattleMastery.set(masteryAwards);
    this.lastBattleThreat.set(threat);
    this.audio.play(sim.won ? 'win' : 'loss');
    if (item) {
      this.audio.play('item');
    }
    const levelUpLogs = xpResult.logs.filter((entry) => entry.text.toLowerCase().includes('level'));
    if (levelUpLogs.length > 0) {
      this.audio.play('level-up');
    }
    this.battleLogs.set(
      [
        ...logs,
        ...xpResult.logs,
        ...streakLog,
        ...overdriveLog,
        ...milestoneLog,
        ...dailyLog,
        ...gauntletLog,
        ...masteryLogs,
        ...dataLog,
        ...lossHintLog,
        ...(item ? [{ text: `Item found: ${item}.`, type: 'reward' as const }] : []),
        ...this.battleLogs(),
      ].slice(0, 36),
    );

    if (sim.won) {
      const lead = squad[0];
      this.toast.push({
        title: sim.criticalHit ? 'Critical Victory' : 'Victory',
        message: `${lead?.name ?? 'Squad'} pushed through. +${reward.coins} CR, +${reward.dnaShards} DNA, +${reward.xp} XP.`,
        tone: sim.criticalHit ? 'success' : 'reward',
        icon: sim.criticalHit ? 'CR' : 'OK',
        durationMs: 3800,
      });
    } else {
      this.toast.push({
        title: 'Retreat',
        message: `Squad pulled back. +${reward.coins} CR / +${reward.xp} XP fallback.`,
        tone: 'warn',
        icon: 'X',
        durationMs: 3600,
      });
    }

    if (overdriveArmed) {
      this.toast.push({
        title: 'Overdrive Unleashed',
        message: `${squad[0]?.name ?? 'Lead'} discharged the overdrive core.`,
        tone: 'success',
        icon: 'OD',
        durationMs: 3600,
      });
    }

    if (item) {
      this.toast.push({
        title: 'Item Recovered',
        message: `${item} added to inventory.`,
        tone: 'info',
        icon: 'IT',
        durationMs: 3800,
      });
    }

    if (crossedMilestone !== null) {
      this.toast.push({
        title: 'Milestone Cleared',
        message: milestoneLabel(crossedMilestone),
        tone: 'reward',
        icon: '*',
        durationMs: 4400,
      });
    }

    if (dailyClaimedNow) {
      this.toast.push({
        title: 'Daily Directive',
        message: `${getDailyObjectiveDef(daily.objectiveId).label} - +${dailyBonusCoins} CR, +${dailyBonusDna} DNA.`,
        tone: 'reward',
        icon: 'DY',
        durationMs: 4200,
      });
    }

    if (levelUpLogs.length > 0) {
      this.toast.push({
        title: levelUpLogs.length === 1 ? 'Level Up' : `${levelUpLogs.length} Level Ups`,
        message: levelUpLogs.map((entry) => entry.text).join(' '),
        tone: 'success',
        icon: 'UP',
        durationMs: 3800,
      });
    }

    if (sim.won && (reward.streakBonusCoins ?? 0) + (reward.streakBonusXp ?? 0) > 0) {
      this.toast.push({
        title: `Streak x${nextStreak}`,
        message: `Bonus +${reward.streakBonusCoins ?? 0} CR, +${reward.streakBonusXp ?? 0} XP.`,
        tone: 'success',
        icon: 'ST',
        durationMs: 3400,
      });
    }

    this.battleRunning = false;
  }







  /** Write any pending autosave immediately (manual "Save now" and page hide). */
  syncSaveState(): void {
    this.store.flushSave();
  }




  private getArenaThreatProfile(battleNumber: number): ArenaThreatProfile {
    if (battleNumber > 0 && battleNumber % 5 === 0) {
      return {
        id: 'boss',
        label: 'Boss Surge',
        detail: 'Every fifth sim spikes enemy stats but pays the richest rewards.',
        enemyModifier: 0.18,
        rewardModifier: 1.35,
        itemBonus: 0.18,
      };
    }

    if (battleNumber > 0 && battleNumber % 3 === 0) {
      return {
        id: 'hazard',
        label: 'Hazard Zone',
        detail: 'Arena hazards amplify enemy pressure and raise payout.',
        enemyModifier: 0.1,
        rewardModifier: 1.18,
        itemBonus: 0.08,
      };
    }

    if (battleNumber > 0 && battleNumber % 2 === 0) {
      return {
        id: 'volatile',
        label: 'Volatile Grid',
        detail: 'A noisy signal state with slightly boosted enemy tempo and rewards.',
        enemyModifier: 0.05,
        rewardModifier: 1.08,
        itemBonus: 0.04,
      };
    }

    return {
      id: 'standard',
      label: 'Calm Circuit',
      detail: 'Baseline arena conditions with no danger spike.',
      enemyModifier: 0,
      rewardModifier: 1,
      itemBonus: 0,
    };
  }

  private getArenaFormation(battleNumber: number): ArenaFormation {
    const rotation = this.arenaFormations;
    if (battleNumber > 0 && battleNumber % 5 === 0) {
      return rotation.find((formation) => formation.tier === 'Boss') ?? rotation[rotation.length - 1];
    }

    if (battleNumber > 0 && battleNumber % 3 === 0) {
      const eliteFormations = rotation.filter((formation) => formation.tier === 'Elite');
      return eliteFormations[(Math.floor(battleNumber / 3) - 1) % eliteFormations.length];
    }

    if (battleNumber === 1) {
      return rotation.find((formation) => formation.tier === 'Scout') ?? rotation[0];
    }

    const standardPool = rotation.filter((formation) => formation.tier === 'Standard');
    return standardPool[(Math.max(0, battleNumber - 2)) % standardPool.length];
  }

  private prependLog(text: string, type: BattleLog['type']): void {
    this.store.prependLog(text, type);
  }

  private buildRouteEtaInput(candidate: EvolutionCandidate | null, reward: ArenaRewardForecast): RouteEtaInput {
    if (!candidate?.source) {
      return {
        targetName: null,
        ready: false,
        percent: 100,
        levelGap: 0,
        xpToLevel: 0,
        coinGap: 0,
        dnaGap: 0,
        itemMissing: false,
        winCoins: reward.win.coins,
        winDna: reward.win.dnaShards,
        winXp: reward.win.xp,
        itemChancePercent: reward.itemChancePercent,
      };
    }

    const requirements = candidate.target.requirements ?? {};
    const player = this.player();
    const levelGap = Math.max(0, (requirements.level ?? candidate.source.level) - candidate.source.level);
    const xpToLevel =
      levelGap <= 0
        ? 0
        : Math.max(0, candidate.source.maxXp - candidate.source.xp) + Math.max(0, levelGap - 1) * candidate.source.maxXp;

    return {
      targetName: candidate.target.name,
      ready: candidate.ready,
      percent: candidate.percent,
      levelGap,
      xpToLevel,
      coinGap: Math.max(0, (requirements.coins ?? 0) - player.coins),
      dnaGap: Math.max(0, (requirements.dnaShards ?? 0) - player.dnaShards),
      itemMissing: requirements.item ? !player.inventory.includes(requirements.item) : false,
      winCoins: reward.win.coins,
      winDna: reward.win.dnaShards,
      winXp: reward.win.xp,
      itemChancePercent: reward.itemChancePercent,
    };
  }

  private firstOwnedConsumable(names: string[]): string | null {
    const inventory = this.player().inventory;
    return names.find((name) => countInInventory(inventory, name) > 0) ?? null;
  }

  private buildSquadPatchInput(): SquadPatchInput {
    const squad = this.squad();
    const squadIds = new Set(squad.map((monster) => monster.id));
    const reserves = this.monsters()
      .filter((monster) => monster.unlocked && !squadIds.has(monster.id))
      .sort((left, right) => this.getMonsterPower(right) - this.getMonsterPower(left));
    const candidate = reserves[0] ?? null;
    const weakest =
      squad.length > 0
        ? [...squad].sort((left, right) => this.getMonsterPower(left) - this.getMonsterPower(right))[0]
        : null;
    const powerGain = candidate && weakest ? Math.max(0, this.getMonsterPower(candidate) - this.getMonsterPower(weakest)) : 0;

    return {
      squadSize: squad.length,
      candidateName: candidate?.name ?? null,
      weakestName: weakest?.name ?? null,
      powerGain,
    };
  }

  /** Drop pool: evolution gate items plus combat consumables. */
  private randomDropItem(): string {
    return this.randomFrom([...this.inventoryItems, ...CONSUMABLE_NAMES]);
  }

  private randomFrom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

}

