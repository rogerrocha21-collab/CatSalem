import React, { useState, useEffect } from 'react';
import GameEngine from './components/GameEngine';
import { Play, Cat, Map, Trophy, Shield, Hourglass, Bomb, Lock, Ghost, Skull, Eye, Gem, Droplets, Flame, Bug, Crown, Moon, PawPrint, BookOpen, MessageSquare } from 'lucide-react';
import { BiomeType, Language } from './types';
import { BIOME_DATA, SPRITES, TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [screen, setScreen] = useState<'NAME' | 'TUTORIAL' | 'MENU' | 'GAME'>('NAME');
  const [playerName, setPlayerName] = useState('');
  const [language, setLanguage] = useState<Language>('pt');
  
  // Progress State
  const [progress, setProgress] = useState<{
    unlockedBiomes: BiomeType[];
    currentBiome: BiomeType;
    currentLevel: number;
    highScore: number;
    skillsUnlocked: string[];
    tutorialSeen: boolean;
  }>({
    unlockedBiomes: ['PLAINS'],
    currentBiome: 'PLAINS',
    currentLevel: 1,
    highScore: 0,
    skillsUnlocked: [],
    tutorialSeen: false
  });

  const t = TRANSLATIONS[language];

  useEffect(() => {
    // Load Save
    const savedName = localStorage.getItem('cat_salem_name');
    const savedProgress = localStorage.getItem('cat_salem_progress');
    const savedLang = localStorage.getItem('cat_salem_lang');
    
    if (savedLang) {
        setLanguage(savedLang as Language);
    }
    
    if (savedName) {
        setPlayerName(savedName);
        setScreen('MENU');
    }
    
    if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
    }
  }, []);

  const saveProgress = (newProgress: any) => {
      localStorage.setItem('cat_salem_progress', JSON.stringify(newProgress));
      setProgress(newProgress);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (playerName.trim().length > 0) {
          localStorage.setItem('cat_salem_name', playerName);
          localStorage.setItem('cat_salem_lang', language);
          
          if (!progress.tutorialSeen) {
            setScreen('TUTORIAL');
          } else {
            setScreen('MENU');
          }
      }
  };

  const finishTutorial = () => {
      const newProgress = { ...progress, tutorialSeen: true };
      saveProgress(newProgress);
      setScreen('MENU');
  };

  const startLevel = () => {
      setScreen('GAME');
  };

  const handleLevelComplete = (score: number, isBoss: boolean) => {
      // Calculate next level logic
      let nextLevel = progress.currentLevel + 1;
      let nextBiome = progress.currentBiome;
      let unlockedBiomes = [...progress.unlockedBiomes];

      if (isBoss) {
          // Boss Defeated, move to next biome
          const biomeOrder: BiomeType[] = ['PLAINS', 'TUNDRA', 'SWAMP', 'VOLCANO', 'MOUNTAIN'];
          const currentIdx = biomeOrder.indexOf(progress.currentBiome);
          if (currentIdx < biomeOrder.length - 1) {
              nextBiome = biomeOrder[currentIdx + 1];
              nextLevel = 1;
              if (!unlockedBiomes.includes(nextBiome)) {
                  unlockedBiomes.push(nextBiome);
              }
          } else {
              nextLevel = 11;
          }
      }

      // Check Skill Unlocks
      const biomeOrder: BiomeType[] = ['PLAINS', 'TUNDRA', 'SWAMP', 'VOLCANO', 'MOUNTAIN'];
      const currentIdx = biomeOrder.indexOf(nextBiome);
      const globalLevel = (currentIdx * 11) + nextLevel;
      
      const newSkills = [...progress.skillsUnlocked];
      if (globalLevel >= 10 && !newSkills.includes('shield')) newSkills.push('shield');
      if (globalLevel >= 15 && !newSkills.includes('hourglass')) newSkills.push('hourglass');
      if (globalLevel >= 30 && !newSkills.includes('bomb')) newSkills.push('bomb');

      const newProgress = {
          ...progress,
          currentBiome: nextBiome,
          currentLevel: nextLevel,
          unlockedBiomes,
          highScore: Math.max(progress.highScore, score),
          skillsUnlocked: newSkills
      };
      
      saveProgress(newProgress);
      setScreen('MENU');
  };

  const handleExit = () => {
      setScreen('MENU');
  };

  const toggleLanguage = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('cat_salem_lang', lang);
  }

  // Helper to map Sprite ID to Lucide Component for UI preview
  const getIconForSprite = (spriteId: string) => {
      switch(spriteId) {
          case SPRITES.GHOST: return <Ghost className="text-white" />;
          case SPRITES.BAT: return <Moon className="text-white" />;
          case SPRITES.SKULL: return <Skull className="text-white" />;
          case SPRITES.EYE: return <Eye className="text-white" />;
          case SPRITES.SLIME: return <Droplets className="text-white" />;
          case SPRITES.ELEMENTAL: return <Flame className="text-white" />;
          case SPRITES.WOLF: return <PawPrint className="text-white" />;
          case SPRITES.SPIDER: return <Bug className="text-white" />;
          case SPRITES.CRYSTAL: return <Gem className="text-white" />;
          default: return <Ghost className="text-white" />;
      }
  };

  // --- Screens ---

  if (screen === 'GAME') {
      return (
          <GameEngine 
            playerName={playerName}
            initialBiome={progress.currentBiome}
            initialLevel={progress.currentLevel}
            onLevelComplete={handleLevelComplete}
            onExit={handleExit}
            language={language}
          />
      );
  }

  if (screen === 'NAME') {
      return (
        <div className="h-screen w-screen bg-[#111] flex flex-col items-center justify-center p-6 text-white font-sans relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => toggleLanguage('pt')} 
                  className={`text-2xl transition-transform hover:scale-110 ${language === 'pt' ? 'opacity-100 scale-110 drop-shadow-lg' : 'opacity-50'}`}
                  title="Português"
                >
                    🇧🇷
                </button>
                <button 
                  onClick={() => toggleLanguage('en')} 
                  className={`text-2xl transition-transform hover:scale-110 ${language === 'en' ? 'opacity-100 scale-110 drop-shadow-lg' : 'opacity-50'}`}
                  title="English"
                >
                    🇺🇸
                </button>
            </div>

            <div className="max-w-md w-full bg-[#222] p-8 rounded-2xl border border-[#333] shadow-2xl relative">
                <div className="flex justify-center mb-6">
                     <div className="w-24 h-24 bg-[#111] rounded-full border-4 border-[#333] flex items-center justify-center shadow-inner">
                         <Cat size={48} className="text-yellow-400" />
                     </div>
                </div>
                <h1 className="text-5xl text-center mb-6 font-spice drop-shadow-md">
                    {t.loginTitle}
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm tracking-widest uppercase font-bold">{t.loginSubtitle}</p>
                <form onSubmit={handleNameSubmit} className="flex flex-col gap-8">
                    <input 
                        type="text" 
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        maxLength={12}
                        className="bg-[#111] border border-[#333] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#555] text-center text-xl font-bold transition-colors"
                        autoFocus
                    />
                    <button 
                        type="submit"
                        disabled={playerName.length === 0}
                        className="button-85 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.startGame}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  if (screen === 'TUTORIAL') {
      return (
          <div className="h-screen w-screen bg-[#111] flex flex-col items-center justify-center p-6 text-white font-sans">
              <div className="max-w-md w-full bg-[#222] p-8 rounded-2xl border border-[#333] shadow-2xl">
                  <h2 className="text-3xl text-center mb-6 font-spice text-yellow-400">{t.tutorial.title}</h2>
                  
                  <div className="space-y-6 mb-8">
                      <div className="flex items-center gap-4">
                          <div className="bg-[#111] p-3 rounded-lg border border-[#333]">
                              <Ghost size={24} className="text-white" />
                          </div>
                          <p className="text-gray-300 text-sm">{t.tutorial.step1}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="bg-[#111] p-3 rounded-lg border border-[#333]">
                              <span className="text-2xl font-bold text-cyan-400">―</span>
                          </div>
                          <p className="text-gray-300 text-sm">{t.tutorial.step2}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="bg-[#111] p-3 rounded-lg border border-[#333]">
                              <Shield size={24} className="text-blue-400" />
                          </div>
                          <p className="text-gray-300 text-sm">{t.tutorial.step3}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="bg-[#111] p-3 rounded-lg border border-[#333]">
                              <Bomb size={24} className="text-red-400" />
                          </div>
                          <p className="text-gray-300 text-sm">{t.tutorial.step4}</p>
                      </div>
                  </div>

                  <button 
                      onClick={finishTutorial}
                      className="button-85 w-full"
                  >
                      {t.tutorial.btn}
                  </button>
              </div>
          </div>
      );
  }

  // MENU SCREEN
  const biomeInfo = BIOME_DATA[progress.currentBiome];

  return (
    <div className="h-screen w-screen bg-[#111] flex flex-col overflow-y-auto text-gray-200 font-sans">
        {/* Header */}
        <div className="p-6 flex justify-between items-center bg-[#111] border-b border-[#222]">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#222] rounded-xl flex items-center justify-center border border-[#333] overflow-hidden relative">
                    <Cat size={24} className="text-yellow-400" />
                </div>
                <div>
                    <h2 className="font-spice text-2xl text-white tracking-wider">{playerName}</h2>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-widest font-bold">
                        <Trophy size={12} /> {t.menuRecord}: {progress.highScore}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-3">
                <a 
                    href="https://t.me/Rurocoli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#222] rounded-full text-gray-400 hover:text-white hover:bg-[#333] transition flex items-center justify-center"
                    title="Feedback"
                >
                    <MessageSquare size={20} />
                </a>

                <button 
                    onClick={() => setScreen('TUTORIAL')}
                    className="p-2 bg-[#222] rounded-full text-gray-400 hover:text-white hover:bg-[#333] transition"
                    title={t.tutorial.title}
                >
                    <BookOpen size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center max-w-lg mx-auto w-full gap-8">
            
            {/* Current Objective */}
            <div className="w-full relative group cursor-default">
                {/* Glow behind card */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 to-blue-900/40 blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                
                <div className="relative w-full rounded-2xl p-8 bg-[#222] border border-[#333] shadow-2xl overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-4 block border-b border-[#333] pb-2 w-full">{t.currentDest}</span>
                        
                        <h1 className={`text-4xl font-spice mb-4 ${biomeInfo.themeColor} drop-shadow-sm`}>{biomeInfo.name[language]}</h1>
                        
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <span className="bg-[#111] border border-[#333] px-4 py-1 rounded-full text-xs font-bold text-gray-400 uppercase tracking-wider">
                               {t.level} {progress.currentLevel}
                            </span>
                            {progress.currentLevel === 11 && (
                                <span className="bg-red-950/30 border border-red-900/50 text-red-500 px-4 py-1 rounded-full text-xs font-extrabold animate-pulse tracking-widest uppercase">
                                    {t.boss}
                                </span>
                            )}
                        </div>

                        <button 
                            onClick={startLevel}
                            className="button-85 w-full flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" /> {t.hunt}
                        </button>
                    </div>
                    
                    {/* Background Deco */}
                    <div className="absolute -right-8 -bottom-8 opacity-5 text-white">
                         <Crown size={180} strokeWidth={1} />
                    </div>
                </div>
            </div>

            {/* Skills Status */}
            <div className="w-full">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-[#222] pb-2">
                    <Map size={12} /> {t.instincts}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {/* Shield */}
                    <div className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${progress.skillsUnlocked.includes('shield') ? 'bg-[#222] border-[#444] shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-[#151515] border-[#222] opacity-40'}`}>
                        {progress.skillsUnlocked.includes('shield') ? (
                            <>
                                <Shield className="text-blue-400 mb-3" strokeWidth={2} />
                                <span className="text-[10px] font-extrabold text-blue-200 uppercase tracking-wider">{t.shield}</span>
                            </>
                        ) : (
                            <>
                                <Lock className="text-gray-700 mb-2" size={16} />
                                <span className="text-[10px] text-gray-600 text-center font-mono font-bold">{t.lvl} 10</span>
                            </>
                        )}
                    </div>
                    
                    {/* Hourglass */}
                    <div className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${progress.skillsUnlocked.includes('hourglass') ? 'bg-[#222] border-[#444] shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-[#151515] border-[#222] opacity-40'}`}>
                        {progress.skillsUnlocked.includes('hourglass') ? (
                            <>
                                <Hourglass className="text-purple-400 mb-3" strokeWidth={2} />
                                <span className="text-[10px] font-extrabold text-purple-200 uppercase tracking-wider">{t.reflex}</span>
                            </>
                        ) : (
                            <>
                                <Lock className="text-gray-700 mb-2" size={16} />
                                <span className="text-[10px] text-gray-600 text-center font-mono font-bold">{t.lvl} 15</span>
                            </>
                        )}
                    </div>

                    {/* Bomb */}
                    <div className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${progress.skillsUnlocked.includes('bomb') ? 'bg-[#222] border-[#444] shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-[#151515] border-[#222] opacity-40'}`}>
                        {progress.skillsUnlocked.includes('bomb') ? (
                            <>
                                <Bomb className="text-red-400 mb-3" strokeWidth={2} />
                                <span className="text-[10px] font-extrabold text-red-200 uppercase tracking-wider">{t.meow}</span>
                            </>
                        ) : (
                            <>
                                <Lock className="text-gray-700 mb-2" size={16} />
                                <span className="text-[10px] text-gray-600 text-center font-mono font-bold">{t.lvl} 30</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bestiary Preview */}
            <div className="w-full">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border-b border-[#222] pb-2">
                    {t.prey}
                </h3>
                <div className="bg-[#222] rounded-xl p-6 border border-[#333] flex flex-wrap gap-6 justify-center">
                    {biomeInfo.enemies.map((spriteId, i) => (
                        <div key={i} className={`text-2xl w-12 h-12 flex items-center justify-center rounded-full bg-[#111] border border-[#333] ${biomeInfo.themeColor}`}>
                            {getIconForSprite(spriteId)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default App;