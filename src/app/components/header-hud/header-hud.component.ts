import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-header-hud',
  templateUrl: './header-hud.component.html',
  styleUrl: './header-hud.component.scss',
})
export class HeaderHudComponent {
  readonly game = inject(GameStateService);
}
