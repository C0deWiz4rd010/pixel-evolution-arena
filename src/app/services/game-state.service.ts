import { computed, Injectable, signal } from '@angular/core';
import { ENEMIES } from '../data/enemies.data';
import { MONSTERS, STAGES, TYPES } from '../data/monsters.data';
import { BattleLog, BattleReward, EnemyMonster } from '../models/battle.model';
import { EvolutionRequirements, Monster, MonsterRarity, MonsterStage, MonsterType } from '../models/monster.model';
import { PlayerState } from '../models/player-state.model';

interface RequirementStatus {
  label: string;
  met: boolean;
  current: string | number;
  required: string | number;
}

export interface TeamSynergy {
  id: string;
  label: string;
  detail: string;
  modifier: number;
}

export interface TypePressureSummary {
  label: string;
  detail: string;
  strongCount: number;
  riskCount: number;
  modifier: number;
}

export interface ArenaThreatProfile {
  id: 'standard' | 'volatile' | 'hazard' | 'boss';
  label: string;
  detail: string;
  enemyModifier: number;
  rewardModifier: number;
  itemBonus: number;
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly stages = STAGES;
  readonly types = TYPES;
  readonly rarities: MonsterRarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
  readonly enemies: EnemyMonster[] = ENEMIES;
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

  readonly teamPower = computed(() => this.squad().reduce((total, monster) => total + this.getMonsterPower(monster), 0));

  readonly unlockedCount = computed(() => this.monsters().filter((monster) => monster.unlocked).length);

  readonly lockedCount = computed(() => this.monsters().length - this.unlockedCount());

  readonly enemyPower = computed(() => this.enemies.reduce((total, enemy) => total + enemy.attack + enemy.defense + enemy.speed + enemy.hp, 0));

  readonly upcomingArenaThreat = computed(() => this.getArenaThreatProfile(this.player().battlesFought + 1));

  readonly squadSynergies = computed(() => this.evaluateSquadSynergies(this.squad()));

  readonly squadTypePressure = computed(() => this.evaluateTypePressure(this.squad().map((monster) => monster.type), this.enemies.map((enemy) => enemy.type)));

  readonly enemyTypePressure = computed(() => this.evaluateTypePressure(this.enemies.map((enemy) => enemy.type), this.squad().map((monster) => monster.type), true));

  readonly squadBattleModifier = computed(() =>
    this.clampModifier(this.squadSynergies().reduce((total, synergy) => total + synergy.modifier, 0) + this.squadTypePressure().modifier, -0.18, 0.22),
  );

  readonly enemyBattleModifier = computed(() =>
    this.clampModifier(this.upcomingArenaThreat().enemyModifier + this.enemyTypePressure().modifier, -0.12, 0.24),
  );

  getMonsterPower(monster: Monster): number {
    return monster.attack + monster.defense + monster.speed + monster.hp;
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
    const requirements = target.requirements ?? {};
    const inventory = this.player().inventory;
    const statuses: RequirementStatus[] = [];

    if (requirements.level !== undefined) {
      statuses.push({ label: 'Monster Level', met: source.level >= requirements.level, current: source.level, required: requirements.level });
    }

    if (requirements.coins !== undefined) {
      statuses.push({ label: 'Coins', met: this.player().coins >= requirements.coins, current: this.player().coins, required: requirements.coins });
    }

    if (requirements.dnaShards !== undefined) {
      statuses.push({ label: 'DNA Shards', met: this.player().dnaShards >= requirements.dnaShards, current: this.player().dnaShards, required: requirements.dnaShards });
    }

    if (requirements.item !== undefined) {
      const count = inventory.filter((item) => item === requirements.item).length;
      statuses.push({ label: requirements.item, met: count > 0, current: count, required: 1 });
    }

    return statuses;
  }

  canEvolve(source: Monster, target: Monster): boolean {
    return source.unlocked && !target.unlocked && this.getRequirementStatuses(source, target).every((status) => status.met);
  }

