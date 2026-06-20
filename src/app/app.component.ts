import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { ArenaComponent } from './components/arena/arena.component';
import { ArenaEffectsComponent } from './components/arena-effects/arena-effects.component';
import { CampaignComponent } from './components/campaign/campaign.component';
import { CollectionComponent } from './components/collection/collection.component';
import { EvolutionTreeComponent } from './components/evolution-tree/evolution-tree.component';
import { ExpeditionComponent } from './components/expedition/expedition.component';
import { ForgeComponent } from './components/forge/forge.component';
import { HandbookComponent } from './components/handbook/handbook.component';
import { HeaderHudComponent } from './components/header-hud/header-hud.component';
import { MedalsComponent } from './components/medals/medals.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SquadComponent } from './components/squad/squad.component';
import { PrimarySection, TabNavigationComponent } from './components/tab-navigation/tab-navigation.component';
import { ToastStackComponent } from './components/toast-stack/toast-stack.component';
import { BattleAnimationService } from './services/battle-animation.service';
import { GameSectionName, GameStateService } from './services/game-state.service';

const SECTION_ORDER: PrimarySection[] = ['Evolve', 'Squad', 'Battle', 'Explore', 'Archive'];
const SECTION_VIEWS: Record<PrimarySection, readonly GameSectionName[]> = {
  Evolve: ['Evolution Tree'],
  Squad: ['Squad', 'Forge'],
  Battle: ['Arena', 'Campaign'],
  Explore: ['Expedition'],
  Archive: ['Collection', 'Medals', 'Handbook'],
};

const VIEW_LABELS: Partial<Record<GameSectionName, string>> = {
  'Evolution Tree': 'Path',
  Squad: 'Formation',
  Forge: 'Loadout',
  Arena: 'Arena',
  Campaign: 'Campaign',
  Expedition: 'Expedition',
  Collection: 'Collection',
  Medals: 'Achievements',
  Handbook: 'Guide',
};

@Component({
  selector: 'app-root',
  imports: [
    ArenaEffectsComponent,
    HeaderHudComponent,
    TabNavigationComponent,
    EvolutionTreeComponent,
    SquadComponent,
    ForgeComponent,
    ArenaComponent,
    ExpeditionComponent,
    CollectionComponent,
    CampaignComponent,
    MedalsComponent,
    HandbookComponent,
    SettingsComponent,
    OnboardingComponent,
    ToastStackComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameStateService);
  private readonly battleAnimation = inject(BattleAnimationService);

  readonly activeSection = signal<PrimarySection>('Evolve');
  readonly activeView = signal<GameSectionName>('Evolution Tree');
  readonly secondaryViews = computed(() => SECTION_VIEWS[this.activeSection()]);
  readonly viewLabel = (view: GameSectionName) => VIEW_LABELS[view] ?? view;

  readonly liveAnnouncement = computed(() => {
    const reward = this.game.lastReward();
    if (!reward) return '';
    return `${reward.won ? 'Victory' : 'Retreat'}. ${reward.coins} coins, ${reward.dnaShards} DNA, ${reward.xp} XP.`;
  });

  constructor() {
    effect(() => {
      const settings = this.game.settings();
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      root.dataset['accent'] = settings.accentTheme;
      root.dataset['colorblind'] = settings.colorblindMode ? 'on' : 'off';
      root.dataset['reducedFx'] = settings.effectIntensity < 0.5 ? 'on' : 'off';
      root.lang = settings.language;
    });

    effect(() => {
      const requested = this.game.requestedTab();
      if (!requested) return;
      this.openView(requested);
      this.game.clearRequestedTab();
    });
  }

  openSection(section: PrimarySection): void {
    this.activeSection.set(section);
    this.openView(SECTION_VIEWS[section][0]);
  }

  openView(view: string): void {
    const legacyView = view as GameSectionName;
    this.activeView.set(legacyView);
    const section = this.sectionForView(legacyView);
    if (section) this.activeSection.set(section);
    globalThis.requestAnimationFrame(() => document.querySelector<HTMLElement>('.play-surface')?.scrollTo({ top: 0 }));
  }

  followNextGoal(): void {
    this.openView(this.game.nextCommand().tab);
  }

  private sectionForView(view: GameSectionName): PrimarySection | null {
    for (const section of SECTION_ORDER) {
      if (SECTION_VIEWS[section].includes(view)) return section;
    }
    return null;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;

    if (event.key >= '1' && event.key <= '5') {
      event.preventDefault();
      this.openSection(SECTION_ORDER[Number.parseInt(event.key, 10) - 1]);
      return;
    }

    if ((event.key === ' ' || event.key === 'Enter') && this.activeView() === 'Arena') {
      if (this.battleAnimation.isPlaying() || this.game.squad().length === 0) return;
      event.preventDefault();
      this.game.startBattle();
    }
  }
}
