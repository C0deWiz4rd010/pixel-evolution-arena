import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommandCenterCard } from '../../rules/command-center.rules';
import { GameStateService } from '../../services/game-state.service';
import { AudioService } from '../../services/audio.service';
import { AccentTheme, LanguageCode, TypographyProfile, VisualStyle } from '../../models/player-state.model';

type SettingsCategory = 'gameplay' | 'audio' | 'accessibility' | 'appearance' | 'save';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly game = inject(GameStateService);
  readonly audio = inject(AudioService);

  readonly settings = this.game.settings;
  readonly activeCategory = signal<SettingsCategory>('gameplay');
  readonly categories: readonly { id: SettingsCategory; label: string; glyph: string }[] = [
    { id: 'gameplay', label: 'Gameplay', glyph: 'VS' },
    { id: 'audio', label: 'Audio', glyph: 'AU' },
    { id: 'accessibility', label: 'Accessibility', glyph: 'AC' },
    { id: 'appearance', label: 'Appearance', glyph: 'UI' },
    { id: 'save', label: 'Save Data', glyph: 'SV' },
  ];
  readonly systemCheckCards = this.game.systemCheckCards;
  readonly accentThemes: { id: AccentTheme; label: string }[] = [
    { id: 'aurora', label: 'Aurora' },
    { id: 'ember', label: 'Ember' },
    { id: 'mono', label: 'Mono' },
  ];
  readonly languages: { id: LanguageCode; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'de', label: 'Deutsch' },
  ];
  readonly visualStyles: { id: VisualStyle; label: string; detail: string }[] = [
    { id: 'collector-tech', label: 'Collector Tech', detail: 'Balanced cards and focused collection accents.' },
    { id: 'pixel-arcade', label: 'Pixel Arcade', detail: 'Tighter cards, hard pixels, and stronger grid energy.' },
    { id: 'tactical-minimal', label: 'Tactical Minimal', detail: 'Airy cards, quiet borders, and almost no glow.' },
  ];
  readonly typographyProfiles: { id: TypographyProfile; label: string }[] = [
    { id: 'dual-font', label: 'Dual Font' },
    { id: 'pixel', label: 'Pixel' },
    { id: 'tech-sans', label: 'Tech Sans' },
  ];

  setAccent(theme: AccentTheme): void {
    this.game.setAccentTheme(theme);
  }

  setLanguage(language: LanguageCode): void {
    this.game.setLanguage(language);
  }

  setVisualStyle(style: VisualStyle): void {
    this.game.setVisualStyle(style);
  }

  setTypographyProfile(profile: TypographyProfile): void {
    this.game.setTypographyProfile(profile);
  }

  toggleCombatBeats(): void {
    this.game.toggleCombatBeats();
  }
  readonly volumePercent = computed(() => Math.round(this.settings().masterVolume * 100));
  readonly intensityPercent = computed(() => Math.round(this.settings().effectIntensity * 100));

  readonly exportCode = signal<string>('');
  readonly importCode = signal<string>('');
  readonly confirmingReset = signal(false);
  readonly copied = signal(false);
  readonly profileSignal = computed(() => ({
    title: `${this.settings().visualStyle.toUpperCase()} / ${this.settings().typographyProfile.toUpperCase()}`,
    detail: `${this.audio.enabled() ? 'Audio' : 'Silent'} / ${this.settings().combatBeats ? 'Beats' : 'No Beats'} / ${this.settings().colorblindMode ? 'Glyph Assist' : 'Default Grid'}`,
  }));

  runCard(card: CommandCenterCard): void {
    this.game.runMetaAction(card.actionId);
  }

  onVolumeInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.game.setMasterVolume(value / 100);
    if (!this.audio.enabled()) {
      this.game.toggleAudio();
    }
    this.audio.play('menu');
  }

  onIntensityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.game.setEffectIntensity(value / 100);
  }

  toggleAudio(): void {
    this.game.toggleAudio();
  }

  toggleMusic(): void {
    if (!this.audio.enabled()) this.game.toggleAudio();
    this.game.setMusicEnabled(!this.audio.musicEnabled());
  }

  toggleColorblind(): void {
    this.game.toggleColorblindMode();
  }

  generateExport(): void {
    this.exportCode.set(this.game.exportSave());
    this.copied.set(false);
  }

  async copyExport(): Promise<void> {
    const code = this.exportCode() || this.game.exportSave();
    this.exportCode.set(code);
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  applyImport(): void {
    const code = this.importCode().trim();
    if (!code) {
      return;
    }
    if (this.game.importSave(code)) {
      this.importCode.set('');
    }
  }

  requestReset(): void {
    this.confirmingReset.set(true);
  }

  cancelReset(): void {
    this.confirmingReset.set(false);
  }

  confirmReset(): void {
    this.game.resetProgress();
    this.confirmingReset.set(false);
  }

  setCategory(category: SettingsCategory): void {
    this.activeCategory.set(category);
  }

  setBattleControlMode(mode: 'director' | 'assist' | 'auto'): void {
    this.game.setBattleControlMode(mode);
  }

  setBattleSpeed(speed: 1 | 2 | 4): void {
    this.game.setBattleSpeed(speed);
  }

  toggleBattleRecommendations(): void {
    this.game.toggleBattleRecommendations();
  }

  setMotionMode(mode: 'system' | 'reduced'): void {
    this.game.setMotionMode(mode);
  }

  resetCategory(): void {
    switch (this.activeCategory()) {
      case 'gameplay':
        this.game.setBattleControlMode('director');
        this.game.setBattleSpeed(1);
        if (!this.settings().battleRecommendations) this.game.toggleBattleRecommendations();
        if (this.settings().combatBeats) this.game.toggleCombatBeats();
        break;
      case 'audio':
        this.game.setMasterVolume(0.7);
        this.game.setMusicEnabled(false);
        break;
      case 'accessibility':
        if (this.settings().colorblindMode) this.game.toggleColorblindMode();
        this.game.setEffectIntensity(1);
        this.game.setMotionMode('system');
        break;
      case 'appearance':
        this.game.setVisualStyle('collector-tech');
        this.game.setTypographyProfile('dual-font');
        this.game.setAccentTheme('aurora');
        this.game.setLanguage('en');
        break;
      default:
        break;
    }
  }
}
