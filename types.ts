export enum GestureType {
  NONE = 'NONE',
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
  CARET = 'CARET', // ^
  VEE = 'VEE', // v
  LIGHTNING = 'LIGHTNING' // z shape
}

export type BiomeType = 'PLAINS' | 'TUNDRA' | 'SWAMP' | 'VOLCANO' | 'MOUNTAIN';

export type Language = 'en' | 'pt';

export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  speed: number;
  symbols: GestureType[]; 
  color: string;
  radius: number;
  type: 'minion' | 'projectile' | 'boss';
  icon: string; // Lucide icon name or emoji
}

export interface Boss {
  active: boolean;
  maxHealth: number; // Total sigils to break
  currentSigils: GestureType[]; // Current batch of sigils to draw
  remainingSigilsBatchCount: number; // How many times sigils refill
  x: number;
  y: number;
  color: string;
  scale: number;
  attackTimer: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface SkillState {
  id: 'shield' | 'hourglass' | 'bomb';
  unlocked: boolean;
  cooldown: number; // Current cooldown remaining in ms
  maxCooldown: number; // Total cooldown in ms
  activeDuration: number; // How long it stays active
  isActive: boolean;
}

export interface GameState {
  playerName: string;
  score: number;
  health: number;
  maxHealth: number;
  biome: BiomeType;
  level: number; // 1 to 11
  globalLevel: number; // Accumulative level for unlocks
  isGameOver: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  isVictory: boolean; // Level complete
  combo: number;
  skills: {
    shield: SkillState;
    hourglass: SkillState;
    bomb: SkillState;
  };
}