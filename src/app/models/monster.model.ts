export type MonsterStage = 'Baby' | 'In-Training' | 'Rookie' | 'Champion' | 'Ultimate' | 'Mega' | 'Special';

export type MonsterType = 'Nature' | 'Fire' | 'Water' | 'Dark' | 'Light' | 'Machine' | 'Beast' | 'Toxic';

export type MonsterRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface EvolutionRequirements {
  level?: number;
  coins?: number;
  dnaShards?: number;
  item?: string;
  /** Optional Battle Mastery gate for side branches only. */
  mastery?: number;
}

export interface Monster {
  id: string;
  name: string;
  stage: MonsterStage;
  type: MonsterType;
  icon: string;
  spriteUrl?: string;
  level: number;
  xp: number;
  maxXp: number;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  rarity: MonsterRarity;
  unlocked: boolean;
  evolutionTargets: string[];
  requirements?: EvolutionRequirements;
  /** Rare prismatic (shiny) variant: alternate shimmer + small stat boost. */
  prismatic?: boolean;
}
