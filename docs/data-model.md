# Data Model

## Monster

```ts
interface Monster {
  id: string;
  name: string;
  stage: 'Baby' | 'In-Training' | 'Rookie' | 'Champion' | 'Ultimate' | 'Mega' | 'Special';
  type: 'Nature' | 'Fire' | 'Water' | 'Dark' | 'Light' | 'Machine' | 'Beast' | 'Toxic';
  icon: string;
  level: number;
  xp: number;
  maxXp: number;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  unlocked: boolean;
  evolutionTargets: string[];
  requirements?: {
    level?: number;
    coins?: number;
    dnaShards?: number;
    item?: string;
  };
}
```

## BattleLog

```ts
interface BattleLog {
  text: string;
  type: 'info' | 'damage' | 'reward' | 'system';
}
```

## PlayerState

```ts
interface PlayerState {
  coins: number;
  dnaShards: number;
  battlesWon: number;
  selectedMonsterId: string | null;
  squadIds: string[];
  inventory: string[];
}
```

## Naming

- Monster IDs use stage prefixes and three digits where helpful, for example `M001`.
- File and asset names use lowercase kebab-case.
- No protected creature names or franchise-specific terms.
