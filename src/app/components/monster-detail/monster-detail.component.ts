import { Component, inject, Input } from '@angular/core';
import { Monster } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';
import { MonsterTrainingDrill } from '../../rules/training.rules';
import { MASTERY_MOVE_THRESHOLD, SIGNATURE_GOAL } from '../../rules/battle-mastery.rules';

interface TrainingPlan {
  status: string;
  title: string;
  detail: string;
  tone: 'ready' | 'train' | 'squad' | 'endpoint' | 'locked';
}

@Component({
  selector: 'app-monster-detail',
  templateUrl: './monster-detail.component.html',
  styleUrl: './monster-detail.component.scss',
})
export class MonsterDetailComponent {
  @Input() monster: Monster | null = null;
  @Input() familyUnlocked = 0;
  @Input() familyTotal = 0;
  readonly game = inject(GameStateService);
  readonly masteryMoveThreshold = MASTERY_MOVE_THRESHOLD;
  readonly signatureGoal = SIGNATURE_GOAL;

  masteryPercent(monsterId: string): number {
    return Math.min(100, Math.round((this.game.monsterMastery(monsterId).battleXp / MASTERY_MOVE_THRESHOLD) * 100));
  }

  stageClass(monster: Monster): string {
    return this.game.stageClass(monster.stage);
  }

  addToSquadReason(monster: Monster): string | null {
    const player = this.game.player();

    if (!monster.unlocked) {
      return 'Unlock this signal before adding it to the squad.';
    }

    if (player.squadIds.includes(monster.id)) {
      return 'Already assigned to the squad.';
    }

    if (player.squadIds.length >= 3) {
      return 'Squad is full. Remove a member to add this form.';
    }

    return null;
  }

  requirementMarker(met: boolean): string {
    return met ? 'OK' : 'MISS';
  }

  powerDelta(source: Monster, target: Monster): number {
    return this.game.getMonsterPower(target) - this.game.getMonsterPower(source);
  }

  powerDeltaLabel(source: Monster, target: Monster): string {
    const delta = this.powerDelta(source, target);
    return `${delta >= 0 ? '+' : ''}${delta} PW`;
  }

  monsterTrainingDrills(monster: Monster): MonsterTrainingDrill[] {
    return this.game.getMonsterTrainingDrills(monster);
  }

  canRunTrainingDrill(drill: MonsterTrainingDrill, monster: Monster): boolean {
    return monster.unlocked && this.game.canAffordCoins(drill.costCoins);
  }

  runTrainingDrill(monster: Monster, drill: MonsterTrainingDrill): void {
    this.game.runMonsterTraining(monster.id, drill.id);
  }

  primaryLockedTarget(monster: Monster): Monster | null {
    return this.game.getEvolutionTargets(monster).find((target) => !target.unlocked) ?? null;
  }

  squadCalibrationReady(): boolean {
    const drill = this.game.squadTrainingDrill();
    return this.game.squad().length > 0 && this.game.canAffordCoins(drill.costCoins);
  }

  trainingPlan(monster: Monster): TrainingPlan {
    if (!monster.unlocked) {
      return {
        status: 'LOCKED',
        title: 'Trace the source line',
        detail: 'Pin this target from Collection or inspect its source form to reveal requirements.',
        tone: 'locked',
      };
    }

    const targets = this.game.getEvolutionTargets(monster);
    const readyTarget = targets.find((target) => this.game.canEvolve(monster, target) && !target.unlocked);
    if (readyTarget) {
      return {
        status: 'READY',
        title: `${readyTarget.name} route is open`,
        detail: `Evolve now for ${this.powerDeltaLabel(monster, readyTarget)} and a stronger ${readyTarget.stage} signal.`,
        tone: 'ready',
      };
    }

    const nextTarget = targets.find((target) => !target.unlocked);
    if (nextTarget) {
      const missing = this.game.getRequirementStatuses(monster, nextTarget).filter((status) => !status.met);
      const first = missing[0];

      return {
        status: 'TRAIN',
        title: `${nextTarget.name} is the next route`,
        detail: first
          ? `Missing ${first.label}: ${first.current}/${first.required}. Arena rewards feed XP, coins, DNA, and items.`
          : 'Keep battling to build margin before evolving.',
        tone: 'train',
      };
    }

    if (!this.game.player().squadIds.includes(monster.id) && this.game.player().squadIds.length < 3) {
      return {
        status: 'SQUAD',
        title: 'Use this signal in battle',
        detail: 'Add it to the squad to turn its stats into XP, coins, DNA, and overdrive charge.',
        tone: 'squad',
      };
    }

    return {
      status: 'ENDPOINT',
      title: 'Current endpoint online',
      detail: 'Keep it in the squad for battles, or switch branches to chase another locked form.',
      tone: 'endpoint',
    };
  }
}
