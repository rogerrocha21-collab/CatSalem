import { GestureType, BiomeType } from './types';

export const COLORS = {
  [GestureType.HORIZONTAL]: '#00ffd5', // Cyan/Neon Blue
  [GestureType.VERTICAL]: '#ff00c8', // Neon Pink
  [GestureType.CARET]: '#7a00ff', // Neon Purple
  [GestureType.VEE]: '#ff7300', // Neon Orange
  [GestureType.LIGHTNING]: '#fffb00', // Neon Yellow
  [GestureType.NONE]: '#ffffff',
  bg: '#111111',
  player: '#e2e8f0',
};

export const SYMBOLS = {
  [GestureType.HORIZONTAL]: '―',
  [GestureType.VERTICAL]: '|',
  [GestureType.CARET]: '∧',
  [GestureType.VEE]: '∨',
  [GestureType.LIGHTNING]: '⚡',
};

export const TRANSLATIONS = {
  en: {
    loginTitle: "CatSalem",
    loginSubtitle: "Login",
    namePlaceholder: "Cat Name...",
    startGame: "Start Game",
    menuRecord: "Record",
    currentDest: "Current Destination",
    level: "Level",
    boss: "BOSS",
    hunt: "Hunt",
    instincts: "Instincts",
    shield: "Shield",
    reflex: "Reflex",
    meow: "Meow",
    prey: "Prey",
    lvl: "LVL",
    paused: "PAUSED",
    exitRun: "Exit Run",
    defeat: "DEFEAT",
    defeatMsg: "Your spirit returns to the shadows...",
    returnHome: "Return Home",
    victory: "VICTORY",
    victoryMsg: "The path clears before you.",
    nextStage: "Next Stage",
    tutorial: {
      title: "How to Play",
      step1: "Enemies appear with symbols.",
      step2: "Draw the symbol to attack.",
      step3: "Don't get touched! 3 Lives.",
      step4: "Use skills when in danger.",
      btn: "Let's Hunt!"
    }
  },
  pt: {
    loginTitle: "CatSalem",
    loginSubtitle: "Entrar",
    namePlaceholder: "Nome do Gato...",
    startGame: "Iniciar Jogo",
    menuRecord: "Recorde",
    currentDest: "Destino Atual",
    level: "Nível",
    boss: "CHEFE",
    hunt: "Caçar",
    instincts: "Instintos",
    shield: "Escudo",
    reflex: "Reflexo",
    meow: "Miau",
    prey: "Presas",
    lvl: "NVL",
    paused: "PAUSADO",
    exitRun: "Sair da Partida",
    defeat: "DERROTA",
    defeatMsg: "Seu espírito retorna às sombras...",
    returnHome: "Voltar ao Menu",
    victory: "VITÓRIA",
    victoryMsg: "O caminho se abre diante de você.",
    nextStage: "Próxima Fase",
    tutorial: {
      title: "Como Jogar",
      step1: "Inimigos surgem com símbolos.",
      step2: "Desenhe o símbolo para atacar.",
      step3: "Não deixe te tocarem! 3 Vidas.",
      step4: "Use habilidades se precisar.",
      btn: "Vamos Caçar!"
    }
  }
};

export const LEVEL_SCORE_THRESHOLDS = [
  30, 70, 120, 180, 250, 330, 420, 520, 630, 750
];

// Sprite IDs for rendering logic
export const SPRITES = {
  GHOST: 'GHOST',
  BAT: 'BAT',
  SKULL: 'SKULL',
  EYE: 'EYE',
  SLIME: 'SLIME',
  ELEMENTAL: 'ELEMENTAL',
  WOLF: 'WOLF',
  SPIDER: 'SPIDER',
  CRYSTAL: 'CRYSTAL',
  BOSS_KING: 'BOSS_KING',
  BOSS_ICE: 'BOSS_ICE',
  BOSS_SPIDER: 'BOSS_SPIDER',
  BOSS_DEMON: 'BOSS_DEMON',
  BOSS_DRAGON: 'BOSS_DRAGON',
};

export const BIOME_DATA: Record<BiomeType, { name: { en: string; pt: string }; color: string; enemies: string[]; boss: string; themeColor: string }> = {
  PLAINS: {
    name: { en: "Graveyard", pt: "Cemitério" },
    color: "#a3a3a3", 
    enemies: [SPRITES.GHOST, SPRITES.BAT, SPRITES.EYE, SPRITES.SKULL],
    boss: SPRITES.BOSS_KING,
    themeColor: "text-neutral-200"
  },
  TUNDRA: {
    name: { en: "Frozen Tundra", pt: "Tundra Gélida" },
    color: "#06b6d4",
    enemies: [SPRITES.WOLF, SPRITES.CRYSTAL, SPRITES.ELEMENTAL, SPRITES.BAT],
    boss: SPRITES.BOSS_ICE,
    themeColor: "text-cyan-400"
  },
  SWAMP: {
    name: { en: "Dark Swamp", pt: "Pântano Negro" },
    color: "#a855f7",
    enemies: [SPRITES.SLIME, SPRITES.SPIDER, SPRITES.SKULL, SPRITES.EYE],
    boss: SPRITES.BOSS_SPIDER,
    themeColor: "text-purple-400"
  },
  VOLCANO: {
    name: { en: "Underworld", pt: "Submundo" },
    color: "#ef4444",
    enemies: [SPRITES.ELEMENTAL, SPRITES.BAT, SPRITES.SKULL, SPRITES.EYE],
    boss: SPRITES.BOSS_DEMON,
    themeColor: "text-red-500"
  },
  MOUNTAIN: {
    name: { en: "Rocky Peaks", pt: "Picos Rochosos" },
    color: "#64748b",
    enemies: [SPRITES.CRYSTAL, SPRITES.WOLF, SPRITES.ELEMENTAL, SPRITES.GHOST],
    boss: SPRITES.BOSS_DRAGON,
    themeColor: "text-slate-300"
  }
};

export const GAME_CONFIG = {
  PLAYER_RADIUS: 40,
  ENEMY_RADIUS: 25,
  SPAWN_RATE_INITIAL: 2000,
  SPAWN_RATE_MIN: 500,
  ENEMY_SPEED_BASE: 0.8,
  ENEMY_SPEED_MAX: 4.0,
  BOSS_SCALE: 3,
};

export const SKILL_CONFIG = {
  SHIELD: { unlockLevel: 10, duration: 4000, cooldown: 15000 },
  HOURGLASS: { unlockLevel: 15, duration: 3000, cooldown: 20000 },
  BOMB: { unlockLevel: 30, duration: 500, cooldown: 25000 },
};