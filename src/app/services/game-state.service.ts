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

  readonly selectedMonster = computed(() => {
    const selectedId = this.player().selectedMonsterId;
    return this.monsters().find((monster) => monster.id === selectedId) ?? this.monsters().find((monster) => monster.unlocked) ?? null;
  });

  readonly squad = computed(() => this.player().squadIds.map((id) => this.getMonsterById(id)).filter((monster): monster is Monster => Boolean(monster)));

  readonly teamPower = computed(() => this.squad().reduce((total, monster) => total + this.getMonsterPower(monster), 0));

  readonly unlockedCount = computed(() => this.monsters().filter((monster) => monster.unlocked).length);

  readonly lockedCount = computed(() => this.monsters().length - this.unlockedCount());

  readonly enemyPower = computed(() => this.enemies.reduce((total, enemy) => total + enemy.attack + enemy.defense + enemy.speed + enemy.hp, 0));

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
      this.prependLog('Add at least one monster to your squad.', 'system');
      return;
    }

    const playerRoll = this.teamPower() * this.randomBetween(0.85, 1.15);
    const enemyRoll = this.enemyPower() * this.randomBetween(0.85, 1.15);
    const won = playerRoll >= enemyRoll;
    const reward: BattleReward = won
      ? { won, coins: 120, dnaShards: 8, xp: 35 }
      : { won, coins: 30, dnaShards: 2, xp: 12 };

    const logs = this.generateBattleLogs(squad, won, reward);
    const levelLogs = this.addXpToSquad(reward.xp);
    const item = won && Math.random() < 0.25 ? this.randomItem() : undefined;

    if (item) {
      reward.item = item;
    }

    this.player.update((player) => ({
      ...player,
      coins: player.coins + reward.coins,
      dnaShards: player.dnaShards + reward.dnaShards,
      battlesWon: player.battlesWon + (won ? 1 : 0),
      inventory: item ? [...player.inventory, item] : player.inventory,
    }));

    this.lastReward.set(reward);
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

  private generateBattleLogs(squad: Monster[], won: boolean, reward: BattleReward): BattleLog[] {
    const attackerA = this.randomFrom(squad);
    const attackerB = this.randomFrom(squad);
    const defenderA = this.randomFrom(this.enemies);
    const defenderB = this.randomFrom(this.enemies);
    const damageA = Math.max(12, Math.round(attackerA.attack * this.randomBetween(0.42, 0.74) - defenderA.defense * 0.12));
    const damageB = Math.max(10, Math.round(attackerB.attack * this.randomBetween(0.36, 0.68) - defenderB.defense * 0.1));
    const flavorA = this.typeVerb(attackerA.type);
    const flavorB = this.typeVerb(attackerB.type);

    return [
      { text: 'Arena battle started.', type: 'info' },
      { text: `${attackerA.name} uses ${flavorA} on ${defenderA.name} for ${damageA} damage.`, type: 'damage' },
      { text: `${defenderB.name} absorbs part of the hit and counters.`, type: 'damage' },
      { text: `${attackerB.name} follows with ${flavorB} for ${damageB} damage.`, type: 'damage' },
      { text: won ? 'Enemy team loses momentum.' : 'Enemy team regains momentum.', type: 'info' },
      { text: won ? 'Your squad wins the battle!' : 'Your squad is forced to retreat.', type: won ? 'reward' : 'system' },
      { text: `Rewards: +${reward.coins} Coins, +${reward.dnaShards} DNA Shards, +${reward.xp} XP.`, type: 'reward' },
    ];
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
