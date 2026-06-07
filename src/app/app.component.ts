import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { ArenaComponent } from './components/arena/arena.component';
import { ArenaEffectsComponent } from './components/arena-effects/arena-effects.component';
import { CollectionComponent } from './components/collection/collection.component';
import { EvolutionTreeComponent } from './components/evolution-tree/evolution-tree.component';
import { HandbookComponent } from './components/handbook/handbook.component';
import { HeaderHudComponent } from './components/header-hud/header-hud.component';
import { MedalsComponent } from './components/medals/medals.component';
import { SquadComponent } from './components/squad/squad.component';
import { ForgeComponent } from './components/forge/forge.component';
import { CampaignComponent } from './components/campaign/campaign.component';
import { ExpeditionComponent } from './components/expedition/expedition.component';
import { SettingsComponent } from './components/settings/settings.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { TabNavigationComponent } from './components/tab-navigation/tab-navigation.component';
import { ToastStackComponent } from './components/toast-stack/toast-stack.component';
import { TranslatePipe } from './i18n/translate.pipe';
import { BattleAnimationService } from './services/battle-animation.service';
import { GameSectionName, GameStateService, OperationsCard } from './services/game-state.service';

const TAB_ORDER: GameSectionName[] = [
  'Evolution Tree',
  'Squad',
  'Forge',
  'Arena',
  'Expedition',
  'Collection',
  'Campaign',
  'Medals',
  'Handbook',
  'Settings',
];

interface IntelStripCard {
  label: string;
  title: string;
  detail: string;
  metric: string;
  tone: 'combat' | 'campaign' | 'expedition';
}

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
    TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameStateService);
  private readonly battleAnimation = inject(BattleAnimationService);

  readonly activeTab = signal<GameSectionName>('Evolution Tree');
  readonly canStartQuickBattle = computed(() => this.game.squad().length > 0 && !this.battleAnimation.isPlaying());
  readonly intelCards = computed<IntelStripCard[]>(() => {
    const battleIntel = this.game.battleIntelSummary();
    const nextChapter = this.game.nextCampaignEntry();
    const expedition = this.game.expedition();

    return [
      {
        label: 'Combat Intel',
        title: battleIntel.trend === 'empty' ? 'No battle history yet' : `${battleIntel.winRate}% win rate / ${battleIntel.trend.toUpperCase()}`,
        detail: battleIntel.trendLabel,
        metric: battleIntel.total > 0 ? `${battleIntel.averageCoins} CR avg / ${battleIntel.averageXp} XP avg` : 'Run Arena to seed intel',
        tone: 'combat',
      },
      {
        label: 'Campaign Pressure',
        title: this.game.claimableChapter()
          ? `${this.game.claimableChapter()!.title} ready to claim`
          : nextChapter
            ? nextChapter.chapter.title
            : 'Campaign synced',
        detail: this.game.claimableChapter()
          ? this.game.claimableChapter()!.reward.lore
          : nextChapter
            ? `${nextChapter.chapter.objective.label} (${nextChapter.current}/${nextChapter.goal})`
            : 'All visible chapters are complete.',
        metric: this.game.activeBoss() ? this.game.activeBoss()!.name : `${this.game.player().claimedChapters.length}/${this.game.campaignChapters.length} claimed`,
        tone: 'campaign',
      },
      {
        label: 'Expedition Relay',
        title: !expedition
          ? this.game.squad().length === 0
            ? 'Squad required for launch'
            : 'Relay launch available'
          : expedition.status === 'active'
            ? `Depth ${expedition.depth}/7 live`
            : 'Core payout ready',
        detail: !expedition
          ? this.game.squad().length === 0
            ? 'Load more signals before taking a side-run into the deep grid.'
            : 'Current squad can bank cores through a short roguelite push.'
          : expedition.lastEvent ?? 'Deep grid telemetry is stable.',
        metric: !expedition ? `${this.game.expeditionCores()} banked` : expedition.status === 'active' ? `HP ${expedition.hp}/${expedition.maxHp}` : `${expedition.rewardCores} run cores`,
        tone: 'expedition',
      },
    ];
  });

  /** Screen-reader announcement for the latest battle outcome. */
  readonly liveAnnouncement = computed(() => {
    const reward = this.game.lastReward();
    if (!reward) {
      return '';
    }
    const result = reward.won ? 'Victory' : 'Retreat';
    return `${result}. ${reward.coins} coins, ${reward.dnaShards} DNA, ${reward.xp} XP.`;
  });

  constructor() {
    // Reflect presentation settings onto <html> so global CSS can theme + adapt.
    effect(() => {
      const settings = this.game.settings();
      if (typeof document === 'undefined') {
        return;
      }
      const root = document.documentElement;
      root.dataset['accent'] = settings.accentTheme;
      root.dataset['colorblind'] = settings.colorblindMode ? 'on' : 'off';
      root.dataset['reducedFx'] = settings.effectIntensity < 0.5 ? 'on' : 'off';
      root.lang = settings.language;
    });

    effect(() => {
      const requested = this.game.requestedTab();
      if (!requested || requested === this.activeTab()) {
        if (requested) {
          this.game.clearRequestedTab();
        }
        return;
      }
      this.setActiveTab(requested);
      this.game.clearRequestedTab();
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab as GameSectionName);
    globalThis.requestAnimationFrame(() => globalThis.scrollTo({ top: 0, behavior: 'auto' }));
  }

  autoBuildSquad(): void {
    this.game.autoBuildBestSquad();
    this.setActiveTab('Squad');
  }

  evolveReadyCandidate(): void {
    if (this.game.evolveReadyCandidate()) {
      this.setActiveTab('Evolution Tree');
    }
  }

  runBattleNow(): void {
    if (!this.canStartQuickBattle()) {
      return;
    }

    this.setActiveTab('Arena');
    this.game.startBattle();
  }

  runOperationsCard(card: OperationsCard): void {
    switch (card.id) {
      case 'chase':
        if (this.game.readyEvolutionCandidate()) {
          this.evolveReadyCandidate();
          return;
        }
        this.setActiveTab(card.tab);
        return;
      case 'forge':
        if (card.tab === 'Squad') {
          this.setActiveTab('Squad');
          return;
        }
        this.setActiveTab('Forge');
        this.game.runForgeQuickAction();
        return;
      case 'campaign':
        this.setActiveTab('Campaign');
        this.game.claimReadyChapter();
        return;
      case 'expedition': {
        const expedition = this.game.expedition();
        if (!expedition) {
          if (this.game.squad().length === 0) {
            this.setActiveTab('Squad');
            return;
          }
          this.setActiveTab('Expedition');
          this.game.startExpedition();
          return;
        }
        this.setActiveTab('Expedition');
        if (expedition.status !== 'active') {
          this.game.claimExpedition();
        }
        return;
      }
    }
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

    if (event.key >= '1' && event.key <= '9') {
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
