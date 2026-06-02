import { Component, computed, inject, signal } from '@angular/core';
import { Monster, MonsterType } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';
import { getSlotRole, SlotRoleDescriptor } from '../../rules/squad.rules';

interface SquadSlotView {
  index: number;
  role: SlotRoleDescriptor;
  monster: Monster | null;
}

interface CoverageView {
  type: MonsterType;
  count: number;
  covered: boolean;
}

interface NextActionView {
  title: string;
  message: string;
  tone: 'add' | 'remove' | 'battle' | 'unlock';
}

@Component({
  selector: 'app-squad',
  templateUrl: './squad.component.html',
  styleUrl: './squad.component.scss',
})
export class SquadComponent {
  readonly game = inject(GameStateService);

  readonly squadSlots = computed<SquadSlotView[]>(() => {
    const squad = this.game.squad();
    return [0, 1, 2].map((index) => ({
      index,
      role: getSlotRole(index),
      monster: squad[index] ?? null,
    }));
  });

  readonly presetDraftName = signal('');
  readonly presets = computed(() => this.game.player().squadPresets);

  readonly slotsFilled = computed(() => this.game.squad().length);
  readonly emptySlots = computed(() => 3 - this.slotsFilled());

  readonly coverageItems = computed<CoverageView[]>(() =>
    this.game.types.map((type) => {
      const count = this.typeCount(type);
      return { type, count, covered: count > 0 };
    }),
  );

  readonly missingTypes = computed(() => this.coverageItems().filter((item) => !item.covered).map((item) => item.type));
  readonly coveredTypeCount = computed(() => this.coverageItems().filter((item) => item.covered).length);
  readonly coveragePercent = computed(() => Math.round((this.coveredTypeCount() / this.game.types.length) * 100));

  readonly weakestMember = computed(() =>
    this.game.squad().reduce<Monster | null>((weakest, monster) => {
      if (!weakest) {
        return monster;
      }

      return this.power(monster) < this.power(weakest) ? monster : weakest;
    }, null),
  );

  readonly strongestMember = computed(() =>
    this.game.squad().reduce<Monster | null>((strongest, monster) => {
      if (!strongest) {
        return monster;
      }

      return this.power(monster) > this.power(strongest) ? monster : strongest;
    }, null),
  );

  readonly candidates = computed(() => {
    const squadIds = new Set(this.game.player().squadIds);

    return this.game
      .monsters()
      .filter((monster) => monster.unlocked && !squadIds.has(monster.id))
      .sort((a, b) => this.candidateScore(b) - this.candidateScore(a));
  });

  readonly recommendedCandidate = computed(() => this.candidates()[0] ?? null);
  readonly recommendedCandidateId = computed(() => this.recommendedCandidate()?.id ?? '');

  readonly powerDelta = computed(() => this.game.teamPower() - this.game.enemyPower());
  readonly powerMatchPercent = computed(() => {
    const enemyPower = this.game.enemyPower();
    if (enemyPower <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((this.game.teamPower() / enemyPower) * 100));
  });

  readonly powerDeltaLabel = computed(() => {
    const delta = this.powerDelta();
    if (delta === 0) {
      return 'Even with enemy grid';
    }

    return `${delta > 0 ? '+' : ''}${delta} PW ${delta > 0 ? 'ahead' : 'behind'}`;
  });

  readonly powerStatus = computed(() => {
    if (this.powerDelta() >= 0) {
      return 'ahead';
    }

    if (this.powerMatchPercent() >= 75) {
      return 'near';
    }

    return 'behind';
  });

  readonly synergySignals = this.game.squadSynergies;
  readonly battleEdge = this.game.squadTypePressure;
  readonly dangerForecast = this.game.upcomingArenaThreat;
  readonly activeFormation = this.game.activeFormation;
  readonly arenaDirective = this.game.arenaDirective;

