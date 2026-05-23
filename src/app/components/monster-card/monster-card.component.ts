import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Monster } from '../../models/monster.model';

@Component({
  selector: 'app-monster-card',
  templateUrl: './monster-card.component.html',
  styleUrl: './monster-card.component.scss',
})
export class MonsterCardComponent {
  @Input({ required: true }) monster!: Monster;
  @Input() selected = false;
  @Input() power = 0;
  @Input() compact = false;
  @Output() selectMonster = new EventEmitter<string>();

  get stageClass(): string {
    return this.monster.stage.toLowerCase().replace(/\s+/g, '-').replace('in-training', 'intraining');
  }
}
