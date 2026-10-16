import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { GearDef, GearInstance, GearSlot, GEAR_SLOTS } from '../../models/gear.model';
import { describeGearBonus, forgeCost, getGearDef } from '../../rules/gear.rules';
import { Monster } from '../../models/monster.model';
import { CreaturePortraitComponent } from '../creature-portrait/creature-portrait.component';

const SLOT_LABEL: Record<GearSlot, string> = {
  core: 'Core',
  plate: 'Plate',
  drive: 'Drive',
  relic: 'Relic',
};

@Component({
  selector: 'app-forge',
  standalone: true,
  imports: [CreaturePortraitComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forge.component.html',
  styleUrl: './forge.component.scss',
})
export class ForgeComponent {
  readonly game = inject(GameStateService);

  readonly slots = GEAR_SLOTS;
  readonly slotLabel = SLOT_LABEL;
  readonly defs = this.game.gear.gearDefs;
  readonly owned = this.game.gear.ownedGearDetailed;
  readonly loadoutPlan = this.game.gear.squadLoadoutPlan;
  readonly quickRecommendation = this.game.gear.forgeQuickRecommendation;

  readonly selectedMonsterId = signal<string | null>(null);

  readonly squad = this.game.squad;

  readonly selectedMonster = computed<Monster | null>(() => {
    const id = this.selectedMonsterId() ?? this.squad()[0]?.id ?? null;
    return id ? this.game.getMonsterById(id) ?? null : null;
  });

  /** Blueprint cards with cost and affordability resolved once per wallet change. */
  readonly blueprints = computed(() => {
    const { coins, dnaShards } = this.game.player();
    return this.defs.map((def) => {
      const cost = forgeCost(def, 0);
      return { def, cost, bonusLabel: describeGearBonus(def.base), affordable: coins >= cost.coins && dnaShards >= cost.dnaShards };
    });
  });

  /** Per-slot view for the selected monster: equipped item plus every matching owned item. */
  readonly slotViews = computed(() => {
    const monster = this.selectedMonster();
    const owned = this.owned();
    return this.slots.map((slot) => {
      const equipped = monster ? this.game.gear.getEquippedGear(monster.id, slot) : null;
      return {
        slot,
        equipped,
        equippedBonusLabel: equipped ? describeGearBonus(equipped.bonus) : '',
        options: owned
          .filter((entry) => entry.def.slot === slot)
          .map((entry) => ({ entry, active: equipped?.instance.instanceId === entry.instance.instanceId })),
      };
    });
  });

  readonly lockerViews = computed(() => {
    const { coins, dnaShards } = this.game.player();
    return this.owned().map((entry) => {
      const upgradeCost = this.upgradeCostFor(entry.instance);
      return {
        entry,
        bonusLabel: describeGearBonus(entry.bonus),
        upgradeCost,
        canUpgrade: !!upgradeCost && coins >= upgradeCost.coins && dnaShards >= upgradeCost.dnaShards,
      };
    });
  });

  private upgradeCostFor(instance: GearInstance): { coins: number; dnaShards: number } | null {
    const def = getGearDef(instance.defId);
    if (!def || instance.tier >= 5) {
      return null;
    }
    return forgeCost(def, instance.tier);
  }

  selectMonster(id: string): void {
    this.selectedMonsterId.set(id);
  }

  forge(def: GearDef): void {
    this.game.gear.forgeGear(def.id);
  }

  upgrade(instance: GearInstance): void {
    this.game.gear.upgradeGear(instance.instanceId);
  }

  equip(instanceId: string): void {
    const monster = this.selectedMonster();
    if (monster) {
      this.game.gear.equipGear(monster.id, instanceId);
    }
  }

  unequip(slot: GearSlot): void {
    const monster = this.selectedMonster();
    if (monster) {
      this.game.gear.unequipGear(monster.id, slot);
    }
  }

  autoEquip(): void {
    this.game.gear.autoEquipBestGear();
  }

  runQuickAction(): void {
    this.game.gear.runForgeQuickAction();
  }

  /** Base vs. geared stat line for the selected monster. */
  readonly statComparison = computed(() => {
    const monster = this.selectedMonster();
    if (!monster) {
      return null;
    }
    const geared = this.game.gear.getEffectiveMonster(monster);
    return {
      base: monster,
      geared,
      power: this.game.getMonsterPower(geared),
      basePower: this.game.getMonsterPower(monster),
    };
  });
}
