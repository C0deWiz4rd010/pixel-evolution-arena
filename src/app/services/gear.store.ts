import { computed, inject, Injectable } from '@angular/core';
import { GEAR_DEFS } from '../data/gear.data';
import { GearSlot } from '../models/gear.model';
import { Monster } from '../models/monster.model';
import { applyGearToMonster, canAfford, clampTier, forgeCost, gearInstanceBonus, getGearDef, getGearInstance } from '../rules/gear.rules';
import { buildSquadLoadoutPlan, ForgeQuickRecommendation, recommendForgeQuickAction, SquadLoadoutPlan } from '../rules/operations.rules';
import { cloneGearLoadout } from './game-state.helpers';
import { GameStore } from './game-store.service';
import { AudioService } from './audio.service';
import { ToastService } from './toast.service';

/** Gear forge, locker and loadouts, plus the gear-adjusted squad used for power and battle. */
@Injectable({ providedIn: 'root' })
export class GearStore {
  private readonly store = inject(GameStore);

  private readonly audio = inject(AudioService);
  private readonly toast = inject(ToastService);

  readonly gearDefs = GEAR_DEFS;

  /** Squad with gear + prismatic bonuses folded in — used for battle and power. */
  readonly effectiveSquad = computed(() => {
    const player = this.store.player();
    return this.store.squad().map((monster) => applyGearToMonster(monster, player.gearLoadout, player.ownedGear));
  });

  /** Owned gear with resolved definition + tier bonus, for the Forge UI. */
  readonly ownedGearDetailed = computed(() =>
    this.store.player().ownedGear.map((instance) => ({
      instance,
      def: getGearDef(instance.defId)!,
      bonus: gearInstanceBonus(instance),
    })).filter((entry) => entry.def),
  );

  readonly squadLoadoutPlan = computed<SquadLoadoutPlan>(() =>
    buildSquadLoadoutPlan(this.store.squad(), this.store.player().ownedGear, this.store.player().gearLoadout),
  );

  readonly forgeQuickRecommendation = computed<ForgeQuickRecommendation>(() =>
    recommendForgeQuickAction({
      squad: this.store.squad(),
      ownedGear: this.store.player().ownedGear,
      currentLoadout: this.store.player().gearLoadout,
      coins: this.store.player().coins,
      dnaShards: this.store.player().dnaShards,
    }),
  );

  getEffectiveMonster(monster: Monster): Monster {
    const player = this.store.player();
    return applyGearToMonster(monster, player.gearLoadout, player.ownedGear);
  }

  getEquippedGear(monsterId: string, slot: GearSlot) {
    const instanceId = this.store.player().gearLoadout[monsterId]?.[slot];
    const instance = getGearInstance(this.store.player().ownedGear, instanceId);
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
    if (!canAfford(cost, this.store.player().coins, this.store.player().dnaShards)) {
      this.toast.push({ title: 'Forge Blocked', message: `${def.name} needs ${cost.coins} CR + ${cost.dnaShards} DNA.`, tone: 'warn', icon: '!', durationMs: 3200 });
      return;
    }
    const instance = { instanceId: `gear-${Date.now()}-${Math.floor(Math.random() * 1000)}`, defId, tier: 1 };
    this.store.player.update((player) => ({
      ...player,
      coins: player.coins - cost.coins,
      dnaShards: player.dnaShards - cost.dnaShards,
      ownedGear: [...player.ownedGear, instance],
    }));
    this.audio.play('forge');
    this.toast.push({ title: 'Gear Forged', message: `${def.name} (T1) added to your gear locker.`, tone: 'info', icon: def.icon, durationMs: 3400 });
  }

