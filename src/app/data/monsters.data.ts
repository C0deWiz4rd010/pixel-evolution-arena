import { Monster, MonsterStage, MonsterType } from '../models/monster.model';

export const STAGES: MonsterStage[] = ['Baby', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Special'];

export const TYPES: MonsterType[] = ['Nature', 'Fire', 'Water', 'Dark', 'Light', 'Machine', 'Beast', 'Toxic'];

const BASE_MONSTERS: Monster[] = [
  { id: 'M001', name: 'Bubblit', stage: 'Baby', type: 'Water', icon: '💧', level: 2, xp: 30, maxXp: 90, attack: 18, defense: 16, speed: 20, hp: 72, rarity: 'Common', unlocked: true, evolutionTargets: ['M007'] },
  { id: 'M002', name: 'Sproutbit', stage: 'Baby', type: 'Nature', icon: '🌱', level: 2, xp: 24, maxXp: 90, attack: 16, defense: 22, speed: 16, hp: 78, rarity: 'Common', unlocked: true, evolutionTargets: ['M008'] },
  { id: 'M003', name: 'Emberling', stage: 'Baby', type: 'Fire', icon: '🔥', level: 2, xp: 18, maxXp: 90, attack: 24, defense: 12, speed: 20, hp: 68, rarity: 'Common', unlocked: true, evolutionTargets: ['M009'] },
  { id: 'M004', name: 'Shadepuff', stage: 'Baby', type: 'Dark', icon: '🌑', level: 2, xp: 10, maxXp: 90, attack: 20, defense: 14, speed: 24, hp: 66, rarity: 'Common', unlocked: true, evolutionTargets: ['M010', 'M051'] },
  { id: 'M005', name: 'Sparkit', stage: 'Baby', type: 'Light', icon: '✨', level: 1, xp: 0, maxXp: 100, attack: 19, defense: 14, speed: 28, hp: 62, rarity: 'Common', unlocked: false, evolutionTargets: ['M011', 'M057'] },
  { id: 'M006', name: 'Pebblip', stage: 'Baby', type: 'Beast', icon: '🟤', level: 1, xp: 0, maxXp: 100, attack: 17, defense: 24, speed: 12, hp: 88, rarity: 'Common', unlocked: false, evolutionTargets: ['M066'] },
  { id: 'M007', name: 'Aquabun', stage: 'In-Training', type: 'Water', icon: '🐰', level: 3, xp: 42, maxXp: 130, attack: 30, defense: 24, speed: 34, hp: 104, rarity: 'Common', unlocked: true, evolutionTargets: ['M014', 'M069'], requirements: { level: 2, coins: 100, dnaShards: 5 } },
  { id: 'M008', name: 'Leafbyte', stage: 'In-Training', type: 'Nature', icon: '🍃', level: 3, xp: 30, maxXp: 130, attack: 26, defense: 34, speed: 26, hp: 112, rarity: 'Common', unlocked: true, evolutionTargets: ['M015'], requirements: { level: 2, coins: 100, dnaShards: 5 } },
  { id: 'M009', name: 'Cinderpaw', stage: 'In-Training', type: 'Fire', icon: '🐾', level: 2, xp: 20, maxXp: 130, attack: 38, defense: 20, speed: 32, hp: 96, rarity: 'Common', unlocked: false, evolutionTargets: ['M016'], requirements: { level: 2, coins: 100, dnaShards: 5 } },
  { id: 'M010', name: 'Nightnub', stage: 'In-Training', type: 'Dark', icon: '🟣', level: 2, xp: 0, maxXp: 130, attack: 34, defense: 22, speed: 38, hp: 90, rarity: 'Common', unlocked: false, evolutionTargets: ['M017'], requirements: { level: 2, coins: 100, dnaShards: 5 } },
  { id: 'M011', name: 'Lumipup', stage: 'In-Training', type: 'Light', icon: '🐶', level: 2, xp: 0, maxXp: 140, attack: 30, defense: 24, speed: 42, hp: 94, rarity: 'Rare', unlocked: false, evolutionTargets: ['M018'], requirements: { level: 2, coins: 120, dnaShards: 6 } },
  { id: 'M012', name: 'Gearmite', stage: 'In-Training', type: 'Machine', icon: '⚙️', level: 2, xp: 0, maxXp: 145, attack: 28, defense: 40, speed: 22, hp: 108, rarity: 'Rare', unlocked: false, evolutionTargets: ['M019'], requirements: { level: 2, coins: 120, dnaShards: 6 } },
  { id: 'M013', name: 'Oozelet', stage: 'In-Training', type: 'Toxic', icon: '🧪', level: 2, xp: 0, maxXp: 145, attack: 26, defense: 32, speed: 24, hp: 122, rarity: 'Rare', unlocked: false, evolutionTargets: ['M021'], requirements: { level: 2, coins: 120, dnaShards: 6 } },
  { id: 'M014', name: 'Splashfang', stage: 'Rookie', type: 'Water', icon: '🦈', level: 1, xp: 0, maxXp: 190, attack: 48, defense: 38, speed: 46, hp: 148, rarity: 'Rare', unlocked: false, evolutionTargets: ['M023'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M015', name: 'Thornkit', stage: 'Rookie', type: 'Nature', icon: '🌿', level: 1, xp: 0, maxXp: 190, attack: 42, defense: 52, speed: 34, hp: 158, rarity: 'Rare', unlocked: false, evolutionTargets: ['M024'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M016', name: 'Pyroclaw', stage: 'Rookie', type: 'Fire', icon: '🐅', level: 1, xp: 0, maxXp: 200, attack: 62, defense: 30, speed: 48, hp: 138, rarity: 'Rare', unlocked: false, evolutionTargets: ['M025'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M017', name: 'Shadowimp', stage: 'Rookie', type: 'Dark', icon: '😈', level: 1, xp: 0, maxXp: 200, attack: 56, defense: 34, speed: 58, hp: 130, rarity: 'Rare', unlocked: false, evolutionTargets: ['M026'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M018', name: 'Voltbeak', stage: 'Rookie', type: 'Light', icon: '🐤', level: 1, xp: 0, maxXp: 205, attack: 50, defense: 32, speed: 66, hp: 126, rarity: 'Rare', unlocked: false, evolutionTargets: ['M028'], requirements: { level: 3, coins: 180, dnaShards: 10 } },
  { id: 'M019', name: 'Gearfox', stage: 'Rookie', type: 'Machine', icon: '🦊', level: 1, xp: 0, maxXp: 220, attack: 54, defense: 58, speed: 42, hp: 150, rarity: 'Epic', unlocked: false, evolutionTargets: ['M027', 'M046'], requirements: { level: 4, coins: 220, dnaShards: 12 } },
  { id: 'M020', name: 'Mossnail', stage: 'Rookie', type: 'Nature', icon: '🐌', level: 1, xp: 0, maxXp: 180, attack: 32, defense: 68, speed: 16, hp: 184, rarity: 'Common', unlocked: false, evolutionTargets: ['M030'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M021', name: 'Venomote', stage: 'Rookie', type: 'Toxic', icon: '🦟', level: 1, xp: 0, maxXp: 205, attack: 46, defense: 38, speed: 62, hp: 132, rarity: 'Rare', unlocked: false, evolutionTargets: ['M029'], requirements: { level: 3, coins: 180, dnaShards: 10 } },
  { id: 'M022', name: 'Cragcub', stage: 'Rookie', type: 'Beast', icon: '🐻', level: 1, xp: 0, maxXp: 190, attack: 52, defense: 48, speed: 28, hp: 176, rarity: 'Common', unlocked: false, evolutionTargets: ['M031'], requirements: { level: 3, coins: 150, dnaShards: 8 } },
  { id: 'M023', name: 'Tideraptor', stage: 'Champion', type: 'Water', icon: '🦖', level: 1, xp: 0, maxXp: 280, attack: 86, defense: 62, speed: 72, hp: 230, rarity: 'Epic', unlocked: false, evolutionTargets: ['M032'], requirements: { level: 7, coins: 350, dnaShards: 18 } },
  { id: 'M024', name: 'Bramblehorn', stage: 'Champion', type: 'Nature', icon: '🦌', level: 1, xp: 0, maxXp: 280, attack: 72, defense: 92, speed: 44, hp: 260, rarity: 'Epic', unlocked: false, evolutionTargets: ['M033'], requirements: { level: 7, coins: 350, dnaShards: 18 } },
  { id: 'M025', name: 'Blazehound', stage: 'Champion', type: 'Fire', icon: '🐺', level: 1, xp: 0, maxXp: 290, attack: 104, defense: 54, speed: 78, hp: 214, rarity: 'Epic', unlocked: false, evolutionTargets: ['M034'], requirements: { level: 7, coins: 350, dnaShards: 18 } },
  { id: 'M026', name: 'Duskraider', stage: 'Champion', type: 'Dark', icon: '🗡️', level: 1, xp: 0, maxXp: 300, attack: 96, defense: 58, speed: 92, hp: 204, rarity: 'Epic', unlocked: false, evolutionTargets: ['M035'], requirements: { level: 7, coins: 350, dnaShards: 18, item: 'Shadow Gem' } },
  { id: 'M027', name: 'Gearfox MkII', stage: 'Champion', type: 'Machine', icon: '🦾', level: 1, xp: 0, maxXp: 320, attack: 86, defense: 96, speed: 58, hp: 246, rarity: 'Epic', unlocked: false, evolutionTargets: ['M038'], requirements: { level: 7, coins: 380, dnaShards: 20 } },
  { id: 'M028', name: 'Voltgryphon', stage: 'Champion', type: 'Light', icon: '🦅', level: 1, xp: 0, maxXp: 300, attack: 88, defense: 54, speed: 108, hp: 204, rarity: 'Epic', unlocked: false, evolutionTargets: ['M036'], requirements: { level: 7, coins: 380, dnaShards: 20 } },
  { id: 'M029', name: 'Sludgebloom', stage: 'Champion', type: 'Toxic', icon: '🌺', level: 1, xp: 0, maxXp: 290, attack: 72, defense: 78, speed: 50, hp: 256, rarity: 'Rare', unlocked: false, evolutionTargets: ['M037'], requirements: { level: 7, coins: 330, dnaShards: 18 } },
  { id: 'M030', name: 'Ironmoss', stage: 'Champion', type: 'Machine', icon: '🛡️', level: 1, xp: 0, maxXp: 300, attack: 62, defense: 114, speed: 28, hp: 286, rarity: 'Rare', unlocked: false, evolutionTargets: ['M038'], requirements: { level: 7, coins: 330, dnaShards: 18, item: 'Armor Core' } },
  { id: 'M031', name: 'Fangquartz', stage: 'Champion', type: 'Beast', icon: '💎', level: 1, xp: 0, maxXp: 280, attack: 98, defense: 66, speed: 62, hp: 230, rarity: 'Rare', unlocked: false, evolutionTargets: ['M067'], requirements: { level: 7, coins: 330, dnaShards: 18 } },
  { id: 'M032', name: 'Stormjaw', stage: 'Ultimate', type: 'Water', icon: '🌊', level: 1, xp: 0, maxXp: 390, attack: 134, defense: 92, speed: 104, hp: 360, rarity: 'Epic', unlocked: false, evolutionTargets: ['M039', 'M063'], requirements: { level: 11, coins: 550, dnaShards: 28 } },
  { id: 'M033', name: 'Thornrex', stage: 'Ultimate', type: 'Nature', icon: '🌵', level: 1, xp: 0, maxXp: 390, attack: 118, defense: 136, speed: 72, hp: 390, rarity: 'Epic', unlocked: false, evolutionTargets: ['M040'], requirements: { level: 11, coins: 550, dnaShards: 28 } },
  { id: 'M034', name: 'Infernodon', stage: 'Ultimate', type: 'Fire', icon: '🌋', level: 1, xp: 0, maxXp: 410, attack: 162, defense: 82, speed: 118, hp: 340, rarity: 'Epic', unlocked: false, evolutionTargets: ['M042', 'M064'], requirements: { level: 11, coins: 550, dnaShards: 28 } },
  { id: 'M035', name: 'Nightreaver', stage: 'Ultimate', type: 'Dark', icon: '🕶️', level: 1, xp: 0, maxXp: 430, attack: 154, defense: 84, speed: 142, hp: 320, rarity: 'Epic', unlocked: false, evolutionTargets: ['M041', 'M047'], requirements: { level: 11, coins: 600, dnaShards: 30, item: 'Shadow Gem' } },
  { id: 'M036', name: 'Aurorawing', stage: 'Ultimate', type: 'Light', icon: '🪽', level: 1, xp: 0, maxXp: 440, attack: 132, defense: 82, speed: 158, hp: 330, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M043', 'M045'], requirements: { level: 11, coins: 650, dnaShards: 32, item: 'Solar Crest' } },
  { id: 'M037', name: 'Toximander', stage: 'Ultimate', type: 'Toxic', icon: '🦎', level: 1, xp: 0, maxXp: 400, attack: 128, defense: 110, speed: 96, hp: 370, rarity: 'Epic', unlocked: false, evolutionTargets: ['M044'], requirements: { level: 11, coins: 550, dnaShards: 28 } },
  { id: 'M038', name: 'Mechabison', stage: 'Ultimate', type: 'Machine', icon: '🐂', level: 1, xp: 0, maxXp: 430, attack: 124, defense: 160, speed: 58, hp: 410, rarity: 'Epic', unlocked: false, evolutionTargets: ['M068'], requirements: { level: 11, coins: 600, dnaShards: 30, item: 'Armor Core' } },
  { id: 'M039', name: 'Leviacore', stage: 'Mega', type: 'Water', icon: '🐉', level: 1, xp: 0, maxXp: 620, attack: 190, defense: 152, speed: 146, hp: 500, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 15, coins: 800, dnaShards: 40 } },
  { id: 'M040', name: 'Solarthorn', stage: 'Mega', type: 'Nature', icon: '☀️', level: 1, xp: 0, maxXp: 620, attack: 172, defense: 198, speed: 110, hp: 540, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M049'], requirements: { level: 15, coins: 800, dnaShards: 40, item: 'Solar Crest' } },
  { id: 'M041', name: 'ObsidianZero', stage: 'Mega', type: 'Dark', icon: '🖤', level: 1, xp: 0, maxXp: 660, attack: 214, defense: 142, speed: 174, hp: 470, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M047'], requirements: { level: 15, coins: 850, dnaShards: 42, item: 'Shadow Gem' } },
  { id: 'M042', name: 'Helioforge', stage: 'Mega', type: 'Fire', icon: '🔆', level: 1, xp: 0, maxXp: 640, attack: 224, defense: 132, speed: 132, hp: 510, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 15, coins: 820, dnaShards: 40 } },
  { id: 'M043', name: 'Galewarden', stage: 'Mega', type: 'Light', icon: '🌀', level: 1, xp: 0, maxXp: 640, attack: 180, defense: 130, speed: 220, hp: 470, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M045', 'M050'], requirements: { level: 15, coins: 850, dnaShards: 42, item: 'Solar Crest' } },
  { id: 'M044', name: 'Virulisk', stage: 'Mega', type: 'Toxic', icon: '☣️', level: 1, xp: 0, maxXp: 620, attack: 188, defense: 170, speed: 136, hp: 500, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M065'], requirements: { level: 15, coins: 800, dnaShards: 40 } },
  { id: 'M045', name: 'AstralNova', stage: 'Special', type: 'Light', icon: '🌠', level: 1, xp: 0, maxXp: 780, attack: 240, defense: 170, speed: 250, hp: 520, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 18, coins: 1000, dnaShards: 55, item: 'Solar Crest' } },
  { id: 'M046', name: 'MechaTitan', stage: 'Special', type: 'Machine', icon: '🤖', level: 1, xp: 0, maxXp: 760, attack: 230, defense: 260, speed: 90, hp: 620, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 15, coins: 800, dnaShards: 40, item: 'Ancient Gear' } },
  { id: 'M047', name: 'VoidSeraph', stage: 'Special', type: 'Dark', icon: '🕳️', level: 1, xp: 0, maxXp: 800, attack: 270, defense: 160, speed: 230, hp: 500, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 18, coins: 1000, dnaShards: 55, item: 'Shadow Gem' } },
  { id: 'M048', name: 'Chronodrake', stage: 'Special', type: 'Beast', icon: '⏳', level: 1, xp: 0, maxXp: 740, attack: 242, defense: 190, speed: 180, hp: 520, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 12, coins: 650, dnaShards: 35, item: 'Ancient Gear' } },
  { id: 'M049', name: 'Bloomgeist', stage: 'Special', type: 'Nature', icon: '🌸', level: 1, xp: 0, maxXp: 760, attack: 214, defense: 240, speed: 150, hp: 560, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 16, coins: 900, dnaShards: 48, item: 'Solar Crest' } },
  { id: 'M050', name: 'Prismyr', stage: 'Special', type: 'Light', icon: '🔷', level: 1, xp: 0, maxXp: 780, attack: 228, defense: 200, speed: 240, hp: 500, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 16, coins: 950, dnaShards: 50, item: 'Solar Crest' } },

  // Spectral Dark branch — completes a parallel chain from M004 Shadepuff
  { id: 'M051', name: 'Wispfade', stage: 'In-Training', type: 'Dark', icon: '👻', level: 2, xp: 0, maxXp: 140, attack: 32, defense: 22, speed: 40, hp: 92, rarity: 'Rare', unlocked: false, evolutionTargets: ['M052'], requirements: { level: 2, coins: 130, dnaShards: 6 } },
  { id: 'M052', name: 'Mirefade', stage: 'Rookie', type: 'Dark', icon: '🕸️', level: 1, xp: 0, maxXp: 205, attack: 54, defense: 38, speed: 62, hp: 132, rarity: 'Rare', unlocked: false, evolutionTargets: ['M053'], requirements: { level: 3, coins: 180, dnaShards: 10 } },
  { id: 'M053', name: 'Hollowveil', stage: 'Champion', type: 'Dark', icon: '🪦', level: 1, xp: 0, maxXp: 310, attack: 94, defense: 64, speed: 96, hp: 208, rarity: 'Epic', unlocked: false, evolutionTargets: ['M054'], requirements: { level: 7, coins: 380, dnaShards: 20 } },
  { id: 'M054', name: 'Wraithlord', stage: 'Ultimate', type: 'Dark', icon: '💀', level: 1, xp: 0, maxXp: 430, attack: 156, defense: 90, speed: 144, hp: 330, rarity: 'Epic', unlocked: false, evolutionTargets: ['M055'], requirements: { level: 11, coins: 620, dnaShards: 30 } },
  { id: 'M055', name: 'Nullruler', stage: 'Mega', type: 'Dark', icon: '⚫', level: 1, xp: 0, maxXp: 660, attack: 218, defense: 144, speed: 178, hp: 470, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M056'], requirements: { level: 15, coins: 860, dnaShards: 44, item: 'Shadow Gem' } },
  { id: 'M056', name: 'Antinexus', stage: 'Special', type: 'Dark', icon: '🌌', level: 1, xp: 0, maxXp: 820, attack: 274, defense: 168, speed: 232, hp: 510, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 18, coins: 1050, dnaShards: 58, item: 'Shadow Gem' } },

  // Empyreal Light branch — completes a parallel chain from M005 Sparkit
  { id: 'M057', name: 'Glowmoth', stage: 'In-Training', type: 'Light', icon: '🦋', level: 2, xp: 0, maxXp: 140, attack: 30, defense: 22, speed: 44, hp: 88, rarity: 'Rare', unlocked: false, evolutionTargets: ['M058'], requirements: { level: 2, coins: 130, dnaShards: 6 } },
  { id: 'M058', name: 'Halofly', stage: 'Rookie', type: 'Light', icon: '🪽', level: 1, xp: 0, maxXp: 210, attack: 52, defense: 34, speed: 68, hp: 124, rarity: 'Rare', unlocked: false, evolutionTargets: ['M059'], requirements: { level: 3, coins: 190, dnaShards: 11 } },
  { id: 'M059', name: 'Auraknight', stage: 'Champion', type: 'Light', icon: '🛡️', level: 1, xp: 0, maxXp: 310, attack: 92, defense: 78, speed: 102, hp: 222, rarity: 'Epic', unlocked: false, evolutionTargets: ['M060'], requirements: { level: 7, coins: 390, dnaShards: 21 } },
  { id: 'M060', name: 'Solareaper', stage: 'Ultimate', type: 'Light', icon: '☄️', level: 1, xp: 0, maxXp: 440, attack: 142, defense: 96, speed: 162, hp: 320, rarity: 'Epic', unlocked: false, evolutionTargets: ['M061'], requirements: { level: 11, coins: 640, dnaShards: 32, item: 'Solar Crest' } },
  { id: 'M061', name: 'Empyreal', stage: 'Mega', type: 'Light', icon: '🌟', level: 1, xp: 0, maxXp: 670, attack: 196, defense: 158, speed: 218, hp: 488, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M062'], requirements: { level: 15, coins: 880, dnaShards: 46, item: 'Solar Crest' } },
  { id: 'M062', name: 'Cosmosaint', stage: 'Special', type: 'Light', icon: '✡️', level: 1, xp: 0, maxXp: 820, attack: 252, defense: 196, speed: 246, hp: 520, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 18, coins: 1100, dnaShards: 60, item: 'Solar Crest' } },

  // Ultimate-to-Special caps for existing Water, Fire, and Toxic branches
  { id: 'M063', name: 'Tempestguard', stage: 'Special', type: 'Water', icon: '🌐', level: 1, xp: 0, maxXp: 780, attack: 240, defense: 224, speed: 168, hp: 580, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 17, coins: 980, dnaShards: 52, item: 'Ancient Gear' } },
  { id: 'M064', name: 'Magmastorm', stage: 'Special', type: 'Fire', icon: '🌪️', level: 1, xp: 0, maxXp: 800, attack: 286, defense: 158, speed: 198, hp: 510, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 17, coins: 1000, dnaShards: 54, item: 'Ancient Gear' } },
  { id: 'M065', name: 'Worldsbane', stage: 'Special', type: 'Toxic', icon: '☠️', level: 1, xp: 0, maxXp: 820, attack: 248, defense: 220, speed: 178, hp: 560, rarity: 'Legendary', unlocked: false, evolutionTargets: [], requirements: { level: 18, coins: 1100, dnaShards: 60, item: 'Shadow Gem' } },

  // Beast chain gap-filler: In-Training stage between M006 Pebblip and M022 Cragcub
  { id: 'M066', name: 'Rockpup', stage: 'In-Training', type: 'Beast', icon: '🪨', level: 1, xp: 0, maxXp: 130, attack: 28, defense: 36, speed: 18, hp: 116, rarity: 'Common', unlocked: false, evolutionTargets: ['M022'], requirements: { level: 2, coins: 100, dnaShards: 5 } },

  // Beast Mega — fills the missing Mega stage between Fangquartz (Champion) and Chronodrake (Special)
  { id: 'M067', name: 'StoneCrown', stage: 'Mega', type: 'Beast', icon: '👑', level: 1, xp: 0, maxXp: 650, attack: 186, defense: 224, speed: 94, hp: 560, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M048'], requirements: { level: 15, coins: 820, dnaShards: 42, item: 'Ancient Gear' } },

  // Machine Mega — fills the missing Mega stage between Mechabison (Ultimate) and MechaTitan (Special)
  { id: 'M068', name: 'OmegaFrame', stage: 'Mega', type: 'Machine', icon: '🦿', level: 1, xp: 0, maxXp: 660, attack: 200, defense: 240, speed: 82, hp: 530, rarity: 'Legendary', unlocked: false, evolutionTargets: ['M046'], requirements: { level: 15, coins: 840, dnaShards: 44, item: 'Ancient Gear' } },

  // Ice/Frost Water branch — parallel path from M007 Aquabun, diverging at Rookie stage
  { id: 'M069', name: 'TidalWolf', stage: 'Rookie', type: 'Water', icon: '🐺', level: 1, xp: 0, maxXp: 195, attack: 50, defense: 40, speed: 52, hp: 144, rarity: 'Rare', unlocked: false, evolutionTargets: ['M070'], requirements: { level: 3, coins: 160, dnaShards: 9 } },
  { id: 'M070', name: 'FrostFang', stage: 'Champion', type: 'Water', icon: '🧊', level: 1, xp: 0, maxXp: 290, attack: 90, defense: 72, speed: 80, hp: 236, rarity: 'Epic', unlocked: false, evolutionTargets: ['M071'], requirements: { level: 7, coins: 360, dnaShards: 19 } },
  { id: 'M071', name: 'IceColossus', stage: 'Ultimate', type: 'Water', icon: '❄️', level: 1, xp: 0, maxXp: 420, attack: 144, defense: 118, speed: 110, hp: 390, rarity: 'Epic', unlocked: false, evolutionTargets: ['M063'], requirements: { level: 11, coins: 570, dnaShards: 29 } },
];

/** Matches the slug rule in tools/generate-creatures.mjs so every monster maps to its own sprite. */
const spriteSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Every playable monster now resolves to a bespoke, type- and stage-matched
// pixel sprite generated by tools/generate-creatures.mjs (no emoji placeholders,
// no index-shuffled mismatches). The emoji `icon` remains only as a last-resort fallback.
export const MONSTERS: Monster[] = BASE_MONSTERS.map((monster) => ({
  ...monster,
  spriteUrl: `assets/creatures/playable/${monster.id.toLowerCase()}-${spriteSlug(monster.name)}.svg`,
}));