  readonly nextAction = computed<NextActionView>(() => {
    const candidate = this.recommendedCandidate();
    const weakest = this.weakestMember();
    const missingTypes = this.missingTypes();

    if (this.slotsFilled() === 0) {
      return candidate
        ? {
            title: 'Slot grid offline',
            message: `Add ${candidate.name} to light up Slot 01 and start ${candidate.type} coverage.`,
            tone: 'add',
          }
        : {
            title: 'No unlocked reserve',
            message: 'Unlock a creature in the Evolution Tree before loading the squad.',
            tone: 'unlock',
          };
    }

    if (this.slotsFilled() < 3) {
      return candidate
        ? {
            title: `${this.emptySlots()} ${this.emptySlots() === 1 ? 'slot' : 'slots'} open`,
            message: `Add ${candidate.name} next: ${this.candidateCue(candidate)}.`,
            tone: 'add',
          }
        : {
            title: 'Reserve empty',
            message: 'Battle and evolve to reveal more unlocked squad options.',
            tone: 'unlock',
          };
    }

    if (candidate && weakest && this.power(candidate) > this.power(weakest)) {
      const gain = this.power(candidate) - this.power(weakest);
      return {
        title: 'Upgrade route found',
        message: `Remove ${weakest.name}, then add ${candidate.name} for +${gain} PW.`,
        tone: 'remove',
      };
    }

    if (missingTypes.length > 0) {
      return {
        title: 'Coverage gap',
        message: `No open slot. Evolve or unlock ${missingTypes[0]} coverage before the next rebuild.`,
        tone: 'unlock',
      };
    }

    return {
      title: 'Squad ready',
      message: 'All slots are online. Start arena battles for XP, coins, DNA, and item drops.',
      tone: 'battle',
    };
  });

  recommendation(): string {
    return this.nextAction().message;
  }

  typeCount(type: MonsterType): number {
    return this.game.squad().filter((monster) => monster.type === type).length;
  }

  power(monster: Monster): number {
    return this.game.getMonsterPower(monster);
  }

  candidateCue(monster: Monster): string {
    if (this.missingTypes().includes(monster.type)) {
      return `adds ${monster.type} coverage`;
    }

    const weakest = this.weakestMember();
    if (weakest && this.slotsFilled() >= 3) {
      const gain = this.power(monster) - this.power(weakest);
      return gain > 0 ? `beats ${weakest.name} by ${gain} PW` : 'reserve signal only';
    }

    return `${this.power(monster)} PW reserve power`;
  }

  addRecommended(): void {
    const candidate = this.recommendedCandidate();
    if (!candidate) {
      return;
    }

    this.addOrSwapCandidate(candidate);
  }

  addOrSwapCandidate(candidate: Monster): void {
    if (this.slotsFilled() < 3) {
      this.game.addToSquad(candidate.id);
      return;
    }

    const weakest = this.weakestMember();
    if (weakest && this.power(candidate) > this.power(weakest)) {
      this.game.replaceSquadMember(weakest.id, candidate.id);
    }
  }

  canSwapCandidate(candidate: Monster): boolean {
    const weakest = this.weakestMember();
    return this.slotsFilled() >= 3 && Boolean(weakest && this.power(candidate) > this.power(weakest));
  }

  candidateActionLabel(candidate: Monster): string {
    if (this.slotsFilled() < 3) {
      return this.candidateCue(candidate);
    }

    if (this.canSwapCandidate(candidate)) {
      const weakest = this.weakestMember();
      const gain = weakest ? this.power(candidate) - this.power(weakest) : 0;
      return `Swap weakest +${gain} PW`;
    }

    return 'No power gain';
  }

  removeWeakest(): void {
    const weakest = this.weakestMember();
    if (!weakest) {
      return;
    }

    this.game.removeFromSquad(weakest.id);
  }

  replaceRecommended(): void {
    const candidate = this.recommendedCandidate();
    const weakest = this.weakestMember();
    if (!candidate || !weakest || this.power(candidate) <= this.power(weakest)) {
      return;
    }

    this.game.replaceSquadMember(weakest.id, candidate.id);
  }

  formatModifier(value: number): string {
    return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
  }

  onPresetDraftChange(name: string): void {
    this.presetDraftName.set(name);
  }

  savePreset(): void {
    const name = this.presetDraftName().trim();
    if (!name) {
      return;
    }

    const saved = this.game.saveSquadPreset(name);
    if (saved) {
      this.presetDraftName.set('');
    }
  }

  loadPreset(id: string): void {
    this.game.loadSquadPreset(id);
  }

  deletePreset(id: string): void {
    this.game.deleteSquadPreset(id);
  }

  private candidateScore(monster: Monster): number {
    const missingCoverageBonus = this.missingTypes().includes(monster.type) ? 1000 : 0;
    const openSlotBonus = this.slotsFilled() < 3 ? 220 : 0;
    const weakest = this.weakestMember();
    const upgradeBonus = weakest ? Math.max(0, this.power(monster) - this.power(weakest)) * 3 : 0;

    return this.power(monster) + missingCoverageBonus + openSlotBonus + upgradeBonus;
  }
}
