import { Component, signal } from '@angular/core';
import { ArenaComponent } from './components/arena/arena.component';
import { ArenaEffectsComponent } from './components/arena-effects/arena-effects.component';
import { CollectionComponent } from './components/collection/collection.component';
import { EvolutionTreeComponent } from './components/evolution-tree/evolution-tree.component';
import { HandbookComponent } from './components/handbook/handbook.component';
import { HeaderHudComponent } from './components/header-hud/header-hud.component';
import { SquadComponent } from './components/squad/squad.component';
import { TabNavigationComponent } from './components/tab-navigation/tab-navigation.component';

type AppTab = 'Evolution Tree' | 'Squad' | 'Arena' | 'Collection' | 'Handbook';

@Component({
  selector: 'app-root',
  imports: [
    ArenaEffectsComponent,
    HeaderHudComponent,
    TabNavigationComponent,
    EvolutionTreeComponent,
    SquadComponent,
    ArenaComponent,
    CollectionComponent,
    HandbookComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly activeTab = signal<AppTab>('Evolution Tree');

  setActiveTab(tab: string): void {
    this.activeTab.set(tab as AppTab);
  }
}
