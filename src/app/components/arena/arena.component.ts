import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-arena',
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.scss',
})
export class ArenaComponent {
  readonly game = inject(GameStateService);
}
