import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-handbook',
  templateUrl: './handbook.component.html',
  styleUrl: './handbook.component.scss',
})
export class HandbookComponent {
  readonly game = inject(GameStateService);
}