  evolve(sourceId: string, targetId: string): void {
    const source = this.getMonsterById(sourceId);
    const target = this.getMonsterById(targetId);
    if (!source || !target || !this.canEvolve(source, target)) {
      this.prependLog('Evolution requirements are not met yet.', 'system');
      return;
    }

    const requirements: EvolutionRequirements = target.requirements ?? {};

    this.player.update((player) => {
      const inventory = requirements.item ? this.consumeOne(player.inventory, requirements.item) : player.inventory;
      return {
        ...player,
        coins: player.coins - (requirements.coins ?? 0),
        dnaShards: player.dnaShards - (requirements.dnaShards ?? 0),
        selectedMonsterId: target.id,
        inventory,
      };
    });

    this.monsters.update((monsters) =>
      monsters.map((monster) =>
        monster.id === target.id
          ? { ...monster, unlocked: true, level: Math.max(1, source.level - 2), xp: 0 }
          : monster,
      ),
    );

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

    const threat = this.upcomingArenaThreat();
    const playerModifier = this.squadBattleModifier();
    const enemyModifier = this.clampModifier(threat.enemyModifier + this.enemyTypePressure().modifier, -0.12, 0.24);
    const playerRoll = this.teamPower() * (1 + playerModifier) * this.randomBetween(0.88, 1.14);
    const enemyRoll = this.enemyPower() * (1 + enemyModifier) * this.randomBetween(0.88, 1.14);
    const won = playerRoll >= enemyRoll;
    const rewardScale = won ? threat.rewardModifier : 0.9 + (threat.rewardModifier - 1) * 0.55;
    const reward: BattleReward = won
      ? {
          won,
          coins: Math.round(120 * rewardScale),
          dnaShards: Math.max(3, Math.round(8 * rewardScale)),
          xp: Math.max(24, Math.round(35 * rewardScale)),
        }
      : {
          won,
          coins: Math.max(24, Math.round(30 * rewardScale)),
          dnaShards: Math.max(2, Math.round(2 * rewardScale)),
          xp: Math.max(10, Math.round(12 * rewardScale)),
        };

    const logs = this.generateBattleLogs(squad, won, reward, threat, playerRoll, enemyRoll);
    const levelLogs = this.addXpToSquad(reward.xp);
    const item = won && Math.random() < Math.min(0.55, 0.25 + threat.itemBonus) ? this.randomItem() : undefined;

    if (item) {
      reward.item = item;
    }

    this.player.update((player) => ({
      ...player,
      coins: player.coins + reward.coins,
      dnaShards: player.dnaShards + reward.dnaShards,
      battlesFought: player.battlesFought + 1,
      battlesWon: player.battlesWon + (won ? 1 : 0),
      inventory: item ? [...player.inventory, item] : player.inventory,
    }));

    this.lastReward.set(reward);
    this.lastBattleThreat.set(threat);
    this.battleLogs.set([...logs, ...levelLogs, ...(item ? [{ text: `Item found: ${item}.`, type: 'reward' as const }] : []), ...this.battleLogs()].slice(0, 36));
  }

  getStageCount(stage: MonsterStage): number {
    return this.monsters().filter((monster) => monster.stage === stage).length;
  }

  getTypeCount(type: MonsterType): number {
    return this.monsters().filter((monster) => monster.type === type).length;
  }

  private addXpToSquad(amount: number): BattleLog[] {
    const logs: BattleLog[] = [];
    const squadIds = new Set(this.player().squadIds);

    this.monsters.update((monsters) =>
      monsters.map((monster) => {
        if (!squadIds.has(monster.id)) {
          return monster;
        }

        let xp = monster.xp + amount;
        let maxXp = monster.maxXp;
        let level = monster.level;
        let attack = monster.attack;
        let defense = monster.defense;
        let speed = monster.speed;
        let hp = monster.hp;

        while (xp >= maxXp) {
          xp -= maxXp;
          level += 1;
          maxXp = Math.round(maxXp * 1.16);
          attack += 3;
          defense += 2;
          speed += 2;
          hp += 8;
          logs.push({ text: `${monster.name} reached level ${level}!`, type: 'reward' });
        }

        return { ...monster, xp, maxXp, level, attack, defense, speed, hp };
      }),
    );

    return logs;
  }

