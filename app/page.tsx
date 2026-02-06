"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function MoneyDropFinal() {
  const [gameState, setGameState] = useState<'NAME_ENTRY' | 'INTRO' | 'CATEGORY_SELECT' | 'PLAYING' | 'DROPPING' | 'RESULT' | 'WINNER'>('NAME_ENTRY');
  const [players, setPlayers] = useState({ p1: '', p2: '' });
  const [level, setLevel] = useState(1);
  const [totalMoney, setTotalMoney] = useState(25000000);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [usedQuestions, setUsedQuestions] = useState<number[]>([]);
  const [bets, setBets] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [revealingSlot, setRevealingSlot] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  
  // Stable Audio Links
  const audioFiles = {
    trayOpen: "https://actions.google.com/sounds/v1/doors/metal_door_open.ogg",
    heartbeat: "https://actions.google.com/sounds/v1/human_voices/heartbeat.ogg",
    success: "https://actions.google.com/sounds/v1/cartoon/clinker_win_02.ogg",
    click: "https://actions.google.com/sounds/v1/foley/mechanical_switch.ogg",
    bgm: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    drop: "https://actions.google.com/sounds/v1/doors/garage_door_open.ogg",
    coin: "https://actions.google.com/sounds/v1/coins/coin_in_hand.ogg"
  };

  // Enhanced playSound with fallback
  const playSound = (url: string, vol = 0.5) => {
    try {
      const audio = new Audio(url);
      audio.volume = vol;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const initGame = () => {
    if (!players.p1.trim() || !players.p2.trim()) {
      alert("Please enter both player names!");
      return;
    }
    
    try {
      if (!bgmRef.current) {
        bgmRef.current = new Audio(audioFiles.bgm);
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.15;
      }
      bgmRef.current.play().catch(() => {});
    } catch (e) {}
    
    // Smooth transition with animation
    setTimeout(() => setGameState('INTRO'), 500);
  };

  const BET_STEP = 500000;

  const getVisibleSlots = () => {
    if (level <= 4) return ['A', 'B', 'C', 'D'];
    if (level <= 7) return ['A', 'B', 'C'];
    return ['A', 'B'];
  };

  async function fetchCategories() {
    if (level > 8) { setGameState('WINNER'); return; }
    const { data } = await supabase.from('questions').select('category').eq('difficulty', level);
    if (data && data.length > 0) {
      const unique = Array.from(new Set(data.map((d: any) => d.category))).sort(() => Math.random() - 0.5).slice(0, 2);
      setCategories(unique as string[]);
      // Smooth transition
      setTimeout(() => setGameState('CATEGORY_SELECT'), 800);
    }
  }

  async function startRound(cat: string) {
    setSelectedCategory(cat);
    playSound(audioFiles.click, 0.3);
    
    const { data } = await supabase.from('questions').select('*').eq('category', cat).eq('difficulty', level);
    if (data && data.length > 0) {
      const available = data.filter(q => !usedQuestions.includes(q.id));
      const q = available.length > 0 ? available[0] : data[0];
      setCurrentQuestion(q);
      setUsedQuestions(prev => [...prev, q.id]);
      setBets({ A: 0, B: 0, C: 0, D: 0 });
      setTimeLeft(60);
      
      // Smooth transition with loading state
      setTimeout(() => {
        setGameState('PLAYING');
        if (bgmRef.current) bgmRef.current.playbackRate = 1.0;
      }, 600);
    }
  }

  useEffect(() => {
    let timer: any;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(p => p - 1);
        if (timeLeft <= 10 && timeLeft > 0) {
          playSound(audioFiles.heartbeat, 0.3);
          if (bgmRef.current) bgmRef.current.playbackRate = 1.2;
        }
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') handleDrop();
    return () => clearInterval(timer);
  }, [timeLeft, gameState]);

  const handleDrop = async () => {
    if (!currentQuestion) return;
    setGameState('DROPPING');
    playSound(audioFiles.drop, 0.6);
    
    const slots = getVisibleSlots();
    for (const slot of slots) {
      if (slot !== currentQuestion.correct_answer) {
        setRevealingSlot(slot);
        setIsShaking(true);
        playSound(audioFiles.trayOpen, 0.5);
        setTimeout(() => setIsShaking(false), 400);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    
    setRevealingSlot('FINAL');
    setTimeout(() => {
      const winAmount = bets[currentQuestion.correct_answer] || 0;
      setTotalMoney(winAmount);
      setGameState('RESULT');
      if (winAmount > 0) {
        playSound(audioFiles.success, 0.6);
        playSound(audioFiles.coin, 0.4);
      }
    }, 800);
  };

  const handleBet = (option: string, isIncrement: boolean) => {
    playSound(audioFiles.click, 0.2);
    const currentBet = bets[option] || 0;
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    
    if (isIncrement) {
      if (totalBet + BET_STEP <= totalMoney) {
        setBets(p => ({...p, [option]: currentBet + BET_STEP}));
      }
    } else {
      setBets(p => ({...p, [option]: Math.max(0, currentBet - BET_STEP)}));
    }
  };

  // --- Enhanced UI Screens ---

  if (gameState === 'NAME_ENTRY') return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-10 rounded-3xl border border-slate-700/50 w-full max-w-md text-center backdrop-blur-xl shadow-2xl z-10"
      >
        <div className="mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl mb-6 shadow-lg"
          >
            <h1 className="text-4xl font-black bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent italic tracking-tight">
              MONEY DROP
            </h1>
          </motion.div>
          <p className="text-slate-400 text-sm font-medium">Risk it all to win it all</p>
        </div>
        
        <div className="space-y-6 mb-8">
          <div className="relative">
            <label className="block text-left text-sm font-semibold text-slate-400 mb-2 ml-1">PLAYER 1</label>
            <input 
              className="w-full bg-slate-900/50 border-2 border-slate-700 p-4 rounded-xl text-center text-lg font-medium outline-none focus:border-blue-500 transition-all duration-300 placeholder:text-slate-500 hover:border-slate-600"
              placeholder="Enter name"
              value={players.p1}
              onChange={e => setPlayers({...players, p1: e.target.value})}
            />
          </div>
          
          <div className="relative">
            <label className="block text-left text-sm font-semibold text-slate-400 mb-2 ml-1">PLAYER 2</label>
            <input 
              className="w-full bg-slate-900/50 border-2 border-slate-700 p-4 rounded-xl text-center text-lg font-medium outline-none focus:border-cyan-500 transition-all duration-300 placeholder:text-slate-500 hover:border-slate-600"
              placeholder="Enter name"
              value={players.p2}
              onChange={e => setPlayers({...players, p2: e.target.value})}
            />
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={initGame}
          disabled={!players.p1.trim() || !players.p2.trim()}
          className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 py-4 rounded-xl font-black text-lg hover:shadow-xl transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span className="flex items-center justify-center gap-2">
            START MISSION
            <motion.span 
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-xl"
            >
              →
            </motion.span>
          </span>
        </motion.button>
        
        <p className="text-xs text-slate-500 mt-6">Enter both player names to continue</p>
      </motion.div>
    </div>
  );

  if (gameState === 'INTRO') return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-blue-950/30 to-black relative overflow-hidden">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          type: "spring",
          stiffness: 100
        }}
        onAnimationComplete={() => setTimeout(fetchCategories, 1200)}
        className="text-center z-10"
      >
        <div className="mb-8">
          <p className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-4">Level {level}</p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-8xl font-black italic bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent"
          >
            STAGE {level}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400 text-lg mt-4"
          >
            Prepare for the challenge
          </motion.p>
        </div>
        
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            repeat: Infinity,
            duration: 2
          }}
          className="text-4xl"
        >
          ⚡
        </motion.div>
      </motion.div>
      
      {/* Animated background rings */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              delay: i * 0.5
            }}
            className="absolute inset-1/4 border-2 border-blue-500/20 rounded-full"
          />
        ))}
      </div>
    </div>
  );

  if (gameState === 'CATEGORY_SELECT') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/10 to-slate-950 text-white p-4 relative overflow-hidden">
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 z-10"
      >
        <p className="text-blue-400 font-bold tracking-[0.3em] text-sm mb-2 uppercase">Select Your Category</p>
        <h2 className="text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Choose Wisely
        </h2>
        <p className="text-slate-400 mt-2">Level {level} • ${totalMoney.toLocaleString()}</p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10">
        {categories.map((cat, index) => (
          <motion.button
            key={cat}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startRound(cat)}
            className="relative p-12 bg-gradient-to-br from-slate-900/80 to-slate-950/90 border-2 border-slate-700/50 rounded-3xl text-2xl font-bold hover:border-blue-500/50 transition-all duration-300 shadow-2xl group overflow-hidden"
          >
            {/* Hover effect background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            
            {/* Category text */}
            <span className="relative z-10 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {cat}
            </span>
            
            {/* Decorative element */}
            <div className="absolute bottom-4 right-4 text-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
              {index === 0 ? '' : ''}
            </div>
          </motion.button>
        ))}
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-slate-500 text-sm font-medium z-10"
      >
        <p>Each category has different difficulty questions</p>
      </motion.div>
      
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );

  return (
    <motion.main 
      animate={isShaking ? { x: [-8, 8, -8, 8, 0] } : {}}
      transition={isShaking ? { duration: 0.4 } : {}}
      className={`h-screen flex flex-col bg-gradient-to-b ${timeLeft <= 10 && gameState === 'PLAYING' 
        ? 'from-red-950/30 via-black to-red-950/20' 
        : 'from-slate-950 via-slate-900 to-slate-950'
      } text-white overflow-hidden transition-all duration-500 relative`}
    >
      {/* Emergency timer pulse */}
      {timeLeft <= 10 && gameState === 'PLAYING' && (
        <motion.div 
          animate={{ 
            boxShadow: [
              'inset 0 0 0 0 rgba(239, 68, 68, 0)',
              'inset 0 0 100px 100px rgba(239, 68, 68, 0.1)',
              'inset 0 0 0 0 rgba(239, 68, 68, 0)'
            ]
          }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 pointer-events-none"
        />
      )}

      {/* Enhanced HUD */}
      <div className="flex justify-between items-center bg-gradient-to-r from-black/90 via-black/80 to-black/90 px-8 py-4 border-b border-white/10 h-24 backdrop-blur-lg z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Players</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-300">{players.p1}</span>
              <span className="text-slate-500">&</span>
              <span className="text-xl font-bold text-cyan-300">{players.p2}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bank</span>
            <motion.span 
              key={totalMoney}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-black text-green-400 tabular-nums flex items-center gap-2"
            >
              <span className="text-green-500">$</span>
              {totalMoney.toLocaleString()}
            </motion.span>
          </div>
        </div>
        
        {/* Timer with visual indicator */}
        <div className="relative">
          <div className="text-center">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Time Left</span>
            <motion.div 
              animate={timeLeft <= 10 ? { 
                scale: [1, 1.1, 1],
                color: ["#ef4444", "#f87171", "#ef4444"]
              } : {}}
              transition={timeLeft <= 10 ? { repeat: Infinity, duration: 0.5 } : {}}
              className="relative"
            >
              <span className="text-5xl font-black font-mono tracking-tighter">
                {timeLeft}
              </span>
              {/* Progress ring */}
              <svg className="absolute -inset-2 w-20 h-20 -z-10" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke={timeLeft <= 10 ? "#ef4444" : "#3b82f6"} 
                  strokeWidth="3" 
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * (timeLeft / 60))}
                  className="transition-all duration-1000"
                />
              </svg>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Level</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black italic text-blue-500">{level}</span>
              <span className="text-slate-600">/</span>
              <span className="text-lg text-slate-500">8</span>
            </div>
          </div>
          {selectedCategory && (
            <>
              <div className="h-8 w-px bg-slate-700"></div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Category</span>
                <p className="text-sm font-bold text-blue-300">{selectedCategory}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-between py-8 px-6 relative">
          {/* Question Container */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="w-full max-w-5xl bg-gradient-to-b from-slate-900/40 to-slate-950/60 p-10 rounded-[2.5rem] border-2 border-white/10 shadow-2xl backdrop-blur-sm relative overflow-hidden"
          >
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-blue-500/30 rounded-tl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/30 rounded-br-3xl"></div>
            
            <div className="relative z-10">
              <div className="mb-6">
                <span className="inline-block px-4 py-1.5 bg-blue-500/20 rounded-full text-xs font-bold text-blue-300 uppercase tracking-wider mb-3">
                  Question #{usedQuestions.length}
                </span>
                <h3 className="text-2xl md:text-4xl font-bold leading-tight text-center">
                  {currentQuestion.question_text}
                </h3>
              </div>
              
              {/* Betting info */}
              <div className="flex justify-center items-center gap-6 mt-8">
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Bet</p>
                  <p className="text-xl font-black text-yellow-400">
                    ${Object.values(bets).reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Remaining</p>
                  <p className="text-xl font-black text-green-400">
                    ${(totalMoney - Object.values(bets).reduce((a, b) => a + b, 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Slots Grid */}
          <div className="w-full max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 my-8">
            {getVisibleSlots().map((opt, index) => {
              const isCorrect = opt === currentQuestion.correct_answer;
              const isDropping = revealingSlot === opt || (revealingSlot === 'FINAL' && !isCorrect);
              const optionText = currentQuestion[`option_${opt.toLowerCase()}`];
              const currentBet = bets[opt] || 0;
              
              return (
                <motion.div 
                  key={opt}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex flex-col justify-end min-h-[200px] md:min-h-[260px]"
                >
                  {/* Cash Stack Animation */}
                  <div className="absolute inset-x-0 bottom-32 top-0 flex flex-wrap-reverse justify-center content-start gap-1 p-3 overflow-hidden z-10 pointer-events-none">
                    <AnimatePresence>
                      {[...Array(Math.floor(currentBet / BET_STEP))].map((_, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ y: -100, opacity: 0, rotate: Math.random() * 20 - 10 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          exit={{ 
                            y: 700, 
                            rotate: 45, 
                            opacity: 0,
                            transition: { duration: 0.8 }
                          }} 
                          className="w-10 h-4 bg-gradient-to-r from-green-600 via-green-500 to-green-700 border border-green-400/50 rounded shadow-md"
                        />
                      ))}
                    </AnimatePresence>
                    
                    {/* Empty stack indicator */}
                    {currentBet === 0 && (
                      <motion.div 
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-xs text-slate-600 font-bold mt-4"
                      >
                        NO BET
                      </motion.div>
                    )}
                  </div>

                  {/* Option Tray */}
                  <motion.div 
                    animate={isDropping ? { 
                      rotateX: 110, 
                      y: 180, 
                      opacity: 0,
                      scale: 0.8 
                    } : {}} 
                    transition={{ duration: 0.9, ease: "backIn" }}
                    className={`relative h-24 md:h-32 rounded-2xl flex flex-col items-center justify-center p-4 shadow-2xl overflow-hidden group ${
                      revealingSlot === 'FINAL' && isCorrect 
                        ? 'bg-gradient-to-b from-green-900/40 to-emerald-950/60 border-2 border-green-500/50' 
                        : 'bg-gradient-to-b from-slate-900/80 to-slate-950 border-2 border-slate-700/50'
                    }`}
                  >
                    {/* Option letter badge */}
                    <div className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      isCorrect && revealingSlot === 'FINAL' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {opt}
                    </div>
                    
                    {/* Option content */}
                    <p className="text-xs md:text-sm font-semibold text-center mb-2 px-4 line-clamp-2 text-slate-300">
                      {optionText}
                    </p>
                    <motion.p 
                      key={currentBet}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-2xl md:text-3xl font-black ${
                        currentBet > 0 ? 'text-yellow-400' : 'text-slate-500'
                      } flex items-center gap-1`}
                    >
                      <span className="text-lg">$</span>
                      {currentBet.toLocaleString()}
                    </motion.p>
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </motion.div>

                  {/* Bet Controls */}
                  {gameState === 'PLAYING' && (
                    <div className="flex gap-2 mt-4 z-20">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBet(opt, true)}
                        disabled={Object.values(bets).reduce((a, b) => a + b, 0) + BET_STEP > totalMoney}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 py-3 rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">+</span>
                        <span>500K</span>
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBet(opt, false)}
                        disabled={currentBet === 0}
                        className="px-4 bg-gradient-to-r from-slate-800 to-slate-700 py-3 rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        −
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="h-20 flex items-center justify-center">
            {gameState === 'PLAYING' && timeLeft <= 45 && (
              <motion.button 
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={handleDrop}
                className="relative px-16 py-4 rounded-full text-xl font-black italic shadow-2xl overflow-hidden group"
              >
                {/* Glowing background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 group-hover:from-red-500 group-hover:via-red-400 group-hover:to-orange-400 transition-all duration-300"></div>
                
                {/* Top border effect */}
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-300 via-yellow-300 to-red-300 opacity-60"></div>
                
                {/* Button text */}
                <span className="relative z-10 flex items-center gap-3">
                  <span>EXECUTE DROP</span>
                  <motion.span 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    💣
                  </motion.span>
                </span>
                
                {/* Pulse effect */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 border-2 border-red-400/30 rounded-full"
                />
              </motion.button>
            )}
            
            {gameState === 'RESULT' && (
              <motion.button 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (totalMoney > 0) { 
                    setLevel(l => l + 1); 
                    setGameState('INTRO'); 
                    setRevealingSlot(null); 
                    setSelectedCategory(null);
                  } else {
                    window.location.reload();
                  }
                }}
                className={`px-12 py-4 rounded-full text-lg font-black shadow-2xl flex items-center gap-3 ${
                  totalMoney > 0 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400' 
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                }`}
              >
                {totalMoney > 0 ? (
                  <>
                    <span>NEXT LEVEL</span>
                    <span className="text-xl">→</span>
                  </>
                ) : (
                  <>
                    <span>TRY AGAIN</span>
                    <span className="text-xl">↻</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
          
          {/* Instructions */}
          {gameState === 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-6"
            >
              <p className="text-sm text-slate-500 font-medium">
                Distribute your ${totalMoney.toLocaleString()} across the options. Click +500K to add bets.
              </p>
            </motion.div>
          )}
        </div>
      )}
    </motion.main>
  );
}