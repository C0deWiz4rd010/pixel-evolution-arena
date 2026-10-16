import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { CreaturePortraitComponent } from '../creature-portrait/creature-portrait.component';

/** Short, skippable celebration right after an evolution (auto-dismisses; any click or key skips). */
@Component({
  selector: 'app-evolution-reveal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreaturePortraitComponent],
  templateUrl: './evolution-reveal.component.html',
  styleUrl: './evolution-reveal.component.scss',
})
export class EvolutionRevealComponent {
  protected readonly game = inject(GameStateService);
  protected readonly reveal = this.game.evolutionReveal;

  @HostListener('document:keydown.escape')
  protected dismiss(): void {
    this.game.dismissEvolutionReveal();
  }
}