  private generateBattleLogs(
    squad: Monster[],
    won: boolean,
    reward: BattleReward,
    threat: ArenaThreatProfile,
    playerRoll: number,
    enemyRoll: number,
  ): BattleLog[] {
    const attackerA = this.randomFrom(squad);
    const attackerB = this.randomFrom(squad);
    const defenderA = this.randomFrom(this.enemies);
    const defenderB = this.randomFrom(this.enemies);
    const matchupA = this.getTypeMatchupValue(attackerA.type, defenderA.type);
    const matchupB = this.getTypeMatchupValue(attackerB.type, defenderB.type);
    const damageA = Math.max(12, Math.round(attackerA.attack * this.randomBetween(0.42, 0.74) * (1 + matchupA * 0.16) - defenderA.defense * 0.12));
    const damageB = Math.max(10, Math.round(attackerB.attack * this.randomBetween(0.36, 0.68) * (1 + matchupB * 0.16) - defenderB.defense * 0.1));
    const flavorA = this.typeVerb(attackerA.type);
    const flavorB = this.typeVerb(attackerB.type);
    const synergies = this.squadSynergies();
    const synergyLead = synergies[0];
    const typePressure = this.squadTypePressure();
    const rollMargin = Math.round(playerRoll - enemyRoll);

    return [
      { text: `Arena battle started // ${threat.label}.`, type: 'info' },
      ...(synergyLead ? [{ text: `${synergyLead.label} boosts allied output (${this.formatPercent(synergyLead.modifier)}).`, type: 'info' as const }] : []),
      { text: `${typePressure.label}: ${typePressure.detail}`, type: 'info' },
      { text: `${attackerA.name} uses ${flavorA} on ${defenderA.name} for ${damageA} damage.${this.matchupSuffix(matchupA, attackerA.type, defenderA.type)}`, type: 'damage' },
      { text: matchupB < 0 ? `${defenderB.name} resists the angle and pushes the line back.` : `${defenderB.name} absorbs part of the hit and counters.`, type: 'damage' },
      { text: `${attackerB.name} follows with ${flavorB} for ${damageB} damage.${this.matchupSuffix(matchupB, attackerB.type, defenderB.type)}`, type: 'damage' },
      { text: won ? `Enemy team loses momentum at ${rollMargin >= 120 ? 'full collapse' : 'the edge of the grid'}.` : 'Enemy team regains momentum and compresses the arena line.', type: 'info' },
      { text: won ? `Your squad wins the battle! (${rollMargin >= 0 ? '+' : ''}${rollMargin} sim)` : `Your squad is forced to retreat. (${rollMargin} sim)`, type: won ? 'reward' : 'system' },
      { text: `Rewards: +${reward.coins} Coins, +${reward.dnaShards} DNA Shards, +${reward.xp} XP.${threat.rewardModifier > 1 ? ` ${threat.label} boost active.` : ''}`, type: 'reward' },
    ];
  }

  private evaluateSquadSynergies(squad: Monster[]): TeamSynergy[] {
    if (squad.length === 0) {
      return [];
    }

    const typeCounts = new Map<MonsterType, number>();
    const stages = new Set<MonsterStage>();
    let totalAttack = 0;
    let totalDefense = 0;
    let totalSpeed = 0;

    for (const monster of squad) {
      typeCounts.set(monster.type, (typeCounts.get(monster.type) ?? 0) + 1);
      stages.add(monster.stage);
      totalAttack += monster.attack;
      totalDefense += monster.defense;
      totalSpeed += monster.speed;
    }

    const averageAttack = totalAttack / squad.length;
    const averageDefense = totalDefense / squad.length;
    const averageSpeed = totalSpeed / squad.length;
    const uniqueTypes = typeCounts.size;
    const duplicateTypeCount = [...typeCounts.values()].reduce((highest, count) => Math.max(highest, count), 0);
    const synergies: TeamSynergy[] = [];

    if (squad.length === 3 && uniqueTypes === squad.length) {
      synergies.push({ id: 'spectrum', label: 'Spectrum Protocol', detail: 'Three different types widen your clean-hit routes.', modifier: 0.09 });
    }

    if (duplicateTypeCount >= 2) {
      synergies.push({ id: 'mirror', label: 'Twin Pulse', detail: 'Shared typing sharpens combo timing and follow-up pressure.', modifier: 0.07 });
    }

    if (averageSpeed >= 72) {
      synergies.push({ id: 'velocity', label: 'Velocity Chain', detail: 'High speed creates first-strike tempo.', modifier: 0.05 });
    }

    if (averageDefense >= 72) {
      synergies.push({ id: 'bulwark', label: 'Bulwark Mesh', detail: 'Defensive overlap blunts incoming counter pressure.', modifier: 0.05 });
    }

    if (averageAttack >= 78) {
      synergies.push({ id: 'ruin', label: 'Ruin Drive', detail: 'Heavy attack values break enemy pacing faster.', modifier: 0.05 });
    }

    if (squad.length === 3 && stages.size >= 2) {
      synergies.push({ id: 'ladder', label: 'Ladder Sync', detail: 'Mixed stages smooth the curve between tempo and durability.', modifier: 0.04 });
    }

    return synergies;
  }

