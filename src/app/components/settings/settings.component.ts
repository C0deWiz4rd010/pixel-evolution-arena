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
    this.game.prefs.setAccentTheme(theme);
  }

  setLanguage(language: LanguageCode): void {
    this.game.prefs.setLanguage(language);
  }

  setVisualStyle(style: VisualStyle): void {
    this.game.prefs.setVisualStyle(style);
  }

  setTypographyProfile(profile: TypographyProfile): void {
    this.game.prefs.setTypographyProfile(profile);
  }

  toggleCombatBeats(): void {
    this.game.prefs.toggleCombatBeats();
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
    this.game.prefs.setMasterVolume(value / 100);
    if (!this.audio.enabled()) {
      this.game.prefs.toggleAudio();
    }
    this.audio.play('menu');
  }

  onIntensityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.game.prefs.setEffectIntensity(value / 100);
  }

  toggleAudio(): void {
    this.game.prefs.toggleAudio();
  }

  toggleMusic(): void {
    if (!this.audio.enabled()) this.game.prefs.toggleAudio();
    this.game.prefs.setMusicEnabled(!this.audio.musicEnabled());
  }

  toggleColorblind(): void {
    this.game.prefs.toggleColorblindMode();
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
    this.game.prefs.setBattleControlMode(mode);
  }

  setBattleSpeed(speed: 1 | 2 | 4): void {
    this.game.prefs.setBattleSpeed(speed);
  }

  toggleBattleRecommendations(): void {
    this.game.prefs.toggleBattleRecommendations();
  }

  setMotionMode(mode: 'system' | 'reduced'): void {
    this.game.prefs.setMotionMode(mode);
  }

  resetCategory(): void {
    switch (this.activeCategory()) {
      case 'gameplay':
        this.game.prefs.setBattleControlMode('director');
        this.game.prefs.setBattleSpeed(1);
        if (!this.settings().battleRecommendations) this.game.prefs.toggleBattleRecommendations();
        if (this.settings().combatBeats) this.game.prefs.toggleCombatBeats();
        break;
      case 'audio':
        this.game.prefs.setMasterVolume(0.7);
        this.game.prefs.setMusicEnabled(false);
        break;
      case 'accessibility':
        if (this.settings().colorblindMode) this.game.prefs.toggleColorblindMode();
        this.game.prefs.setEffectIntensity(1);
        this.game.prefs.setMotionMode('system');
        break;
      case 'appearance':
        this.game.prefs.setVisualStyle('collector-tech');
        this.game.prefs.setTypographyProfile('dual-font');
        this.game.prefs.setAccentTheme('aurora');
        this.game.prefs.setLanguage('en');
        break;
      default:
        break;
    }
  }
}
