import { computed, inject, Injectable, signal } from '@angular/core';
import { ARENA_FORMATIONS } from '../data/enemies.data';
import { MONSTERS, STAGES, TYPES } from '../data/monsters.data';
import { ArenaFormation, BattleLog, BattleReward, EnemyMonster } from '../models/battle.model';
import { Monster, MonsterRarity, MonsterStage, MonsterType } from '../models/monster.model';
import { CombatStats, DEFAULT_SETTINGS, PlayerSettings, PlayerState, SquadPreset } from '../models/player-state.model';
import { GearInstance } from '../models/gear.model';
import { serializeMonsterProgress } from '../models/save-state.model';
import {
  ArenaThreatProfile,
  BATTLE_CATEGORIES,
  BATTLE_STANCES,
  BattleCategoryId,
  BattleCategoryProfile,
  BattleStanceId,
  OVERDRIVE_ATTACK_BONUS,
  applyStreakBonus,
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
import { CONSUMABLES } from '../data/items.data';
import { CONSUMABLE_NAMES, countInInventory, getConsumableDef, isConsumable, removeOneFromInventory, toCombatEffects } from '../rules/items.rules';
import { AchievementMetrics, evaluateAchievements, findNewlyCompleted } from '../rules/achievements.rules';
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
import { applyXpToSquad } from '../rules/xp.rules';
import { GEAR_DEFS } from '../data/gear.data';
import { GearSlot } from '../models/gear.model';
import { applyGearToMonster, canAfford, forgeCost, getGearDef, getGearInstance, gearInstanceBonus, clampTier } from '../rules/gear.rules';
import { BOSSES, BossDef, getBossForBattle } from '../data/bosses.data';
import { CAMPAIGN_CHAPTERS, CampaignChapter } from '../data/campaign.data';
import { CampaignMetrics, ChapterProgress, evaluateCampaign, findClaimableChapter } from '../rules/campaign.rules';
import { SAVE_STATE_VERSION, SaveStateSnapshot } from '../models/save-state.model';
import { AudioService } from './audio.service';
import { BattleAnimationService } from './battle-animation.service';
import { SaveStateService } from './save-state.service';
import { ToastService } from './toast.service';

export interface ArenaRunDirective {
  title: string;
  objective: string;
  rewardFocus: string;
  tacticalHint: string;
}

export type GameSectionName = 'Evolution Tree' | 'Squad' | 'Arena' | 'Collection' | 'Medals' | 'Handbook';

export interface EvolutionCandidate {
  target: Monster;
  source: Monster | null;
  requirements: RequirementStatus[];
  missing: RequirementStatus[];
  ready: boolean;
  percent: number;
  score: number;
}

export interface NextCommand {
  tab: GameSectionName;
  status: string;
  title: string;
  detail: string;
  actionLabel: string;
  tone: 'blocked' | 'ready' | 'battle' | 'squad' | 'collection' | 'meta';
}

const STARTER_PLAYER_STATE: PlayerState = {
  coins: 1200,
  dnaShards: 45,
  battlesFought: 0,
  battlesWon: 0,
  selectedMonsterId: 'M007',
  squadIds: ['M007', 'M008'],
  inventory: ['Shadow Gem', 'Ancient Gear'],
  winStreak: 0,
  bestWinStreak: 0,
  claimedMilestones: [],
  squadPresets: [],
  pinnedChaseId: null,
  claimedStageMilestones: [],
  audioEnabled: false,
  overdriveCharge: 0,
  claimedAchievements: [],
  combatStats: { criticalWins: 0, overdrivesUsed: 0, itemsUsed: 0, flawlessWins: 0, gauntletBestWave: 0 },
  dailyDirective: null,
  ownedGear: [],
  gearLoadout: {},
  defeatedBosses: [],
  claimedChapters: [],
  encounteredEnemies: [],
  tutorialDone: false,
  settings: { ...DEFAULT_SETTINGS },
};

const STARTER_COMBAT_STATS: CombatStats = { criticalWins: 0, overdrivesUsed: 0, itemsUsed: 0, flawlessWins: 0, gauntletBestWave: 0 };

const MAX_SQUAD_PRESETS = 3;
const MAX_LOADOUT = 2;
const STAGE_MILESTONE_REWARD = { coins: 200, dnaShards: 10 } as const;

const STARTER_BATTLE_LOGS: BattleLog[] = [
  { text: 'Digital arena online. Build your squad and start a battle.', type: 'system' },
  { text: 'Tip: Aquabun can evolve early if you spend starter resources.', type: 'info' },
];

const STARTER_MONSTERS: Monster[] = MONSTERS.map(cloneMonster);
const STARTER_MONSTER_IDS = new Set(STARTER_MONSTERS.map((monster) => monster.id));

@Injectable({ providedIn: 'root' })
export class GameStateService {
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

  readonly monsters = signal<Monster[]>(createStarterMonsters());
  readonly player = signal<PlayerState>(createStarterPlayerState());
  readonly battleLogs = signal<BattleLog[]>(createStarterBattleLogs());
  readonly lastReward = signal<BattleReward | null>(null);
  readonly lastBattleThreat = signal<ArenaThreatProfile | null>(null);
  readonly battleCategoryId = signal<BattleCategoryId>('standard');
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

  readonly overdriveCharge = computed(() => this.player().overdriveCharge);
  readonly overdrivePercent = computed(() => Math.round(this.player().overdriveCharge));
  readonly overdriveReady = computed(() => canArmOverdrive(this.player().overdriveCharge));

  readonly dailyDirective = computed(() => ensureDailyDirective(this.player().dailyDirective, getDateKey()));
  readonly dailyObjective = computed(() => getDailyObjectiveDef(this.dailyDirective().objectiveId));
  readonly dailyComplete = computed(() => isDailyComplete(this.dailyDirective()));

  readonly achievementMetrics = computed<AchievementMetrics>(() => {
    const player = this.player();
    return {
      battlesWon: player.battlesWon,
      bestWinStreak: player.bestWinStreak,
      unlockedCount: this.monsters().filter((monster) => monster.unlocked).length,
      stageMilestones: player.claimedStageMilestones.length,
      criticalWins: player.combatStats.criticalWins,
      overdrivesUsed: player.combatStats.overdrivesUsed,
      itemsUsed: player.combatStats.itemsUsed,
      flawlessWins: player.combatStats.flawlessWins,
      gauntletBestWave: player.combatStats.gauntletBestWave,
      prismaticCount: this.monsters().filter((monster) => monster.prismatic).length,
      bossesDefeated: player.defeatedBosses.length,
    };
  });
  readonly achievementProgress = computed(() => evaluateAchievements(this.achievementMetrics(), this.player().claimedAchievements));
  readonly unlockedAchievementCount = computed(() => this.achievementProgress().filter((entry) => entry.claimed).length);
  readonly completedAchievementCount = computed(() => this.achievementProgress().filter((entry) => entry.complete).length);

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
    return this.monsters().find((monster) => monster.id === selectedId) ?? this.monsters().find((monster) => monster.unlocked) ?? null;
  });

  readonly squad = computed(() => this.player().squadIds.map((id) => this.getMonsterById(id)).filter((monster): monster is Monster => Boolean(monster)));

  /** Squad with gear + prismatic bonuses folded in — used for battle and power. */
  readonly effectiveSquad = computed(() => {
    const player = this.player();
    return this.squad().map((monster) => applyGearToMonster(monster, player.gearLoadout, player.ownedGear));
  });

  readonly teamPower = computed(() => this.effectiveSquad().reduce((total, monster) => total + getMonsterPower(monster), 0));

  readonly unlockedCount = computed(() => this.monsters().filter((monster) => monster.unlocked).length);

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

  readonly squadBattleModifier = computed(() => calculateSquadBattleModifier(this.squadSynergies(), this.squadTypePressure().modifier));

  readonly enemyBattleModifier = computed(() =>
    calculateEnemyBattleModifier(
      this.activeFormation().enemyModifier + this.upcomingArenaThreat().enemyModifier + this.battleCategory().enemyModifier,
      this.enemyTypePressure().modifier,
    ),
  );

  readonly battleOutlook = computed(() =>
    predictBattleOutlook({
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      playerModifier: this.squadBattleModifier(),
      enemyModifier: this.enemyBattleModifier(),
      hasSquad: this.squad().length > 0,
    }),
  );

  readonly winStreak = computed(() => this.player().winStreak);
  readonly bestWinStreak = computed(() => this.player().bestWinStreak);
  readonly streakLabel = computed(() => {
    const streak = this.winStreak();
    if (streak <= 0) {
      return 'No streak';
    }
    return `x${streak}`;
  });

  // --- Gear, Boss, Campaign, Settings (new feature surfaces) ---
  readonly gearDefs = GEAR_DEFS;
  readonly bosses = BOSSES;
  readonly campaignChapters = CAMPAIGN_CHAPTERS;

  readonly settings = computed(() => this.player().settings);

  /** Named boss for the upcoming run, if it is a Boss Surge battle. */
  readonly activeBoss = computed<BossDef | null>(() =>
    this.upcomingArenaThreat().id === 'boss' ? getBossForBattle(this.player().battlesFought + 1) : null,
  );

  readonly bossCodex = computed(() =>
    BOSSES.map((boss) => ({ boss, defeated: this.player().defeatedBosses.includes(boss.id) })),
  );

  readonly campaignMetrics = computed<CampaignMetrics>(() => {
    const player = this.player();
    return {
      battlesWon: player.battlesWon,
      unlockedCount: this.unlockedCount(),
      bestWinStreak: player.bestWinStreak,
      flawlessWins: player.combatStats.flawlessWins,
      defeatedBosses: player.defeatedBosses.length,
      stageMilestones: player.claimedStageMilestones.length,
      gauntletBestWave: player.combatStats.gauntletBestWave,
    };
  });

  readonly campaignProgress = computed<ChapterProgress[]>(() => evaluateCampaign(this.campaignMetrics(), this.player().claimedChapters));
  readonly claimableChapter = computed(() => findClaimableChapter(this.campaignMetrics(), this.player().claimedChapters));

  /** Owned gear with resolved definition + tier bonus, for the Forge UI. */
  readonly ownedGearDetailed = computed(() =>
    this.player().ownedGear.map((instance) => ({
      instance,
      def: getGearDef(instance.defId)!,
      bonus: gearInstanceBonus(instance),
    })).filter((entry) => entry.def),
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
    const savedState = this.saveState.loadState();

    if (savedState) {
      this.monsters.set(this.saveState.restoreMonsters(createStarterMonsters(), savedState.monsters));
      this.player.set(sanitizePlayerState(savedState.player));
      this.battleLogs.set(savedState.battleLogs.length ? cloneBattleLogs(savedState.battleLogs) : createStarterBattleLogs());
      this.lastReward.set(savedState.lastReward ? { ...savedState.lastReward } : null);
      this.lastBattleThreat.set(savedState.lastBattleThreat ? { ...savedState.lastBattleThreat } : null);
      this.audio.setEnabled(this.player().audioEnabled);
      this.audio.setMasterVolume(this.player().settings.masterVolume);
      this.ensureDailyDirectiveState();
      return;
    }

    this.audio.setEnabled(this.player().audioEnabled);
    this.audio.setMasterVolume(this.player().settings.masterVolume);
    this.ensureDailyDirectiveState();
    this.persistState();
  }

  /** Rollt eine frische Tages-Directive, falls keine existiert oder der Tag wechselte. */
  private ensureDailyDirectiveState(): void {
    const current = this.player().dailyDirective;
    const ensured = ensureDailyDirective(current, getDateKey());
    if (ensured !== current) {
      this.player.update((player) => ({ ...player, dailyDirective: ensured }));
    }
  }

  toggleAudio(): boolean {
    const next = !this.player().audioEnabled;
    this.player.update((current) => ({ ...current, audioEnabled: next }));
    this.audio.setEnabled(next);
    if (next) {
      this.audio.play('menu');
    }
    this.persistState();
    return next;
  }

  get audioEnabled(): boolean {
    return this.player().audioEnabled;
  }

  get enemies(): EnemyMonster[] {
    return this.activeEnemies();
  }

  getMonsterPower(monster: Monster): number {
    return getMonsterPower(monster);
  }

  stageClass(stage: MonsterStage): string {
    return stage.toLowerCase().replace(/\s+/g, '-').replace('in-training', 'intraining');
  }

  getMonsterById(id: string): Monster | undefined {
    return this.monsters().find((monster) => monster.id === id);
  }

  selectMonster(id: string): void {
    this.player.update((player) => ({ ...player, selectedMonsterId: id }));
    this.persistState();
  }

  addToSquad(id: string): void {
    const monster = this.getMonsterById(id);
    if (!monster?.unlocked) {
      this.prependLog(`${monster?.name ?? 'Locked creature'} must be unlocked before joining the squad.`, 'system');
      return;
    }

    this.player.update((player) => {
      if (player.squadIds.includes(id) || player.squadIds.length >= 3) {
        return player;
      }

      return { ...player, squadIds: [...player.squadIds, id] };
    });

    this.persistState();
  }

  removeFromSquad(id: string): void {
    this.player.update((player) => ({ ...player, squadIds: player.squadIds.filter((squadId) => squadId !== id) }));
    this.persistState();
  }

  replaceSquadMember(removeId: string, addId: string): void {
    const monster = this.getMonsterById(addId);
    if (!monster?.unlocked) {
      this.prependLog(`${monster?.name ?? 'Locked creature'} must be unlocked before joining the squad.`, 'system');
      return;
    }

    this.player.update((player) => {
      if (!player.squadIds.includes(removeId) || player.squadIds.includes(addId)) {
        return player;
      }

      return {
        ...player,
        squadIds: player.squadIds.map((squadId) => (squadId === removeId ? addId : squadId)).slice(0, 3),
      };
    });

    this.prependLog(`${monster.name} replaced a squad slot for the next run.`, 'info');
    this.persistState();
  }

  clearSquad(): void {
    this.player.update((player) => ({ ...player, squadIds: [] }));
    this.persistState();
  }

  setBattleCategory(id: BattleCategoryId): void {
    this.battleCategoryId.set(id);
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
    this.persistState();
  }

  saveSquadPreset(name: string): SquadPreset | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    const squadIds = [...this.player().squadIds];
    if (squadIds.length === 0) {
      this.prependLog('Cannot save an empty squad as a preset.', 'system');
      return null;
    }

    let saved: SquadPreset | null = null;

    this.player.update((player) => {
      const preset: SquadPreset = {
        id: `preset-${Date.now()}`,
        name: trimmed.slice(0, 24),
        squadIds,
      };

      const existingIndex = player.squadPresets.findIndex((current) => current.name.toLowerCase() === preset.name.toLowerCase());
      let nextPresets: SquadPreset[];
      if (existingIndex >= 0) {
        nextPresets = [...player.squadPresets];
        nextPresets[existingIndex] = preset;
      } else if (player.squadPresets.length >= MAX_SQUAD_PRESETS) {
        nextPresets = [...player.squadPresets.slice(1), preset];
      } else {
        nextPresets = [...player.squadPresets, preset];
      }

      saved = preset;
      return { ...player, squadPresets: nextPresets };
    });

    this.persistState();
    return saved;
  }

  loadSquadPreset(presetId: string): void {
    const preset = this.player().squadPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    const validIds = preset.squadIds.filter((id) => {
      const monster = this.getMonsterById(id);
      return monster?.unlocked;
    });

    this.player.update((player) => ({ ...player, squadIds: validIds.slice(0, 3) }));
    this.prependLog(`Loaded preset "${preset.name}" into squad.`, 'info');
  }

  deleteSquadPreset(presetId: string): void {
    this.player.update((player) => ({
      ...player,
      squadPresets: player.squadPresets.filter((preset) => preset.id !== presetId),
    }));
    this.persistState();
  }

  pinChaseTarget(id: string): void {
    const monster = this.getMonsterById(id);
    if (!monster) {
      return;
    }
    this.player.update((player) => ({ ...player, pinnedChaseId: id }));
    this.persistState();
  }

  unpinChaseTarget(): void {
    this.player.update((player) => ({ ...player, pinnedChaseId: null }));
    this.persistState();
  }

  resetProgress(): void {
    this.saveState.clearState();
    this.monsters.set(createStarterMonsters());
    this.player.set(createStarterPlayerState());
    this.lastReward.set(null);
    this.lastBattleThreat.set(null);
    this.battleLogs.set([{ text: 'Archive reset complete. Starter squad and resources restored.', type: 'system' as const }, ...createStarterBattleLogs()].slice(0, 36));
    this.persistState();
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
    this.checkAchievements();
  }

  // --- Gear / Forge ---
  getEffectiveMonster(monster: Monster): Monster {
    const player = this.player();
    return applyGearToMonster(monster, player.gearLoadout, player.ownedGear);
  }

  getEquippedGear(monsterId: string, slot: GearSlot) {
    const instanceId = this.player().gearLoadout[monsterId]?.[slot];
    const instance = getGearInstance(this.player().ownedGear, instanceId);
    if (!instance) {
      return null;
    }
    return { instance, def: getGearDef(instance.defId)!, bonus: gearInstanceBonus(instance) };
  }

  forgeGear(defId: string): void {
    const def = getGearDef(defId);
    if (!def) {
      return;
    }
    const cost = forgeCost(def, 0);
    if (!canAfford(cost, this.player().coins, this.player().dnaShards)) {
      this.toast.push({ title: 'Forge Blocked', message: `${def.name} needs ${cost.coins} CR + ${cost.dnaShards} DNA.`, tone: 'warn', icon: '!', durationMs: 3200 });
      return;
    }
    const instance = { instanceId: `gear-${Date.now()}-${Math.floor(Math.random() * 1000)}`, defId, tier: 1 };
    this.player.update((player) => ({
      ...player,
      coins: player.coins - cost.coins,
      dnaShards: player.dnaShards - cost.dnaShards,
      ownedGear: [...player.ownedGear, instance],
    }));
    this.audio.play('forge');
    this.toast.push({ title: 'Gear Forged', message: `${def.name} (T1) added to your gear locker.`, tone: 'info', icon: def.icon, durationMs: 3400 });
    this.persistState();
  }

  upgradeGear(instanceId: string): void {
    const instance = getGearInstance(this.player().ownedGear, instanceId);
    const def = instance ? getGearDef(instance.defId) : null;
    if (!instance || !def) {
      return;
    }
    if (instance.tier >= 5) {
      this.toast.push({ title: 'Max Tier', message: `${def.name} is already at the maximum tier.`, tone: 'warn', icon: '!', durationMs: 2800 });
      return;
    }
    const cost = forgeCost(def, instance.tier);
    if (!canAfford(cost, this.player().coins, this.player().dnaShards)) {
      this.toast.push({ title: 'Upgrade Blocked', message: `Needs ${cost.coins} CR + ${cost.dnaShards} DNA.`, tone: 'warn', icon: '!', durationMs: 3200 });
      return;
    }
    this.player.update((player) => ({
      ...player,
      coins: player.coins - cost.coins,
      dnaShards: player.dnaShards - cost.dnaShards,
      ownedGear: player.ownedGear.map((entry) => (entry.instanceId === instanceId ? { ...entry, tier: clampTier(entry.tier + 1) } : entry)),
    }));
    this.audio.play('forge');
    this.toast.push({ title: 'Gear Upgraded', message: `${def.name} reached tier ${instance.tier + 1}.`, tone: 'reward', icon: def.icon, durationMs: 3200 });
    this.persistState();
  }

  equipGear(monsterId: string, instanceId: string): void {
    const instance = getGearInstance(this.player().ownedGear, instanceId);
    const def = instance ? getGearDef(instance.defId) : null;
    if (!instance || !def) {
      return;
    }
    this.player.update((player) => {
      const loadout = cloneGearLoadout(player.gearLoadout);
      // An instance can only be equipped in one place — remove it elsewhere.
      for (const slots of Object.values(loadout)) {
        for (const slot of Object.keys(slots) as GearSlot[]) {
          if (slots[slot] === instanceId) {
            delete slots[slot];
          }
        }
      }
      loadout[monsterId] = { ...(loadout[monsterId] ?? {}), [def.slot]: instanceId };
      return { ...player, gearLoadout: loadout };
    });
    this.persistState();
  }

  unequipGear(monsterId: string, slot: GearSlot): void {
    this.player.update((player) => {
      const loadout = cloneGearLoadout(player.gearLoadout);
      if (loadout[monsterId]) {
        delete loadout[monsterId][slot];
      }
      return { ...player, gearLoadout: loadout };
    });
    this.persistState();
  }

  // --- Settings + accessibility ---
  setMasterVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.player.update((player) => ({ ...player, settings: { ...player.settings, masterVolume: clamped } }));
    this.audio.setMasterVolume(clamped);
    this.persistState();
  }

  toggleColorblindMode(): void {
    this.player.update((player) => ({ ...player, settings: { ...player.settings, colorblindMode: !player.settings.colorblindMode } }));
    this.persistState();
  }

  setEffectIntensity(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.player.update((player) => ({ ...player, settings: { ...player.settings, effectIntensity: clamped } }));
    this.persistState();
  }

  toggleMusic(): boolean {
    return this.audio.toggleMusic();
  }

  // --- Campaign ---
  claimChapter(chapterId: string): void {
    const claimable = this.claimableChapter();
    if (!claimable || claimable.id !== chapterId) {
      return;
    }
    const chapter: CampaignChapter = claimable;
    const forgedGear = chapter.reward.gearDefId
      ? { instanceId: `gear-${Date.now()}-${Math.floor(Math.random() * 1000)}`, defId: chapter.reward.gearDefId, tier: 1 }
      : null;
    this.player.update((player) => ({
      ...player,
      coins: player.coins + chapter.reward.coins,
      dnaShards: player.dnaShards + chapter.reward.dnaShards,
      claimedChapters: [...player.claimedChapters, chapter.id],
      ownedGear: forgedGear ? [...player.ownedGear, forgedGear] : player.ownedGear,
    }));
    this.prependLog(`${chapter.title} cleared: ${chapter.reward.lore}`, 'reward');
    this.audio.play('level-up');
    this.toast.push({
      title: 'Chapter Cleared',
      message: `${chapter.title} — +${chapter.reward.coins} CR, +${chapter.reward.dnaShards} DNA${forgedGear ? ' + gear' : ''}.`,
      tone: 'reward',
      icon: '▣',
      durationMs: 4800,
    });
    this.persistState();
  }

  // --- Onboarding ---
  completeTutorial(): void {
    if (this.player().tutorialDone) {
      return;
    }
    this.player.update((player) => ({ ...player, tutorialDone: true }));
    this.persistState();
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
    try {
      const parsed = JSON.parse(base64Decode(code.trim())) as Partial<SaveStateSnapshot>;
      if (!parsed || typeof parsed !== 'object' || !parsed.player || !Array.isArray(parsed.monsters)) {
        return false;
      }
      this.monsters.set(this.saveState.restoreMonsters(createStarterMonsters(), parsed.monsters));
      this.player.set(sanitizePlayerState(parsed.player as PlayerState));
      this.battleLogs.set(Array.isArray(parsed.battleLogs) && parsed.battleLogs.length ? cloneBattleLogs(parsed.battleLogs) : createStarterBattleLogs());
      this.lastReward.set(parsed.lastReward ? { ...parsed.lastReward } : null);
      this.lastBattleThreat.set(parsed.lastBattleThreat ? { ...parsed.lastBattleThreat } : null);
      this.audio.setEnabled(this.player().audioEnabled);
      this.audio.setMasterVolume(this.player().settings.masterVolume);
      this.ensureDailyDirectiveState();
      this.persistState();
      this.toast.push({ title: 'Save Imported', message: 'Progress restored from your code.', tone: 'success', icon: 'IN', durationMs: 3600 });
      return true;
    } catch {
      this.toast.push({ title: 'Import Failed', message: 'That save code could not be read.', tone: 'warn', icon: '!', durationMs: 3600 });
      return false;
    }
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

    this.player.update((player) => applyEvolutionToPlayer(player, target));
    this.monsters.update((monsters) => unlockEvolutionTarget(monsters, source, target));
    this.prependLog(`${source.name} evolved into ${target.name}!`, 'reward');
    this.audio.play('evolve');
    this.toast.push({
      title: 'Evolution Complete',
      message: `${source.name} -> ${target.name} (${target.stage}).`,
      tone: 'evolution',
      icon: target.icon ?? '*',
      durationMs: 4500,
    });

    if (this.player().pinnedChaseId === target.id) {
      this.unpinChaseTarget();
    }

    this.awardStageMilestoneIfComplete(target.stage);
    this.checkAchievements();
    this.persistState();
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

  startBattle(): void {
    if (this.battleAnimation.isPlaying()) {
      return;
    }

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
    const sim = simulateBattle({
      squad: this.effectiveSquad(),
      enemies: this.enemies,
      playerModifier: this.squadBattleModifier(),
      enemyModifier: this.enemyBattleModifier(),
      stanceAttackMod: stance.attackMod,
      stanceMitigation: stance.mitigation,
      overdrive: overdriveArmed,
      overdriveAttackBonus: OVERDRIVE_ATTACK_BONUS,
      consumables: toCombatEffects(equipped),
      synergyLabel: this.squadSynergies()[0]?.label ?? null,
      randomBetween: (min, max) => this.randomBetween(min, max),
      randomFrom: <T>(items: T[]) => this.randomFrom(items),
    });
    const gauntletRewardBoost = isGauntlet ? 1 + 0.08 * gauntletStartWave : 1;
    const rewardMultiplier = formation.rewardModifier * threat.rewardModifier * category.rewardModifier * gauntletRewardBoost;
    const baseReward = buildReward(sim.won, sim.criticalHit, rewardMultiplier);
    const currentPlayer = this.player();
    const nextStreak = sim.won ? currentPlayer.winStreak + 1 : 0;
    const streakBonus = sim.won ? calculateStreakBonus(nextStreak, baseReward) : { coins: 0, xp: 0 };
    let reward = sim.won ? applyStreakBonus(baseReward, streakBonus, nextStreak) : { ...baseReward, streakAfter: 0 };

    const xpResult = applyXpToSquad(this.monsters(), this.player().squadIds, reward.xp);
    this.monsters.set(xpResult.updatedMonsters);

    const itemChance = Math.min(0.65, Math.max(0.05, 0.25 + formation.itemBonus + threat.itemBonus + category.itemBonus));
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
    const overdriveCharge = overdriveArmed ? 0 : chargeOverdrive(currentPlayer.overdriveCharge, sim.won);

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
    let daily = ensureDailyDirective(currentPlayer.dailyDirective, getDateKey());
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
    const encounteredAfter = Array.from(new Set([...currentPlayer.encounteredEnemies, ...this.enemies.map((enemy) => enemy.id ?? enemy.name)]));

    this.player.update((player) => ({
      ...player,
      coins: player.coins + reward.coins + dailyBonusCoins + bossBonusCoins,
      dnaShards: player.dnaShards + reward.dnaShards + dailyBonusDna + bossBonusDna,
      battlesFought: player.battlesFought + 1,
      battlesWon: nextBattlesWon,
      inventory: item ? [...inventoryAfter, item] : inventoryAfter,
      winStreak: nextStreak,
      bestWinStreak: Math.max(player.bestWinStreak, nextStreak),
      claimedMilestones:
        crossedMilestone !== null ? [...player.claimedMilestones, crossedMilestone] : player.claimedMilestones,
      overdriveCharge,
      combatStats,
      dailyDirective: daily,
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

    this.overdriveArmed.set(false);
    this.equippedConsumables.set([]);
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

    this.lastReward.set(reward);
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
        ...lossHintLog,
        ...(item ? [{ text: `Item found: ${item}.`, type: 'reward' as const }] : []),
        ...this.battleLogs(),
      ].slice(0, 36),
    );

    this.battleAnimation.play({
      won: sim.won,
      criticalHit: sim.criticalHit,
      events: sim.events,
    });

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

    this.checkAchievements();
    this.persistState();
  }

  /** Pays out completed, unclaimed medals. */
  private checkAchievements(): void {
    const newly = findNewlyCompleted(this.achievementMetrics(), this.player().claimedAchievements);
    if (newly.length === 0) {
      return;
    }
    const totalCoins = newly.reduce((sum, def) => sum + def.reward.coins, 0);
    const totalDna = newly.reduce((sum, def) => sum + def.reward.dnaShards, 0);
    this.player.update((player) => ({
      ...player,
      coins: player.coins + totalCoins,
      dnaShards: player.dnaShards + totalDna,
      claimedAchievements: [...player.claimedAchievements, ...newly.map((def) => def.id)],
    }));
    for (const def of newly) {
      this.prependLog(`Medal unlocked: ${def.label} (+${def.reward.coins} CR, +${def.reward.dnaShards} DNA).`, 'reward');
      this.audio.play('level-up');
      this.toast.push({
        title: 'Medal Unlocked',
        message: `${def.label} - +${def.reward.coins} CR, +${def.reward.dnaShards} DNA.`,
        tone: 'reward',
        icon: def.icon,
        durationMs: 4200,
      });
    }
  }

  getStageCount(stage: MonsterStage): number {
    return this.monsters().filter((monster) => monster.stage === stage).length;
  }

  getTypeCount(type: MonsterType): number {
    return this.monsters().filter((monster) => monster.type === type).length;
  }

  syncSaveState(): void {
    this.persistState();
  }

  private persistState(): void {
    this.saveState.saveState({
      player: clonePlayerState(this.player()),
      monsters: this.monsters().map((monster) => serializeMonsterProgress(monster)),
      battleLogs: cloneBattleLogs(this.battleLogs()),
      lastReward: this.lastReward() ? { ...this.lastReward()! } : null,
      lastBattleThreat: this.lastBattleThreat() ? { ...this.lastBattleThreat()! } : null,
    });
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
    this.battleLogs.update((logs) => [{ text, type }, ...logs].slice(0, 36));
    this.persistState();
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

function createStarterMonsters(): Monster[] {
  return STARTER_MONSTERS.map(cloneMonster);
}

function createStarterPlayerState(): PlayerState {
  return clonePlayerState(STARTER_PLAYER_STATE);
}

function createStarterBattleLogs(): BattleLog[] {
  return cloneBattleLogs(STARTER_BATTLE_LOGS);
}

function cloneMonster(monster: Monster): Monster {
  return {
    ...monster,
    evolutionTargets: [...monster.evolutionTargets],
  };
}

function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    squadIds: [...player.squadIds],
    inventory: [...player.inventory],
    claimedMilestones: [...player.claimedMilestones],
    squadPresets: player.squadPresets.map((preset) => ({ ...preset, squadIds: [...preset.squadIds] })),
    claimedStageMilestones: [...player.claimedStageMilestones],
    claimedAchievements: [...player.claimedAchievements],
    combatStats: { ...player.combatStats },
    dailyDirective: player.dailyDirective ? { ...player.dailyDirective } : null,
    ownedGear: player.ownedGear.map((entry) => ({ ...entry })),
    gearLoadout: cloneGearLoadout(player.gearLoadout),
    defeatedBosses: [...player.defeatedBosses],
    claimedChapters: [...player.claimedChapters],
    encounteredEnemies: [...player.encounteredEnemies],
    tutorialDone: player.tutorialDone,
    settings: { ...player.settings },
  };
}

function cloneGearLoadout(loadout: PlayerState['gearLoadout']): PlayerState['gearLoadout'] {
  const result: PlayerState['gearLoadout'] = {};
  for (const [monsterId, slots] of Object.entries(loadout)) {
    result[monsterId] = { ...slots };
  }
  return result;
}

function cloneBattleLogs(logs: BattleLog[]): BattleLog[] {
  return logs.map((log) => ({ ...log }));
}

function sanitizePlayerState(player: PlayerState): PlayerState {
  return {
    ...clonePlayerState(player),
    selectedMonsterId:
      player.selectedMonsterId && STARTER_MONSTER_IDS.has(player.selectedMonsterId)
        ? player.selectedMonsterId
        : STARTER_PLAYER_STATE.selectedMonsterId,
    squadIds: player.squadIds.filter((id) => STARTER_MONSTER_IDS.has(id)).slice(0, 3),
    winStreak: Math.max(0, player.winStreak ?? 0),
    bestWinStreak: Math.max(0, player.bestWinStreak ?? player.winStreak ?? 0),
    claimedMilestones: Array.isArray(player.claimedMilestones) ? [...player.claimedMilestones] : [],
    squadPresets: Array.isArray(player.squadPresets)
      ? player.squadPresets
          .map((preset) => ({
            id: preset.id,
            name: preset.name,
            squadIds: preset.squadIds.filter((id) => STARTER_MONSTER_IDS.has(id)).slice(0, 3),
          }))
          .slice(0, 3)
      : [],
    pinnedChaseId:
      player.pinnedChaseId && STARTER_MONSTER_IDS.has(player.pinnedChaseId) ? player.pinnedChaseId : null,
    claimedStageMilestones: Array.isArray(player.claimedStageMilestones)
      ? [...player.claimedStageMilestones]
      : [],
    audioEnabled: typeof player.audioEnabled === 'boolean' ? player.audioEnabled : false,
    overdriveCharge: Math.max(0, Math.min(100, player.overdriveCharge ?? 0)),
    claimedAchievements: Array.isArray(player.claimedAchievements) ? [...player.claimedAchievements] : [],
    combatStats: { ...STARTER_COMBAT_STATS, ...(player.combatStats ?? {}) },
    dailyDirective: player.dailyDirective ?? null,
    ownedGear: Array.isArray(player.ownedGear) ? player.ownedGear.map((entry) => ({ ...entry })) : [],
    gearLoadout: player.gearLoadout ? cloneGearLoadout(player.gearLoadout) : {},
    defeatedBosses: Array.isArray(player.defeatedBosses) ? [...player.defeatedBosses] : [],
    claimedChapters: Array.isArray(player.claimedChapters) ? [...player.claimedChapters] : [],
    encounteredEnemies: Array.isArray(player.encounteredEnemies) ? [...player.encounteredEnemies] : [],
    tutorialDone: player.tutorialDone === true,
    settings: sanitizeSettings(player.settings),
  };
}

function sanitizeSettings(settings: PlayerSettings | undefined): PlayerSettings {
  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    masterVolume: clampUnit(settings.masterVolume ?? DEFAULT_SETTINGS.masterVolume),
    colorblindMode: settings.colorblindMode === true,
    effectIntensity: clampUnit(settings.effectIntensity ?? 1),
  };
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hasProgressBeyondStarter(player: PlayerState, monsters: Monster[]): boolean {
  if (
    player.coins !== STARTER_PLAYER_STATE.coins ||
    player.dnaShards !== STARTER_PLAYER_STATE.dnaShards ||
    player.battlesFought !== STARTER_PLAYER_STATE.battlesFought ||
    player.battlesWon !== STARTER_PLAYER_STATE.battlesWon ||
    player.selectedMonsterId !== STARTER_PLAYER_STATE.selectedMonsterId ||
    player.squadIds.join('|') !== STARTER_PLAYER_STATE.squadIds.join('|') ||
    player.inventory.join('|') !== STARTER_PLAYER_STATE.inventory.join('|') ||
    (player.winStreak ?? 0) !== 0 ||
    (player.bestWinStreak ?? 0) !== 0 ||
    (player.claimedMilestones?.length ?? 0) > 0 ||
    (player.squadPresets?.length ?? 0) > 0 ||
    player.pinnedChaseId !== null ||
    (player.claimedStageMilestones?.length ?? 0) > 0 ||
    player.audioEnabled !== STARTER_PLAYER_STATE.audioEnabled ||
    (player.overdriveCharge ?? 0) !== 0 ||
    (player.claimedAchievements?.length ?? 0) > 0 ||
    hasCombatProgress(player.combatStats) ||
    (player.dailyDirective ? player.dailyDirective.progress > 0 || player.dailyDirective.claimed : false)
  ) {
    return true;
  }

  return monsters.some((monster, index) => {
    const starter = STARTER_MONSTERS[index];
    return (
      monster.unlocked !== starter.unlocked ||
      monster.level !== starter.level ||
      monster.xp !== starter.xp ||
      monster.maxXp !== starter.maxXp ||
      monster.attack !== starter.attack ||
      monster.defense !== starter.defense ||
      monster.speed !== starter.speed ||
      monster.hp !== starter.hp
    );
  });
}

function hasCombatProgress(stats: PlayerState['combatStats'] | undefined): boolean {
  if (!stats) {
    return false;
  }
  return (
    (stats.criticalWins ?? 0) > 0 ||
    (stats.overdrivesUsed ?? 0) > 0 ||
    (stats.itemsUsed ?? 0) > 0 ||
    (stats.flawlessWins ?? 0) > 0 ||
    (stats.gauntletBestWave ?? 0) > 0
  );
}

function rarityWeight(rarity: MonsterRarity): number {
  const weights: Record<MonsterRarity, number> = {
    Common: 4,
    Rare: 3,
    Epic: 2,
    Legendary: 1,
  };

  return weights[rarity];
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64Decode(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function formatSaveTimestamp(savedAt: string | null): string {
  if (!savedAt) {
    return 'Starter sync';
  }

  const timestamp = new Date(savedAt);
  if (Number.isNaN(timestamp.getTime())) {
    return 'Pending sync';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}
