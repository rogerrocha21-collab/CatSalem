import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Point, Enemy, Particle, GestureType, Boss, BiomeType, SkillState, Language } from '../types';
import { recognizeGesture } from '../utils/gesture';
import { COLORS, SYMBOLS, GAME_CONFIG, LEVEL_SCORE_THRESHOLDS, BIOME_DATA, SKILL_CONFIG, SPRITES, TRANSLATIONS } from '../constants';
import { Heart, Pause, RotateCcw, Play, Shield, Hourglass, Bomb, ArrowRight, Home } from 'lucide-react';

interface GameEngineProps {
  playerName: string;
  initialBiome: BiomeType;
  initialLevel: number;
  language: Language;
  onLevelComplete: (score: number, isBoss: boolean) => void;
  onExit: () => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ playerName, initialBiome, initialLevel, language, onLevelComplete, onExit }) => {
  const t = TRANSLATIONS[language];
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const biomeOrder: BiomeType[] = ['PLAINS', 'TUNDRA', 'SWAMP', 'VOLCANO', 'MOUNTAIN'];
  const biomeIndex = biomeOrder.indexOf(initialBiome);
  const globalLevelCalc = (biomeIndex * 11) + initialLevel;

  // Game State Refs
  const gameState = useRef<GameState>({
    playerName,
    score: 0,
    health: 3,
    maxHealth: 3,
    biome: initialBiome,
    level: initialLevel,
    globalLevel: globalLevelCalc,
    isGameOver: false,
    isPaused: false,
    isPlaying: true, // Start immediately
    isVictory: false,
    combo: 0,
    skills: {
      shield: { 
        id: 'shield', 
        unlocked: globalLevelCalc >= SKILL_CONFIG.SHIELD.unlockLevel, 
        cooldown: 0, 
        maxCooldown: SKILL_CONFIG.SHIELD.cooldown, 
        activeDuration: SKILL_CONFIG.SHIELD.duration, 
        isActive: false 
      },
      hourglass: { 
        id: 'hourglass', 
        unlocked: globalLevelCalc >= SKILL_CONFIG.HOURGLASS.unlockLevel, 
        cooldown: 0, 
        maxCooldown: SKILL_CONFIG.HOURGLASS.cooldown, 
        activeDuration: SKILL_CONFIG.HOURGLASS.duration, 
        isActive: false 
      },
      bomb: { 
        id: 'bomb', 
        unlocked: globalLevelCalc >= SKILL_CONFIG.BOMB.unlockLevel, 
        cooldown: 0, 
        maxCooldown: SKILL_CONFIG.BOMB.cooldown, 
        activeDuration: SKILL_CONFIG.BOMB.duration, 
        isActive: false 
      },
    }
  });
  
  const enemies = useRef<Enemy[]>([]);
  const particles = useRef<Particle[]>([]);
  const boss = useRef<Boss | null>(null);
  const currentPath = useRef<Point[]>([]);
  const isDrawing = useRef<boolean>(false);
  const lastTime = useRef<number>(0);
  const lastSpawnTime = useRef<number>(0);
  
  // Sync state for UI
  const [uiState, setUiState] = useState<{
    score: number;
    health: number;
    isPaused: boolean;
    isGameOver: boolean;
    isVictory: boolean;
    skills: GameState['skills'];
    bossHealth?: { current: number, max: number };
  }>({ 
    score: 0, 
    health: 3, 
    isPaused: false, 
    isGameOver: false, 
    isVictory: false,
    skills: gameState.current.skills
  });

  const audioCtx = useRef<AudioContext | null>(null);

  // --- Audio System ---
  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'draw' | 'hit' | 'damage' | 'gameover' | 'skill' | 'win') => {
    if (!audioCtx.current) initAudio(); // Ensure init
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    switch (type) {
      case 'draw':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'hit':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'damage':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'skill':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'win':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  };

  // --- Logic Helpers ---

  const generateSymbols = (count: number, difficulty: number): GestureType[] => {
    const symbols: GestureType[] = [];
    const types = [GestureType.HORIZONTAL, GestureType.VERTICAL];
    if (difficulty > 2) types.push(GestureType.CARET);
    if (difficulty > 4) types.push(GestureType.VEE);
    if (difficulty > 6) types.push(GestureType.LIGHTNING);

    for (let i = 0; i < count; i++) {
        symbols.push(types[Math.floor(Math.random() * types.length)]);
    }
    return symbols;
  };

  const initBoss = (width: number, height: number) => {
    const biomeDifficulty = biomeIndex + 1;
    const totalBatches = 3 + biomeDifficulty; 
    const sigilsPerBatch = 2 + Math.floor(biomeDifficulty / 2);
    
    boss.current = {
      active: true,
      maxHealth: totalBatches * sigilsPerBatch,
      currentSigils: generateSymbols(sigilsPerBatch, biomeDifficulty * 2),
      remainingSigilsBatchCount: totalBatches - 1,
      x: width / 2,
      y: height * 0.2,
      color: BIOME_DATA[initialBiome].color,
      scale: 1,
      attackTimer: 0
    };
  };

  const spawnEnemy = (width: number, height: number, isBossMinion: boolean = false) => {
    const side = isBossMinion ? 0 : Math.floor(Math.random() * 4); 
    let x = 0, y = 0;
    const buffer = 50;

    if (isBossMinion && boss.current) {
        x = boss.current.x;
        y = boss.current.y;
    } else {
        switch(side) {
          case 0: x = Math.random() * width; y = -buffer; break;
          case 1: x = width + buffer; y = Math.random() * height; break;
          case 2: x = Math.random() * width; y = height + buffer; break;
          case 3: x = -buffer; y = Math.random() * height; break;
        }
    }

    const biomeDifficulty = biomeIndex + 1;
    const levelDifficulty = gameState.current.level;
    const scoreFactor = Math.floor(gameState.current.score / 50);
    
    let numSymbols = 1;
    if (levelDifficulty > 2) numSymbols = Math.random() > 0.7 ? 2 : 1;
    if (levelDifficulty > 5) numSymbols = Math.random() > 0.5 ? 2 : 1;
    if (levelDifficulty > 8) numSymbols = Math.random() > 0.3 ? 3 : 2;
    
    if (isBossMinion) {
        numSymbols = 1;
    }

    const difficultyVal = biomeDifficulty + (levelDifficulty * 0.5) + (scoreFactor * 0.1);
    const symbols = generateSymbols(numSymbols, difficultyVal);
    
    const enemiesList = BIOME_DATA[initialBiome].enemies;
    const randomIcon = enemiesList[Math.floor(Math.random() * enemiesList.length)];

    const id = Math.random().toString(36).substr(2, 9);
    enemies.current.push({
      id,
      x,
      y,
      speed: Math.min(GAME_CONFIG.ENEMY_SPEED_BASE + (difficultyVal * 0.1), GAME_CONFIG.ENEMY_SPEED_MAX) * (isBossMinion ? 1.5 : 1),
      symbols,
      color: COLORS[symbols[0]] || '#fff',
      radius: GAME_CONFIG.ENEMY_RADIUS * (isBossMinion ? 0.7 : 1),
      type: isBossMinion ? 'projectile' : 'minion',
      icon: randomIcon,
    });
  };

  const createParticles = (x: number, y: number, color: string, count: number = 10, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1) * speedMult;
      particles.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
        size: Math.random() * 3 + 2
      });
    }
  };

  const checkVictoryCondition = () => {
    if (initialLevel < 11) {
      const threshold = LEVEL_SCORE_THRESHOLDS[initialLevel - 1] || 999;
      if (gameState.current.score >= threshold && !gameState.current.isVictory) {
        gameState.current.isVictory = true;
        setUiState(prev => ({ ...prev, isVictory: true }));
        playSound('win');
      }
    } else if (initialLevel === 11 && boss.current && boss.current.remainingSigilsBatchCount <= 0 && boss.current.currentSigils.length === 0 && !gameState.current.isVictory) {
        gameState.current.isVictory = true;
        setUiState(prev => ({ ...prev, isVictory: true }));
        playSound('win');
    }
  };

  const useSkill = (skillId: 'shield' | 'hourglass' | 'bomb') => {
    const skill = gameState.current.skills[skillId];

    if (!skill.unlocked || skill.cooldown > 0 || gameState.current.isPaused || gameState.current.isGameOver) return;

    playSound('skill');
    skill.isActive = true;
    skill.cooldown = skill.maxCooldown;

    if (skillId === 'bomb') {
        createParticles(window.innerWidth / 2, window.innerHeight / 2, '#fbbf24', 50, 5);
        enemies.current.forEach(e => {
            createParticles(e.x, e.y, '#ef4444', 10);
        });
        enemies.current = [];
        if (boss.current) {
             if (boss.current.currentSigils.length > 0) {
                 boss.current.currentSigils.shift();
                 createParticles(boss.current.x, boss.current.y, boss.current.color, 15);
             }
        }
    }

    // Force update UI to show cooldown
    setUiState(prev => ({ ...prev, skills: { ...gameState.current.skills } }));
  };

  // --- Draw Helpers ---
  
  const drawSprite = (ctx: CanvasRenderingContext2D, type: string, x: number, y: number, radius: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#111'; // Darker body fill
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 5;
      ctx.shadowColor = color;

      switch (type) {
        case SPRITES.GHOST:
            ctx.beginPath();
            ctx.arc(0, -radius*0.2, radius, Math.PI, 0);
            ctx.lineTo(radius, radius);
            ctx.quadraticCurveTo(radius/2, radius*0.5, 0, radius);
            ctx.quadraticCurveTo(-radius/2, radius*0.5, -radius, radius);
            ctx.lineTo(-radius, -radius*0.2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(-8, -5, 3, 0, Math.PI*2);
            ctx.arc(8, -5, 3, 0, Math.PI*2);
            ctx.fill();
            break;
        case SPRITES.BAT:
            ctx.beginPath();
            ctx.arc(0, 0, radius*0.6, 0, Math.PI*2); 
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(radius*0.6, 0);
            ctx.quadraticCurveTo(radius*1.5, -radius*0.8, radius*1.5, 0);
            ctx.quadraticCurveTo(radius, radius*0.5, radius*0.6, 0);
            ctx.moveTo(-radius*0.6, 0);
            ctx.quadraticCurveTo(-radius*1.5, -radius*0.8, -radius*1.5, 0);
            ctx.quadraticCurveTo(-radius, radius*0.5, -radius*0.6, 0);
            ctx.stroke();
            break;
        case SPRITES.SLIME:
            ctx.beginPath();
            ctx.arc(0, radius*0.3, radius*0.8, 0, Math.PI, true);
            ctx.quadraticCurveTo(radius*0.8, radius*0.8, 0, radius*0.8);
            ctx.quadraticCurveTo(-radius*0.8, radius*0.8, -radius*0.8, radius*0.3);
            ctx.fill();
            ctx.stroke();
            break;
        case SPRITES.EYE:
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius*0.6, 0, 0, Math.PI*2);
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, radius*0.3, 0, Math.PI*2);
            ctx.fillStyle = color;
            ctx.fill();
            break;
        case SPRITES.SKULL:
            ctx.beginPath();
            ctx.rect(-radius*0.6, -radius*0.8, radius*1.2, radius*1.2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(-radius*0.3, radius*0.4, radius*0.6, radius*0.4);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(-7, -2, 4, 0, Math.PI*2);
            ctx.arc(7, -2, 4, 0, Math.PI*2);
            ctx.fill();
            break;
        case SPRITES.ELEMENTAL:
        case SPRITES.CRYSTAL:
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(radius*0.7, -radius*0.3);
            ctx.lineTo(radius, 0);
            ctx.lineTo(radius*0.7, radius*0.3);
            ctx.lineTo(0, radius);
            ctx.lineTo(-radius*0.7, radius*0.3);
            ctx.lineTo(-radius, 0);
            ctx.lineTo(-radius*0.7, -radius*0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case SPRITES.WOLF:
             ctx.beginPath();
             ctx.moveTo(-radius*0.6, -radius*0.6);
             ctx.lineTo(-radius*0.3, -radius*0.3);
             ctx.lineTo(radius*0.3, -radius*0.3);
             ctx.lineTo(radius*0.6, -radius*0.6);
             ctx.lineTo(radius*0.5, 0);
             ctx.lineTo(0, radius*0.8);
             ctx.lineTo(-radius*0.5, 0);
             ctx.closePath();
             ctx.fill();
             ctx.stroke();
             break;
        case SPRITES.SPIDER:
             ctx.beginPath();
             ctx.arc(0, 0, radius*0.5, 0, Math.PI*2);
             ctx.fill();
             ctx.stroke();
             for(let i=0; i<4; i++) {
                 const yOff = (i-1.5) * (radius*0.4);
                 ctx.beginPath();
                 ctx.moveTo(radius*0.4, yOff);
                 ctx.lineTo(radius*1.2, yOff - radius*0.2);
                 ctx.lineTo(radius*1.4, yOff + radius*0.2);
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(-radius*0.4, yOff);
                 ctx.lineTo(-radius*1.2, yOff - radius*0.2);
                 ctx.lineTo(-radius*1.4, yOff + radius*0.2);
                 ctx.stroke();
             }
             break;
        default:
            // Bosses or fallback
            if (type.startsWith('BOSS')) {
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
                // Crown
                ctx.strokeStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(-radius, -radius);
                ctx.lineTo(-radius*0.5, -radius*1.5);
                ctx.lineTo(0, -radius*0.8);
                ctx.lineTo(radius*0.5, -radius*1.5);
                ctx.lineTo(radius, -radius);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
      }
      ctx.restore();
  };

  const gameLoop = useCallback((time: number) => {
      const deltaTime = time - lastTime.current;
      lastTime.current = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure canvas size
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
      }
      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // --- Game Logic ---
      
      // Setup Boss
      if (gameState.current.level === 11 && !boss.current && !gameState.current.isVictory && !gameState.current.isGameOver) {
          initBoss(width, height);
      }

      const active = gameState.current.isPlaying && !gameState.current.isPaused && !gameState.current.isGameOver && !gameState.current.isVictory;

      // Skill Cooldowns
      if (active) {
          Object.values(gameState.current.skills).forEach((skill: SkillState) => {
              if (skill.isActive) {
                  skill.activeDuration -= deltaTime;
                  if (skill.activeDuration <= 0) {
                      skill.isActive = false;
                      skill.activeDuration = SKILL_CONFIG[skill.id.toUpperCase() as keyof typeof SKILL_CONFIG].duration;
                  }
              }
              if (skill.cooldown > 0) {
                  skill.cooldown -= deltaTime;
              }
          });
      }

      // Spawning
      if (active && !boss.current) {
         const spawnRate = Math.max(GAME_CONFIG.SPAWN_RATE_MIN, GAME_CONFIG.SPAWN_RATE_INITIAL - (gameState.current.globalLevel * 50));
         if (time - lastSpawnTime.current > spawnRate) {
             spawnEnemy(width, height);
             lastSpawnTime.current = time;
         }
      } else if (active && boss.current && boss.current.active) {
          if (time - boss.current.attackTimer > 3000) {
              spawnEnemy(width, height, true);
              boss.current.attackTimer = time;
          }
      }

      // Slow motion if Hourglass active
      const timeScale = gameState.current.skills.hourglass.isActive ? 0.2 : 1.0;

      // Update Enemies
      for (let i = enemies.current.length - 1; i >= 0; i--) {
          const enemy = enemies.current[i];
          if (active) {
              const dx = (width / 2) - enemy.x;
              const dy = (height / 2) - enemy.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist > 0) {
                  enemy.x += (dx / dist) * enemy.speed * timeScale;
                  enemy.y += (dy / dist) * enemy.speed * timeScale;
              }

              // Collision
              const collisionDist = GAME_CONFIG.PLAYER_RADIUS + enemy.radius;
              if (dist < collisionDist) {
                  // Hit Player
                  if (!gameState.current.skills.shield.isActive) {
                      gameState.current.health -= 1;
                      playSound('damage');
                      createParticles(width/2, height/2, '#ef4444', 20);
                      
                      if (gameState.current.health <= 0) {
                          gameState.current.isGameOver = true;
                          setUiState(prev => ({ ...prev, isGameOver: true }));
                          playSound('gameover');
                      } else {
                          setUiState(prev => ({ ...prev, health: gameState.current.health }));
                      }
                  } else {
                      playSound('hit'); // Blocked
                  }
                  
                  enemies.current.splice(i, 1);
                  continue;
              }
          }

          // Draw Enemy
          drawSprite(ctx, enemy.icon, enemy.x, enemy.y, enemy.radius, enemy.color);
          
          // Draw Symbols
          ctx.font = "bold 24px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          enemy.symbols.forEach((sym, idx) => {
               const yOff = -enemy.radius - 20 - (idx * 25);
               ctx.fillStyle = '#000';
               ctx.fillText(SYMBOLS[sym], enemy.x + 2, enemy.y + yOff + 2);
               ctx.fillStyle = COLORS[sym];
               ctx.fillText(SYMBOLS[sym], enemy.x, enemy.y + yOff);
          });
      }

      // Update & Draw Boss
      if (boss.current && boss.current.active) {
          const b = boss.current;
          drawSprite(ctx, BIOME_DATA[initialBiome].boss, b.x, b.y, 60, b.color);
          
          // Boss Sigils
          const batchWidth = b.currentSigils.length * 30;
          b.currentSigils.forEach((sym, idx) => {
               const bx = b.x - batchWidth/2 + (idx * 30) + 15;
               const by = b.y - 80;
               ctx.font = "bold 32px monospace";
               ctx.fillStyle = '#000';
               ctx.fillText(SYMBOLS[sym], bx + 2, by + 2);
               ctx.fillStyle = COLORS[sym];
               ctx.fillText(SYMBOLS[sym], bx, by);
          });
          
          // Health Bar
          const maxH = (3 + biomeIndex + 1) * (2 + Math.floor((biomeIndex + 1)/2));
          const currentH = (b.remainingSigilsBatchCount * (2 + Math.floor((biomeIndex + 1)/2))) + b.currentSigils.length;
          
          ctx.fillStyle = '#333';
          ctx.fillRect(b.x - 50, b.y + 70, 100, 10);
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - 50, b.y + 70, 100 * (currentH / maxH), 10);
      }

      // Draw Player
      ctx.beginPath();
      ctx.arc(width/2, height/2, GAME_CONFIG.PLAYER_RADIUS, 0, Math.PI*2);
      ctx.fillStyle = gameState.current.skills.shield.isActive ? '#60a5fa' : '#334155';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Cat Face
      const cx = width/2;
      const cy = height/2;
      ctx.fillStyle = '#1e293b';
      // Ears
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 25);
      ctx.lineTo(cx - 30, cy - 50);
      ctx.lineTo(cx - 5, cy - 35);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy - 25);
      ctx.lineTo(cx + 30, cy - 50);
      ctx.lineTo(cx + 5, cy - 35);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fbbf24'; // Amber eyes
      ctx.beginPath();
      ctx.ellipse(cx - 12, cy - 10, 6, 8, -0.2, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 12, cy - 10, 6, 8, 0.2, 0, Math.PI*2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx - 12, cy - 10, 2, 6, -0.2, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 12, cy - 10, 2, 6, 0.2, 0, Math.PI*2);
      ctx.fill();

      
      // Draw Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
          const p = particles.current[i];
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.life -= 0.02 * timeScale;
          p.size *= 0.95;
          
          if (p.life <= 0) {
              particles.current.splice(i, 1);
              continue;
          }
          
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
      }

      // Draw Current Path
      if (currentPath.current.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          
          ctx.moveTo(currentPath.current[0].x, currentPath.current[0].y);
          for (let i = 1; i < currentPath.current.length; i++) {
              ctx.lineTo(currentPath.current[i].x, currentPath.current[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
      }

      checkVictoryCondition();
      
      // Update UI state periodically for skills only, avoiding heavy re-renders
      // But we need to sync skills cooldown visually
      if (Math.random() > 0.9) {
          setUiState(prev => ({
              ...prev,
              skills: {...gameState.current.skills}
          }));
      }

      requestRef.current = requestAnimationFrame(gameLoop);
  }, [biomeIndex, initialBiome, initialLevel, spawnEnemy, initBoss]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  // --- Input Handlers ---
  const handleStart = (e: React.PointerEvent) => {
      if (!gameState.current.isPlaying || gameState.current.isPaused || gameState.current.isGameOver) return;
      isDrawing.current = true;
      currentPath.current = [{x: e.clientX, y: e.clientY}];
      playSound('draw');
  };

  const handleMove = (e: React.PointerEvent) => {
      if (!isDrawing.current) return;
      // Add point if distance is enough
      const last = currentPath.current[currentPath.current.length - 1];
      const dist = Math.sqrt(Math.pow(e.clientX - last.x, 2) + Math.pow(e.clientY - last.y, 2));
      if (dist > 5) {
          currentPath.current.push({x: e.clientX, y: e.clientY});
      }
  };

  const handleEnd = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      
      const gesture = recognizeGesture(currentPath.current);
      currentPath.current = [];

      if (gesture === GestureType.NONE) return;

      let hit = false;
      
      // Check Enemies
      const enemiesToRemove: number[] = [];
      enemies.current.forEach((enemy, idx) => {
          if (enemy.symbols[0] === gesture) {
              enemy.symbols.shift();
              hit = true;
              createParticles(enemy.x, enemy.y, COLORS[gesture], 5);
              
              if (enemy.symbols.length === 0) {
                  enemiesToRemove.push(idx);
                  gameState.current.score += 10;
                  setUiState(prev => ({...prev, score: gameState.current.score}));
              }
          }
      });

      // Remove dead enemies (reverse order to keep indices valid)
      for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
          const idx = enemiesToRemove[i];
          const e = enemies.current[idx];
          createParticles(e.x, e.y, e.color, 15);
          enemies.current.splice(idx, 1);
      }
      
      // Check Boss
      if (boss.current && boss.current.active && boss.current.currentSigils.length > 0) {
          if (boss.current.currentSigils[0] === gesture) {
              boss.current.currentSigils.shift();
              hit = true;
              createParticles(boss.current.x, boss.current.y, COLORS[gesture], 8);
              
              // Refill sigils if batch done
              if (boss.current.currentSigils.length === 0 && boss.current.remainingSigilsBatchCount > 0) {
                  boss.current.remainingSigilsBatchCount--;
                  const biomeDifficulty = biomeIndex + 1;
                  const sigilsPerBatch = 2 + Math.floor(biomeDifficulty / 2);
                  boss.current.currentSigils = generateSymbols(sigilsPerBatch, biomeDifficulty * 2);
                  playSound('damage'); // Boss phase change sound
              } else if (boss.current.currentSigils.length === 0 && boss.current.remainingSigilsBatchCount === 0) {
                  // Boss Dead handled in game loop / checkVictory
                  createParticles(boss.current.x, boss.current.y, '#fff', 50);
                  boss.current = null; // Remove boss
              }
          }
      }

      if (hit) playSound('hit');
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none touch-none">
        <canvas 
            ref={canvasRef}
            className="block w-full h-full"
            onPointerDown={handleStart}
            onPointerMove={handleMove}
            onPointerUp={handleEnd}
            onPointerLeave={handleEnd}
        />

        {/* HUD */}
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start">
            <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-white font-spice text-xl">
                     <span className="text-gray-400">{playerName}</span>
                     <span className="text-yellow-400">Score: {uiState.score}</span>
                 </div>
                 <div className="flex gap-1">
                     {[...Array(gameState.current.maxHealth)].map((_, i) => (
                         <Heart 
                           key={i} 
                           fill={i < uiState.health ? "#ef4444" : "none"} 
                           className={i < uiState.health ? "text-red-500" : "text-gray-700"}
                         />
                     ))}
                 </div>
            </div>
            
            <div className="flex gap-4 pointer-events-auto">
                 {/* Pause Button */}
                 <button onClick={() => {
                     gameState.current.isPaused = !gameState.current.isPaused;
                     setUiState(prev => ({...prev, isPaused: gameState.current.isPaused}));
                 }} className="bg-white/10 p-2 rounded-full backdrop-blur-md hover:bg-white/20 transition">
                     {uiState.isPaused ? <Play className="text-white"/> : <Pause className="text-white"/>}
                 </button>
            </div>
        </div>

        {/* Skills HUD */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6 pointer-events-auto">
             <div onClick={() => useSkill('shield')} className={`flex flex-col items-center gap-1 transition ${uiState.skills.shield.unlocked && uiState.skills.shield.cooldown <= 0 ? 'cursor-pointer opacity-100 hover:scale-110' : 'opacity-40 cursor-not-allowed'}`}>
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black/50 backdrop-blur ${uiState.skills.shield.isActive ? 'border-blue-400 animate-pulse' : 'border-gray-600'}`}>
                      <Shield className="text-blue-400" />
                  </div>
                  <span className="text-[10px] text-white font-bold uppercase">{t.shield}</span>
             </div>
             <div onClick={() => useSkill('hourglass')} className={`flex flex-col items-center gap-1 transition ${uiState.skills.hourglass.unlocked && uiState.skills.hourglass.cooldown <= 0 ? 'cursor-pointer opacity-100 hover:scale-110' : 'opacity-40 cursor-not-allowed'}`}>
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black/50 backdrop-blur ${uiState.skills.hourglass.isActive ? 'border-purple-400 animate-pulse' : 'border-gray-600'}`}>
                      <Hourglass className="text-purple-400" />
                  </div>
                  <span className="text-[10px] text-white font-bold uppercase">{t.reflex}</span>
             </div>
             <div onClick={() => useSkill('bomb')} className={`flex flex-col items-center gap-1 transition ${uiState.skills.bomb.unlocked && uiState.skills.bomb.cooldown <= 0 ? 'cursor-pointer opacity-100 hover:scale-110' : 'opacity-40 cursor-not-allowed'}`}>
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black/50 backdrop-blur ${uiState.skills.bomb.isActive ? 'border-red-400 animate-pulse' : 'border-gray-600'}`}>
                      <Bomb className="text-red-400" />
                  </div>
                  <span className="text-[10px] text-white font-bold uppercase">{t.meow}</span>
             </div>
        </div>

        {/* Level Progress */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
             <div className="bg-black/40 backdrop-blur px-4 py-1 rounded-full border border-white/10 text-xs text-gray-300 font-bold uppercase tracking-widest">
                 {BIOME_DATA[initialBiome].name[language]} • {t.level} {initialLevel}
             </div>
        </div>

        {/* Modals */}
        {uiState.isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center pointer-events-auto">
                    <h2 className="text-4xl text-white font-spice mb-4">{t.paused}</h2>
                    <button onClick={onExit} className="button-85 flex items-center gap-2 mx-auto">
                        <Home size={18} /> {t.exitRun}
                    </button>
                </div>
            </div>
        )}

        {uiState.isGameOver && (
             <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex items-center justify-center z-50">
                <div className="text-center pointer-events-auto p-8 bg-black/80 rounded-2xl border border-red-900/50 shadow-2xl">
                    <h2 className="text-4xl text-red-500 font-spice mb-2">{t.defeat}</h2>
                    <p className="text-gray-400 mb-6">{t.defeatMsg}</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={onExit} className="button-85">
                            {t.returnHome}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {uiState.isVictory && (
             <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-md flex items-center justify-center z-50">
                <div className="text-center pointer-events-auto p-8 bg-black/80 rounded-2xl border border-blue-900/50 shadow-2xl">
                    <h2 className="text-4xl text-blue-400 font-spice mb-2">{t.victory}</h2>
                    <p className="text-gray-400 mb-6">{t.victoryMsg}</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => onLevelComplete(gameState.current.score, !!boss.current)} className="button-85 flex items-center gap-2">
                            {t.nextStage} <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GameEngine;