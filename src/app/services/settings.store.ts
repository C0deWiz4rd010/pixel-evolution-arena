import { inject, Injectable } from '@angular/core';
import { PlayerSettings } from '../models/player-state.model';
import { GameStore } from './game-store.service';
import { AudioService } from './audio.service';
import { BattleAnimationService } from './battle-animation.service';

/** Player preferences: audio, accessibility, appearance and battle playback settings. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly store = inject(GameStore);
  private readonly audio = inject(AudioService);
  private readonly battleAnimation = inject(BattleAnimationService);

  toggleAudio(): boolean {
    const next = !this.store.player().audioEnabled;
    this.store.player.update((current) => ({ ...current, audioEnabled: next }));
    this.audio.setEnabled(next);
    if (next) {
      this.audio.play('menu');
    }
    return next;
  }

  get audioEnabled(): boolean {
    return this.store.player().audioEnabled;
  }

  setMasterVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.store.updateSettings({ masterVolume: clamped });
    this.audio.setMasterVolume(clamped);
  }

  toggleColorblindMode(): void {
    this.store.updateSettings({ colorblindMode: !this.store.settings().colorblindMode });
  }

  setEffectIntensity(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.store.updateSettings({ effectIntensity: clamped });
  }

  setAccentTheme(theme: PlayerSettings['accentTheme']): void {
    this.store.updateSettings({ accentTheme: theme });
  }

  setVisualStyle(visualStyle: PlayerSettings['visualStyle']): void {
    this.store.updateSettings({ visualStyle });
  }

  setTypographyProfile(typographyProfile: PlayerSettings['typographyProfile']): void {
    this.store.updateSettings({ typographyProfile });
  }

  setLanguage(language: PlayerSettings['language']): void {
    this.store.updateSettings({ language });
  }

  toggleCombatBeats(): void {
    this.store.updateSettings({ combatBeats: !this.store.settings().combatBeats });
  }

  toggleMusic(): boolean {
    return this.audio.toggleMusic();
  }

  setBattleControlMode(mode: PlayerSettings['battleControlMode']): void {
    this.store.updateSettings({ battleControlMode: mode });
  }

  setBattleSpeed(speed: PlayerSettings['battleSpeed']): void {
    this.store.updateSettings({ battleSpeed: speed });
    this.battleAnimation.setSpeed(speed);
  }

  toggleBattleRecommendations(): void {
    this.store.updateSettings({ battleRecommendations: !this.store.settings().battleRecommendations });
  }

  setMotionMode(mode: PlayerSettings['motionMode']): void {
    this.store.updateSettings({ motionMode: mode });
  }

  setMusicEnabled(value: boolean): void {
    this.store.updateSettings({ musicEnabled: value });
    this.audio.setMusicEnabled(value);
  }
}
