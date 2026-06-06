import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { STATUS_DEFS } from '../../rules/status.rules';
import { getTypeMatchupValue } from '../../rules/type-matchup.rules';
import { TYPE_TRAITS } from '../../data/traits.data';
import { ARENA_FORMATIONS } from '../../data/enemies.data';
import { MonsterType } from '../../models/monster.model';

@Component({
  selector: 'app-stats-codex',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-codex.component.html',
  styleUrl: './stats-codex.component.scss',
})
export class StatsCodexComponent {
  readonly game = inject(GameStateService);

  readonly statusGlossary = Object.values(STATUS_DEFS);
  readonly types = this.game.types;
  readonly traitGlossary = this.types.map((type) => ({ type, trait: TYPE_TRAITS[type] }));

  readonly lifetimeStats = computed(() => {
    const player = this.game.player();
    const winRate = player.battlesFought > 0 ? Math.round((player.battlesWon / player.battlesFought) * 100) : 0;
    return [
      { label: 'Battles Fought', value: `${player.battlesFought}` },
      { label: 'Battles Won', value: `${player.battlesWon}` },
      { label: 'Win Rate', value: `${winRate}%` },
      { label: 'Best Win Streak', value: `${player.bestWinStreak}` },
      { label: 'Critical Wins', value: `${player.combatStats.criticalWins}` },
      { label: 'Flawless Wins', value: `${player.combatStats.flawlessWins}` },
      { label: 'Overdrives Used', value: `${player.combatStats.overdrivesUsed}` },
      { label: 'Items Used', value: `${player.combatStats.itemsUsed}` },
      { label: 'Best Gauntlet Wave', value: `${player.combatStats.gauntletBestWave}` },
      { label: 'Prismatic Variants', value: `${this.game.prismaticCount()}` },
      { label: 'Bosses Defeated', value: `${player.defeatedBosses.length}/${this.game.bosses.length}` },
      { label: 'Creatures Unlocked', value: `${this.game.unlockedCount()}/${this.game.monsters().length}` },
    ];
  });

  /** Type chart: attacker rows vs. defender columns, value -1/0/1. */
  readonly typeChart = computed(() =>
    this.types.map((attacker) => ({
      attacker,
      cells: this.types.map((defender) => ({ defender, value: getTypeMatchupValue(attacker, defender) })),
    })),
  );

  readonly bestiary = computed(() => {
    const seen = new Set(this.game.player().encounteredEnemies);
    const unique = new Map<string, { id: string; name: string; type: MonsterType; spriteUrl?: string; icon: string; discovered: boolean }>();
    for (const formation of ARENA_FORMATIONS) {
      for (const enemy of formation.enemies) {
        const key = enemy.id ?? enemy.name;
        if (!unique.has(key)) {
          unique.set(key, {
            id: key,
            name: enemy.name,
            type: enemy.type,
            spriteUrl: enemy.spriteUrl,
            icon: enemy.icon,
            discovered: seen.has(key),
          });
        }
      }
    }
    return Array.from(unique.values());
  });

  readonly bestiaryCount = computed(() => {
    const list = this.bestiary();
    return { found: list.filter((entry) => entry.discovered).length, total: list.length };
  });

  cellClass(value: number): string {
    return value > 0 ? 'strong' : value < 0 ? 'weak' : 'neutral';
  }

  cellGlyph(value: number): string {
    return value > 0 ? '▲' : value < 0 ? '▼' : '·';
  }

  typeCode(type: MonsterType): string {
    return type.slice(0, 3).toUpperCase();
  }
}