  upgradeGear(instanceId: string): void {
    const instance = getGearInstance(this.store.player().ownedGear, instanceId);
    const def = instance ? getGearDef(instance.defId) : null;
    if (!instance || !def) {
      return;
    }
    if (instance.tier >= 5) {
      this.toast.push({ title: 'Max Tier', message: `${def.name} is already at the maximum tier.`, tone: 'warn', icon: '!', durationMs: 2800 });
      return;
    }
    const cost = forgeCost(def, instance.tier);
    if (!canAfford(cost, this.store.player().coins, this.store.player().dnaShards)) {
      this.toast.push({ title: 'Upgrade Blocked', message: `Needs ${cost.coins} CR + ${cost.dnaShards} DNA.`, tone: 'warn', icon: '!', durationMs: 3200 });
      return;
    }
    this.store.player.update((player) => ({
      ...player,
      coins: player.coins - cost.coins,
      dnaShards: player.dnaShards - cost.dnaShards,
      ownedGear: player.ownedGear.map((entry) => (entry.instanceId === instanceId ? { ...entry, tier: clampTier(entry.tier + 1) } : entry)),
    }));
    this.audio.play('forge');
    this.toast.push({ title: 'Gear Upgraded', message: `${def.name} reached tier ${instance.tier + 1}.`, tone: 'reward', icon: def.icon, durationMs: 3200 });
  }

  equipGear(monsterId: string, instanceId: string): void {
    const instance = getGearInstance(this.store.player().ownedGear, instanceId);
    const def = instance ? getGearDef(instance.defId) : null;
    if (!instance || !def) {
      return;
    }
    this.store.player.update((player) => {
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
  }

  unequipGear(monsterId: string, slot: GearSlot): void {
    this.store.player.update((player) => {
      const loadout = cloneGearLoadout(player.gearLoadout);
      if (loadout[monsterId]) {
        delete loadout[monsterId][slot];
      }
      return { ...player, gearLoadout: loadout };
    });
  }

  autoEquipBestGear(): boolean {
    const squad = this.store.squad();
    if (squad.length === 0) {
      this.toast.push({ title: 'Squad Required', message: 'Load a squad before auto-equipping gear.', tone: 'warn', icon: '!', durationMs: 3200 });
      return false;
    }

    const plan = this.squadLoadoutPlan();
    if (plan.assignedSlots === 0) {
      this.toast.push({ title: 'No Gear Ready', message: 'Forge or claim gear first so the squad has something to equip.', tone: 'warn', icon: '!', durationMs: 3400 });
      return false;
    }

    if (plan.assignedSlots === plan.currentEquippedSlots && plan.powerGain <= 0) {
      this.toast.push({ title: 'Loadout Stable', message: 'The squad is already carrying the best available gear set.', tone: 'info', icon: 'OK', durationMs: 3200 });
      return false;
    }

    const nextLoadout = cloneGearLoadout(this.store.player().gearLoadout);
    const squadIds = new Set(squad.map((monster) => monster.id));
    const usedByPlan = new Set<string>();
    for (const slots of Object.values(plan.loadout)) {
      for (const slot of Object.keys(slots) as GearSlot[]) {
        const instanceId = slots[slot];
        if (instanceId) {
          usedByPlan.add(instanceId);
        }
      }
    }

    for (const [monsterId, slots] of Object.entries(nextLoadout)) {
      for (const slot of Object.keys(slots) as GearSlot[]) {
        if (usedByPlan.has(slots[slot]!)) {
          delete nextLoadout[monsterId][slot];
        }
      }
      if (squadIds.has(monsterId)) {
        delete nextLoadout[monsterId];
      }
    }

    for (const monster of squad) {
      if (plan.loadout[monster.id]) {
        nextLoadout[monster.id] = { ...plan.loadout[monster.id] };
      }
    }

    this.store.player.update((player) => ({ ...player, gearLoadout: nextLoadout }));
    this.audio.play('forge');
    this.toast.push({
      title: 'Loadout Synced',
      message: `Auto-equipped ${plan.assignedSlots}/${plan.totalSlots} slots. Projected team power +${plan.powerGain}.`,
      tone: 'success',
      icon: 'GE',
      durationMs: 3800,
    });
    return true;
  }

  runForgeQuickAction(): boolean {
    const recommendation = this.forgeQuickRecommendation();
    switch (recommendation.kind) {
      case 'equip':
        return this.autoEquipBestGear();
      case 'forge':
        if (recommendation.defId) {
          this.forgeGear(recommendation.defId);
          return true;
        }
        return false;
      case 'upgrade':
        if (recommendation.instanceId) {
          this.upgradeGear(recommendation.instanceId);
          return true;
        }
        return false;
      default:
        return false;
    }
  }
}
