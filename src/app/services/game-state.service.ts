import { computed, Injectable, signal } from '@angular/core';
import { ARENA_FORMATIONS } from '../data/enemies.data';
import { MONSTERS, STAGES, TYPES } from '../data/monsters.data';
import { ArenaFormation, BattleLog, BattleReward, EnemyMonster } from '../models/battle.model';
import { Monster, MonsterRarity, MonsterStage, MonsterType } from '../models/monster.model';
import { PlayerState } from '../models/player-state.model';
import { ArenaThreatProfile, buildBattleLogs, calculateEnemyBattleModifier, resolveBattle, shouldAwardItem } from '../rules/battle.rules';
import { applyEvolutionToPlayer, canEvolve, getRequirementStatuses, RequirementStatus, unlockEvolutionTarget } from '../rules/evolution.rules';
import { calculateSquadBattleModifier, evaluateSquadSynergies, getMonsterPower } from '../rules/squad.rules';
import { evaluateTypePressure } from '../rules/type-matchup.rules';
import { applyXpToSquad } from '../rules/xp.rules';

export interface ArenaRunDirective {
  title: string;
  objective: string;
  rewardFocus: string;
  tacticalHint: string;
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly stages = STAGES;
  readonly types = TYPES;
  readonly rarities: MonsterRarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
  readonly arenaFormations = ARENA_FORMATIONS;
  readonly inventoryItems = ['Armor Core', 'Shadow Gem', 'Solar Crest', 'Ancient Gear'];

  readonly monsters = signal<Monster[]>(MONSTERS.map((monster) => ({ ...monster, evolutionTargets: [...monster.evolutionTargets] })));

  readonly player = signal<PlayerState>({
    coins: 1200,
    dnaShards: 45,
    battlesFought: 0,
    battlesWon: 0,
    selectedMonsterId: 'M007',
    squadIds: ['M007', 'M008'],
    inventory: ['Shadow Gem', 'Ancient Gear'],
  });

  readonly battleLogs = signal<BattleLog[]>([
    { text: 'Digital arena online. Build your squad and start a battle.', type: 'system' },
    { text: 'Tip: Aquabun can evolve early if you spend starter resources.', type: 'info' },
  ]);

  readonly lastReward = signal<BattleReward | null>(null);
  readonly lastBattleThreat = signal<ArenaThreatProfile | null>(null);

  readonly selectedMonster = computed(() => {
    const selectedId = this.player().selectedMonsterId;
    return this.monsters().find((monster) => monster.id === selectedId) ?? this.monsters().find((monster) => monster.unlocked) ?? null;
  });

  readonly squad = computed(() => this.player().squadIds.map((id) => this.getMonsterById(id)).filter((monster): monster is Monster => Boolean(monster)));

  readonly teamPower = computed(() => this.squad().reduce((total, monster) => total + getMonsterPower(monster), 0));

  readonly unlockedCount = computed(() => this.monsters().filter((monster) => monster.unlocked).length);

  readonly lockedCount = computed(() => this.monsters().length - this.unlockedCount());

  readonly activeFormation = computed(() => this.getArenaFormation(this.player().battlesFought + 1));

  readonly enemyPower = computed(() => this.enemies.reduce((total, enemy) => total + getMonsterPower(enemy), 0));

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

  readonly squadTypePressure = computed(() => evaluateTypePressure(this.squad().map((monster) => monster.type), this.enemies.map((enemy) => enemy.type)));

  readonly enemyTypePressure = computed(() => evaluateTypePressure(this.enemies.map((enemy) => enemy.type), this.squad().map((monster) => monster.type), true));

  readonly squadBattleModifier = computed(() => calculateSquadBattleModifier(this.squadSynergies(), this.squadTypePressure().modifier));

  readonly enemyBattleModifier = computed(() =>
    calculateEnemyBattleModifier(this.activeFormation().enemyModifier + this.upcomingArenaThreat().enemyModifier, this.enemyTypePressure().modifier),
  );

  get enemies(): EnemyMonster[] {
    return this.activeFormation().enemies;
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
  }

  removeFromSquad(id: string): void {
    this.player.update((player) => ({ ...player, squadIds: player.squadIds.filter((squadId) => squadId !== id) }));
  }

  clearSquad(): void {
    this.player.update((player) => ({ ...player, squadIds: [] }));
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
  }

  startBattle(): void {
    const squad = this.squad();
    if (squad.length === 0) {
      this.lastReward.set(null);
      this.lastBattleThreat.set(null);
      this.prependLog('Add at least one monster to your squad.', 'system');
      return;
    }

    const formation = this.activeFormation();
    const threat = this.upcomingArenaThreat();
    const battle = resolveBattle({
      teamPower: this.teamPower(),
      enemyPower: this.enemyPower(),
      playerModifier: this.squadBattleModifier(),
      enemyModifier: this.enemyBattleModifier(),
      rewardMultiplier: formation.rewardModifier * threat.rewardModifier,
      randomBetween: (min, max) => this.randomBetween(min, max),
    });
    const logs = buildBattleLogs({
      squad,
      enemies: this.enemies,
      reward: battle.reward,
      formation,
      threat,
      playerRoll: battle.playerRoll,
      enemyRoll: battle.enemyRoll,
      synergyLead: this.squadSynergies()[0] ?? null,
      typePressure: this.squadTypePressure(),
      randomFrom: <T>(items: T[]) => this.randomFrom(items),
      randomBetween: (min, max) => this.randomBetween(min, max),
    });
    const xpResult = applyXpToSquad(this.monsters(), this.player().squadIds, battle.reward.xp);
    this.monsters.set(xpResult.updatedMonsters);

    const itemChance = Math.min(0.65, 0.25 + formation.itemBonus + threat.itemBonus);
    const item = shouldAwardItem(battle.won, itemChance, Math.random()) ? this.randomItem() : undefined;

    if (item) {
      battle.reward.item = item;
    }

    this.player.update((player) => ({
      ...player,
      coins: player.coins + battle.reward.coins,
      dnaShards: player.dnaShards + battle.reward.dnaShards,
      battlesFought: player.battlesFought + 1,
      battlesWon: player.battlesWon + (battle.won ? 1 : 0),
      inventory: item ? [...player.inventory, item] : player.inventory,
    }));

    this.lastReward.set(battle.reward);
    this.lastBattleThreat.set(threat);
    this.battleLogs.set([...logs, ...xpResult.logs, ...(item ? [{ text: `Item found: ${item}.`, type: 'reward' as const }] : []), ...this.battleLogs()].slice(0, 36));
  }

  getStageCount(stage: MonsterStage): number {
    return this.monsters().filter((monster) => monster.stage === stage).length;
  }

  getTypeCount(type: MonsterType): number {
    return this.monsters().filter((monster) => monster.type === type).length;
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
  }

  private randomItem(): string {
    return this.randomFrom(this.inventoryItems);
  }

  private randomFrom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
