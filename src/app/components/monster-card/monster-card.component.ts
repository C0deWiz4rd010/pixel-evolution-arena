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

  get displayName(): string {
    return this.monster.unlocked ? this.monster.name : 'Unknown Signal';
  }

  get statusLabel(): string {
    return this.monster.unlocked ? this.monster.rarity : 'LOCK';
  }

  get cardAriaLabel(): string {
    const lockState = this.monster.unlocked ? 'unlocked' : 'locked';

    return `${this.displayName}, ${this.monster.stage} ${this.monster.type}, level ${this.monster.level}, power ${this.power}, ${lockState}`;
  }

  get stageClass(): string {
    return this.monster.stage.toLowerCase().replace(/\s+/g, '-').replace('in-training', 'intraining');
  }
}
