import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Monster } from '../../models/monster.model';
import { GameStateService } from '../../services/game-state.service';
import { MonsterTrainingDrill } from '../../rules/training.rules';
import { MASTERY_MOVE_THRESHOLD, SIGNATURE_GOAL } from '../../rules/battle-mastery.rules';
import { RequirementStatus } from '../../rules/evolution.rules';
import { stageClass } from '../../rules/stage.rules';

interface TrainingPlan {
  status: string;
  title: string;
  detail: string;
  tone: 'ready' | 'train' | 'squad' | 'endpoint' | 'locked';
}

interface EvolutionTargetView {
  target: Monster;
  ready: boolean;
  revealed: boolean;
  tracked: boolean;
  powerDeltaLabel: string;
  requirements: RequirementStatus[];
  actionLabel: string;
}

interface DrillView {
  drill: MonsterTrainingDrill;
  ready: boolean;
}

interface MonsterDetailView {
  monster: Monster;
  stageClass: string;
  revealed: boolean;
  xpPercent: number;
  mastery: { battleXp: number; signatureProgress: number; unlockedMoves: string[]; goalLabel: string; percent: number } | null;
  addToSquadReason: string | null;
  plan: TrainingPlan;
  targets: EvolutionTargetView[];
  drills: DrillView[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-monster-detail',
  templateUrl: './monster-detail.component.html',
  styleUrl: './monster-detail.component.scss',
})
export class MonsterDetailComponent {
  readonly monster = input<Monster | null>(null);
  readonly familyUnlocked = input(0);
  readonly familyTotal = input(0);
  readonly game = inject(GameStateService);
  readonly masteryMoveThreshold = MASTERY_MOVE_THRESHOLD;
  readonly signatureGoal = SIGNATURE_GOAL;

  /** Everything the template renders, derived once per state change instead of per check. */
  readonly view = computed<MonsterDetailView | null>(() => {
    const monster = this.monster();
    if (!monster) return null;
    const revealLocked = this.game.revealLocked();
    const pinnedId = this.game.pinnedChaseId();
    const sourcePower = this.game.getMonsterPower(monster);
    const targets = this.game.getEvolutionTargets(monster).map((target): EvolutionTargetView => {
      const ready = this.game.canEvolve(monster, target);
      return {
        target,
        ready,
        revealed: target.unlocked || revealLocked,
        tracked: pinnedId === target.id,
        powerDeltaLabel: formatPowerDelta(this.game.getMonsterPower(target) - sourcePower),
        requirements: this.game.getRequirementStatuses(monster, target),
        actionLabel: target.unlocked ? 'Discovered' : ready ? `Evolve ${target.name}` : 'Requirements Missing',
      };
    });
    const mastery = this.game.monsterMastery(monster.id);
    return {
      monster,
      stageClass: stageClass(monster.stage),
      revealed: monster.unlocked || revealLocked,
      xpPercent: monster.maxXp > 0 ? (monster.xp / monster.maxXp) * 100 : 0,
      mastery: monster.unlocked
        ? {
            battleXp: mastery.battleXp,
            signatureProgress: mastery.signatureProgress,
            unlockedMoves: mastery.unlockedMoves,
            goalLabel: this.game.masteryGoal(monster).label,
            percent: Math.min(100, Math.round((mastery.battleXp / MASTERY_MOVE_THRESHOLD) * 100)),
          }
        : null,
      addToSquadReason: this.addToSquadReason(monster),
      plan: this.trainingPlan(monster, targets),
      targets,
      drills: monster.unlocked
        ? this.game.getMonsterTrainingDrills(monster).map((drill) => ({ drill, ready: this.game.canAffordCoins(drill.costCoins) }))
        : [],
    };
  });

  requirementMarker(met: boolean): string {
    return met ? 'OK' : 'MISS';
  }

  runTrainingDrill(monster: Monster, drill: MonsterTrainingDrill): void {
    this.game.runMonsterTraining(monster.id, drill.id);
  }

  private addToSquadReason(monster: Monster): string | null {
    const squadIds = this.game.player().squadIds;
    if (!monster.unlocked) return 'Unlock this signal before adding it to the squad.';
    if (squadIds.includes(monster.id)) return 'Already assigned to the squad.';
    if (squadIds.length >= 3) return 'Squad is full. Remove a member to add this form.';
    return null;
  }

  private trainingPlan(monster: Monster, targets: EvolutionTargetView[]): TrainingPlan {
    if (!monster.unlocked) {
      return {
        status: 'LOCKED',
        title: 'Trace the source line',
        detail: 'Pin this target from Collection or inspect its source form to reveal requirements.',
        tone: 'locked',
      };
    }

    const readyTarget = targets.find((entry) => entry.ready && !entry.target.unlocked);
    if (readyTarget) {
      return {
        status: 'READY',
        title: `${readyTarget.target.name} route is open`,
        detail: `Evolve now for ${readyTarget.powerDeltaLabel} and a stronger ${readyTarget.target.stage} signal.`,
        tone: 'ready',
      };
    }

    const nextTarget = targets.find((entry) => !entry.target.unlocked);
    if (nextTarget) {
      const first = nextTarget.requirements.find((status) => !status.met);
      return {
        status: 'TRAIN',
        title: `${nextTarget.target.name} is the next route`,
        detail: first
          ? `Missing ${first.label}: ${first.current}/${first.required}. Arena rewards feed XP, coins, DNA, and items.`
          : 'Keep battling to build margin before evolving.',
        tone: 'train',
      };
    }

    const squadIds = this.game.player().squadIds;
    if (!squadIds.includes(monster.id) && squadIds.length < 3) {
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

function formatPowerDelta(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta} PW`;
}
