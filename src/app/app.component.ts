import { Component, HostListener, inject, signal } from '@angular/core';
import { ArenaComponent } from './components/arena/arena.component';
import { ArenaEffectsComponent } from './components/arena-effects/arena-effects.component';
import { CollectionComponent } from './components/collection/collection.component';
import { EvolutionTreeComponent } from './components/evolution-tree/evolution-tree.component';
import { HandbookComponent } from './components/handbook/handbook.component';
import { HeaderHudComponent } from './components/header-hud/header-hud.component';
import { MedalsComponent } from './components/medals/medals.component';
import { SquadComponent } from './components/squad/squad.component';
import { TabNavigationComponent } from './components/tab-navigation/tab-navigation.component';
import { ToastStackComponent } from './components/toast-stack/toast-stack.component';
import { BattleAnimationService } from './services/battle-animation.service';
import { GameStateService } from './services/game-state.service';

type AppTab = 'Evolution Tree' | 'Squad' | 'Arena' | 'Collection' | 'Medals' | 'Handbook';

const TAB_ORDER: AppTab[] = ['Evolution Tree', 'Squad', 'Arena', 'Collection', 'Medals', 'Handbook'];

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
    MedalsComponent,
    HandbookComponent,
    ToastStackComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameStateService);
  private readonly battleAnimation = inject(BattleAnimationService);

  readonly activeTab = signal<AppTab>('Evolution Tree');

  setActiveTab(tab: string): void {
    this.activeTab.set(tab as AppTab);
    globalThis.requestAnimationFrame(() => globalThis.scrollTo({ top: 0, behavior: 'auto' }));
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const focusedElement = event.target as HTMLElement | null;
    if (focusedElement) {
      const tag = focusedElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || focusedElement.isContentEditable) {
        return;
      }
    }

    if (event.key >= '1' && event.key <= '6') {
      const index = Number.parseInt(event.key, 10) - 1;
      const tab = TAB_ORDER[index];
      if (tab) {
        event.preventDefault();
        this.setActiveTab(tab);
      }
      return;
    }

    if ((event.key === ' ' || event.key === 'Enter') && this.activeTab() === 'Arena') {
      if (this.battleAnimation.isPlaying() || this.game.squad().length === 0) {
        return;
      }
      event.preventDefault();
      this.game.startBattle();
    }
  }
}
