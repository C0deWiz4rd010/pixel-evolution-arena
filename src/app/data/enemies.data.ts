import { EnemyMonster } from '../models/battle.model';

export const ENEMIES: EnemyMonster[] = [
  {
    id: 'E001',
    name: 'Ironmole',
    icon: '🦾',
    spriteUrl: 'assets/creatures/generated-100/n059-ironkite.svg',
    hp: 260,
    attack: 48,
    defense: 72,
    speed: 22,
    type: 'Machine',
  },
  {
    id: 'E002',
    name: 'Fangbat',
    icon: '🦇',
    spriteUrl: 'assets/creatures/generated-100/n030-umbracrow.svg',
    hp: 190,
    attack: 66,
    defense: 34,
    speed: 70,
    type: 'Dark',
  },
  {
    id: 'E003',
    name: 'Mossgolem',
    icon: '🪨',
    spriteUrl: 'assets/creatures/generated-100/n054-briarwarden.svg',
    hp: 310,
    attack: 42,
    defense: 76,
    speed: 18,
    type: 'Nature',
  },
];
