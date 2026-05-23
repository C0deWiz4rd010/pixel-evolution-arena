import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonsterRarity, MonsterStage, MonsterType } from '../../models/monster.model';
import { MonsterCardComponent } from '../monster-card/monster-card.component';
import { GameStateService } from '../../services/game-state.service';

type StatusFilter = 'All' | 'Unlocked' | 'Locked';

@Component({
  selector: 'app-collection',
  imports: [FormsModule, MonsterCardComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss',
})
export class CollectionComponent {
  readonly game = inject(GameStateService);

  readonly stageFilter = signal<MonsterStage | 'All'>('All');
  readonly typeFilter = signal<MonsterType | 'All'>('All');
  readonly rarityFilter = signal<MonsterRarity | 'All'>('All');
  readonly statusFilter = signal<StatusFilter>('All');

  readonly filteredMonsters = computed(() =>
    this.game.monsters().filter((monster) => {
      const stageMatch = this.stageFilter() === 'All' || monster.stage === this.stageFilter();
      const typeMatch = this.typeFilter() === 'All' || monster.type === this.typeFilter();
      const rarityMatch = this.rarityFilter() === 'All' || monster.rarity === this.rarityFilter();
      const statusMatch =
        this.statusFilter() === 'All' ||
        (this.statusFilter() === 'Unlocked' && monster.unlocked) ||
        (this.statusFilter() === 'Locked' && !monster.unlocked);
      return stageMatch && typeMatch && rarityMatch && statusMatch;
    }),
  );

  resetFilters(): void {
    this.stageFilter.set('All');
    this.typeFilter.set('All');
    this.rarityFilter.set('All');
    this.statusFilter.set('All');
  }
}
