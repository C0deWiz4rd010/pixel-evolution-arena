import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { GearDef, GearInstance, GearSlot, GEAR_SLOTS } from '../../models/gear.model';
import { describeGearBonus, forgeCost, gearInstanceBonus, getGearDef } from '../../rules/gear.rules';
import { Monster } from '../../models/monster.model';
import { TranslatePipe } from '../../i18n/translate.pipe';

const SLOT_LABEL: Record<GearSlot, string> = {
  core: 'Core',
  plate: 'Plate',
  drive: 'Drive',
  relic: 'Relic',
};

interface ForgeDiagnosticCard {
  label: string;
  value: string;
  detail: string;
  tone: 'ready' | 'warning' | 'info';
}

@Component({
  selector: 'app-forge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forge.component.html',
  styleUrl: './forge.component.scss',
})
export class ForgeComponent {
  readonly game = inject(GameStateService);

  readonly slots = GEAR_SLOTS;
  readonly slotLabel = SLOT_LABEL;
  readonly defs = this.game.gearDefs;
  readonly owned = this.game.ownedGearDetailed;
  readonly loadoutPlan = this.game.squadLoadoutPlan;
  readonly quickRecommendation = this.game.forgeQuickRecommendation;

  readonly selectedMonsterId = signal<string | null>(null);

  readonly squad = this.game.squad;

  readonly selectedMonster = computed<Monster | null>(() => {
    const id = this.selectedMonsterId() ?? this.squad()[0]?.id ?? null;
    return id ? this.game.getMonsterById(id) ?? null : null;
  });

  describeBonus(bonus: ReturnType<typeof gearInstanceBonus>): string {
    return describeGearBonus(bonus);
  }

  forgeCostFor(def: GearDef): { coins: number; dnaShards: number } {
    return forgeCost(def, 0);
  }

  upgradeCostFor(instance: GearInstance): { coins: number; dnaShards: number } | null {
    const def = getGearDef(instance.defId);
    if (!def || instance.tier >= 5) {
      return null;
    }
    return forgeCost(def, instance.tier);
  }

  canForge(def: GearDef): boolean {
    const cost = this.forgeCostFor(def);
    return this.game.player().coins >= cost.coins && this.game.player().dnaShards >= cost.dnaShards;
  }

  canUpgrade(instance: GearInstance): boolean {
    const cost = this.upgradeCostFor(instance);
    return !!cost && this.game.player().coins >= cost.coins && this.game.player().dnaShards >= cost.dnaShards;
  }

  selectMonster(id: string): void {
    this.selectedMonsterId.set(id);
  }

  equippedFor(slot: GearSlot) {
    const monster = this.selectedMonster();
    return monster ? this.game.getEquippedGear(monster.id, slot) : null;
  }

  ownedForSlot(slot: GearSlot) {
    return this.owned().filter((entry) => entry.def.slot === slot);
  }

  isEquippedHere(instanceId: string, slot: GearSlot): boolean {
    return this.equippedFor(slot)?.instance.instanceId === instanceId;
  }

  forge(def: GearDef): void {
    this.game.forgeGear(def.id);
  }

  upgrade(instance: GearInstance): void {
    this.game.upgradeGear(instance.instanceId);
  }

  equip(instanceId: string): void {
    const monster = this.selectedMonster();
    if (monster) {
      this.game.equipGear(monster.id, instanceId);
    }
  }

  unequip(slot: GearSlot): void {
    const monster = this.selectedMonster();
    if (monster) {
      this.game.unequipGear(monster.id, slot);
    }
  }

  autoEquip(): void {
    this.game.autoEquipBestGear();
  }

  runQuickAction(): void {
    this.game.runForgeQuickAction();
  }

  /** Base vs. geared stat line for the selected monster. */
  readonly statComparison = computed(() => {
    const monster = this.selectedMonster();
    if (!monster) {
      return null;
    }
    const geared = this.game.getEffectiveMonster(monster);
    return {
      base: monster,
      geared,
      power: this.game.getMonsterPower(geared),
      basePower: this.game.getMonsterPower(monster),
    };
  });
  readonly diagnostics = computed<ForgeDiagnosticCard[]>(() => {
    const plan = this.loadoutPlan();
    const quick = this.quickRecommendation();
    const cmp = this.statComparison();
    const intel = this.game.battleIntelSummary();

    return [
      {
        label: 'Coverage',
        value: `${plan.assignedSlots}/${plan.totalSlots}`,
        detail: `Current shell can cover ${plan.coveragePercent}% of squad gear lanes.`,
        tone: plan.coveragePercent >= 75 ? 'ready' : 'warning',
      },
      {
        label: 'Power Delta',
        value: cmp ? `+${cmp.power - cmp.basePower} PWR` : '+0 PWR',
        detail: cmp ? `${cmp.geared.name} after loadout is ${cmp.power} total power.` : 'Select a squad unit to inspect slot impact.',
        tone: cmp && cmp.power > cmp.basePower ? 'ready' : 'info',
      },
      {
        label: 'Next Pressure',
        value: quick.metric,
        detail: quick.detail,
        tone: quick.kind === 'blocked' ? 'warning' : quick.kind === 'open' ? 'info' : 'ready',
      },
      {
        label: 'Battle Trend',
        value: intel.total > 0 ? `${intel.winRate}% ${intel.trend}` : 'No intel',
        detail: intel.total > 0 ? intel.trendLabel : 'Arena results will tell you whether the current shell is holding.',
        tone: intel.trend === 'cold' ? 'warning' : intel.trend === 'hot' ? 'ready' : 'info',
      },
    ];
  });
}