  private evaluateTypePressure(attackerTypes: MonsterType[], defenderTypes: MonsterType[], invertTone = false): TypePressureSummary {
    if (attackerTypes.length === 0 || defenderTypes.length === 0) {
      return {
        label: invertTone ? 'Enemy neutral read' : 'Neutral read',
        detail: invertTone ? 'No squad signal is active yet.' : 'No clear type edge yet.',
        strongCount: 0,
        riskCount: 0,
        modifier: 0,
      };
    }

    let strongCount = 0;
    let riskCount = 0;
    let score = 0;

    for (const attackerType of attackerTypes) {
      const matchups = defenderTypes.map((defenderType) => this.getTypeMatchupValue(attackerType, defenderType));
      const best = Math.max(...matchups);
      const worst = Math.min(...matchups);
      if (best > 0) {
        strongCount += 1;
      }
      if (worst < 0) {
        riskCount += 1;
      }
      score += best * 0.03 + worst * 0.01;
    }

    const modifier = this.clampModifier(score, -0.12, 0.12);
    if (modifier >= 0.07) {
      return {
        label: invertTone ? 'Enemy edge' : 'Type edge secured',
        detail: invertTone ? 'The enemy lineup can punish your current signals.' : `${strongCount} clean matchup lanes are open against the arena grid.`,
        strongCount,
        riskCount,
        modifier,
      };
    }

    if (modifier <= -0.03) {
      return {
        label: invertTone ? 'Enemy strain' : 'Type pressure against you',
        detail: invertTone ? `${strongCount} enemy openings are online.` : `The enemy grid can answer ${riskCount} of your active routes cleanly.`,
        strongCount,
        riskCount,
        modifier,
      };
    }

    return {
      label: invertTone ? 'Enemy neutral read' : 'Contested type grid',
      detail: invertTone ? 'The enemy lineup is reading neutral into your squad.' : 'Neither side has a clean matchup lock yet.',
      strongCount,
      riskCount,
      modifier,
    };
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

  private getTypeMatchupValue(attacker: MonsterType, defender: MonsterType): -1 | 0 | 1 {
    const strengths: Partial<Record<MonsterType, MonsterType[]>> = {
      Nature: ['Water', 'Toxic'],
      Fire: ['Nature', 'Beast'],
      Water: ['Fire', 'Machine'],
      Dark: ['Light'],
      Light: ['Dark', 'Toxic'],
      Machine: ['Beast', 'Light'],
      Beast: ['Dark', 'Machine'],
      Toxic: ['Nature', 'Water'],
    };

    const weaknesses: Partial<Record<MonsterType, MonsterType[]>> = {
      Nature: ['Fire', 'Toxic'],
      Fire: ['Water'],
      Water: ['Nature', 'Toxic'],
      Dark: ['Light', 'Beast'],
      Light: ['Machine', 'Dark'],
      Machine: ['Water', 'Beast'],
      Beast: ['Fire', 'Machine'],
      Toxic: ['Light', 'Nature'],
    };

    if (strengths[attacker]?.includes(defender)) {
      return 1;
    }

    if (weaknesses[attacker]?.includes(defender)) {
      return -1;
    }

    return 0;
  }

  private matchupSuffix(matchup: -1 | 0 | 1, attackerType: MonsterType, defenderType: MonsterType): string {
    if (matchup > 0) {
      return ` ${attackerType} pressure cracks ${defenderType} guard.`;
    }

    if (matchup < 0) {
      return ` ${defenderType} typing dulls the strike.`;
    }

    return '';
  }

  private formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
  }

  private clampModifier(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private typeVerb(type: MonsterType): string {
    const verbs: Record<MonsterType, string[]> = {
      Nature: ['Vine Lash', 'Thorn Surge'],
      Fire: ['Blaze Rush', 'Ember Fang'],
      Water: ['Aqua Slash', 'Pressure Wave'],
      Dark: ['Shadow Feint', 'Void Cut'],
      Light: ['Prism Flash', 'Solar Pulse'],
      Machine: ['Gear Burst', 'Servo Strike'],
      Beast: ['Fang Break', 'Claw Rush'],
      Toxic: ['Venom Mist', 'Ooze Shot'],
    };

    return this.randomFrom(verbs[type]);
  }

  private prependLog(text: string, type: BattleLog['type']): void {
    this.battleLogs.update((logs) => [{ text, type }, ...logs].slice(0, 36));
  }

  private consumeOne(inventory: string[], item: string): string[] {
    const index = inventory.indexOf(item);
    if (index < 0) {
      return inventory;
    }

    return inventory.filter((_, itemIndex) => itemIndex !== index);
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
