import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommandCenterCard } from '../../rules/command-center.rules';
import { GameStateService } from '../../services/game-state.service';
import { AudioService } from '../../services/audio.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { AccentTheme, LanguageCode } from '../../models/player-state.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly game = inject(GameStateService);
  readonly audio = inject(AudioService);

  readonly settings = this.game.settings;
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

  setAccent(theme: AccentTheme): void {
    this.game.setAccentTheme(theme);
  }

  setLanguage(language: LanguageCode): void {
    this.game.setLanguage(language);
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
    title: `${this.settings().accentTheme.toUpperCase()} / ${this.settings().language.toUpperCase()}`,
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
    if (!this.audio.enabled()) {
      this.game.toggleAudio();
    }
    this.game.toggleMusic();
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
}
