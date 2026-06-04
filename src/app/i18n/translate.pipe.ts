import { Pipe, PipeTransform, inject } from '@angular/core';
import { GameStateService } from '../services/game-state.service';
import { TranslationKey, translate } from './translations';

/**
 * Impure pipe so it re-resolves when the language signal changes. Usage:
 * `{{ 'settings.title' | t }}`. Falls back to the key if untranslated.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly game = inject(GameStateService);

  transform(key: TranslationKey): string {
    return translate(this.game.settings().language, key);
  }
}
