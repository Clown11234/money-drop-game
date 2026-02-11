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
  const [confettiActive, setConfettiActive] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  
  // Stable Audio Links
  const audioFiles = {
    trayOpen: "https://actions.google.com/sounds/v1/doors/metal_door_open.ogg",
    heartbeat: "https://actions.google.com/sounds/v1/human_voices/heartbeat.ogg",
    success: "https://actions.google.com/sounds/v1/cartoon/clinker_win_02.ogg",
    click: "https://actions.google.com/sounds/v1/foley/mechanical_switch.ogg",
    bgm: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    drop: "https://actions.google.com/sounds/v1/doors/garage_door_open.ogg",
    coin: "https://actions.google.com/sounds/v1/coins/coin_in_hand.ogg",
    fanfare: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg",
    applause: "https://actions.google.com/sounds/v1/crowds/applause.ogg"
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
    if (level > 8) { 
      showWinnerScreen();
      return; 
    }
    const { data } = await supabase.from('questions').select('category').eq('difficulty', level);
    if (data && data.length > 0) {
      const unique = Array.from(new Set(data.map((d: any) => d.category))).sort(() => Math.random() - 0.5).slice(0, 2);
      setCategories(unique as string[]);
      // Smooth transition
      setTimeout(() => setGameState('CATEGORY_SELECT'), 800);
    }
  }

  const showWinnerScreen = () => {
    setConfettiActive(true);
    playSound(audioFiles.fanfare, 0.7);
    playSound(audioFiles.applause, 0.5);
    setGameState('WINNER');
    
    // Show congrats message after a short delay
    setTimeout(() => {
      setShowCongrats(true);
    }, 1500);
  };

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

  // --- WINNER SCREEN ---
  if (gameState === 'WINNER') return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-900/20 via-amber-900/30 to-yellow-900/20 text-white p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {confettiActive && (
        <>
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ 
                y: -100, 
                x: Math.random() * 100 - 50,
                opacity: 0,
                rotate: 0 
              }}
              animate={{ 
                y: window.innerHeight + 100,
                x: Math.random() * 200 - 100,
                opacity: [0, 1, 1, 0],
                rotate: 720
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                ease: "easeIn",
                delay: Math.random() * 1
              }}
            >
              <div className={`text-2xl ${
                ['🎉', '🎊', '✨', '🏆', '💰', '👑', '⭐', '🎯'][Math.floor(Math.random() * 8)]
              }`}>
                {['🎉', '🎊', '✨', '🏆', '💰', '👑', '⭐', '🎯'][Math.floor(Math.random() * 8)]}
              </div>
            </motion.div>
          ))}
          
          {/* Golden shower effect */}
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={`gold-${i}`}
              className="absolute w-3 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ 
                y: -50, 
                opacity: 0,
                rotate: Math.random() * 360
              }}
              animate={{ 
                y: window.innerHeight + 100,
                opacity: [0, 1, 1, 0],
                rotate: 360 + Math.random() * 360
              }}
              transition={{
                duration: 2.5 + Math.random() * 2,
                ease: "easeIn",
                delay: Math.random() * 0.5
              }}
            />
          ))}
        </>
      )}
      
      {/* Main Content */}
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 1,
          type: "spring",
          stiffness: 100
        }}
        className="relative bg-gradient-to-br from-yellow-900/40 via-amber-900/50 to-yellow-900/40 p-8 md:p-12 lg:p-16 rounded-3xl md:rounded-4xl border-4 border-yellow-500/50 w-full max-w-4xl mx-4 md:mx-8 text-center backdrop-blur-2xl shadow-2xl z-10"
      >
        {/* Golden Crown */}
        <motion.div 
          initial={{ y: -100, rotate: -10 }}
          animate={{ y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="text-5xl sm:text-6xl md:text-7xl mb-6 md:mb-8"
        >
          👑
        </motion.div>
        
        {/* Main Title - Responsive font sizes */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 md:mb-8 bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 bg-clip-text text-transparent italic leading-tight"
        >
          VICTORY!
        </motion.h1>
        
        {/* Players Congratulations */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-8 md:mb-12"
        >
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-200 mb-3 md:mb-4 px-2">
            Congratulations Champions!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-8 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">
            <span className="text-yellow-300 break-words text-center">{players.p1}</span>
            <span className="text-amber-500 text-xl sm:text-2xl">&</span>
            <span className="text-amber-300 break-words text-center">{players.p2}</span>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-amber-100 px-2">
            You have conquered all 8 levels!
          </p>
        </motion.div>
        
        {/* Final Prize Display */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.9, type: "spring" }}
          className="mb-8 md:mb-12 p-6 md:p-8 bg-gradient-to-r from-yellow-600/30 via-amber-600/40 to-yellow-600/30 rounded-2xl md:rounded-3xl border-2 border-yellow-500/30"
        >
          <p className="text-lg sm:text-xl md:text-2xl text-amber-200 font-semibold mb-3 md:mb-4">FINAL PRIZE</p>
          <motion.p 
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2, type: "spring" }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-green-400 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 break-words"
          >
            <span className="text-yellow-400 text-2xl sm:text-3xl md:text-4xl">$</span>
            <span>{(totalMoney / 100000).toLocaleString()} သိန်း</span>
          </motion.p>
          <p className="text-sm sm:text-base text-amber-300/80 mt-2">
            (${totalMoney.toLocaleString()})
          </p>
        </motion.div>
        
        {/* Inspirational Message */}
        {showCongrats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mb-8 md:mb-12"
          >
            <div className="text-center space-y-3 md:space-y-4 px-2">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white italic leading-relaxed">
                "The ultimate test of strategy and courage"
              </p>
              <p className="text-sm sm:text-base md:text-lg text-amber-100 leading-relaxed">
                You've proven that with great risk comes great reward!
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Stats Summary - Responsive grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="grid grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12"
        >
          <div className="text-center p-3 sm:p-4 bg-yellow-900/30 rounded-xl md:rounded-2xl border border-yellow-700/30">
            <p className="text-xs sm:text-sm text-amber-300 mb-1 sm:mb-2">Levels</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-400">8/8</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-yellow-900/30 rounded-xl md:rounded-2xl border border-yellow-700/30">
            <p className="text-xs sm:text-sm text-amber-300 mb-1 sm:mb-2">Questions</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-400">{usedQuestions.length}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-yellow-900/30 rounded-xl md:rounded-2xl border border-yellow-700/30">
            <p className="text-xs sm:text-sm text-amber-300 mb-1 sm:mb-2">Final Score</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-400">S++</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-yellow-900/30 rounded-xl md:rounded-2xl border border-yellow-700/30">
            <p className="text-xs sm:text-sm text-amber-300 mb-1 sm:mb-2">Rank</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-400">LEGEND</p>
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1 }}
          className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center"
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setLevel(1);
              setTotalMoney(25000000);
              setUsedQuestions([]);
              setGameState('INTRO');
              setConfettiActive(false);
              setShowCongrats(false);
            }}
            className="px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg md:rounded-xl font-bold sm:font-black text-base sm:text-lg md:text-xl shadow-xl hover:shadow-2xl text-black w-full sm:w-auto"
          >
            PLAY AGAIN
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg md:rounded-xl font-bold sm:font-bold text-base sm:text-lg md:text-xl shadow-xl hover:shadow-2xl border border-gray-600 w-full sm:w-auto"
          >
            MAIN MENU
          </motion.button>
        </motion.div>
        
        {/* Signature */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
          className="mt-8 md:mt-12 pt-4 md:pt-6 border-t border-yellow-700/30"
        >
          <p className="text-amber-300/70 text-xs sm:text-sm px-2">
            Money Drop Ultimate Edition • Champions Club Member
          </p>
        </motion.div>
      </motion.div>
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border-2 border-yellow-500/20 rounded-full"
              style={{
                scale: 1 + i * 0.3,
              }}
              animate={{
                rotate: [0, 360],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 20 + i * 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // --- Enhanced UI Screens ---

  if (gameState === 'NAME_ENTRY') return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-slate-700/50 w-full max-w-md mx-4 text-center backdrop-blur-xl shadow-2xl z-10"
      >
        <div className="mb-8 sm:mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-lg"
          >
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent italic tracking-tight">
              MONEY DROP
            </h1>
          </motion.div>
          <p className="text-slate-400 text-sm font-medium">Risk it all to win it all</p>
        </div>
        
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          <div className="relative">
            <label className="block text-left text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2 ml-1">PLAYER 1</label>
            <input 
              className="w-full bg-slate-900/50 border-2 border-slate-700 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center text-base sm:text-lg font-medium outline-none focus:border-blue-500 transition-all duration-300 placeholder:text-slate-500 hover:border-slate-600"
              placeholder="Enter name"
              value={players.p1}
              onChange={e => setPlayers({...players, p1: e.target.value})}
            />
          </div>
          
          <div className="relative">
            <label className="block text-left text-xs sm:text-sm font-semibold text-slate-400 mb-1 sm:mb-2 ml-1">PLAYER 2</label>
            <input 
              className="w-full bg-slate-900/50 border-2 border-slate-700 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center text-base sm:text-lg font-medium outline-none focus:border-cyan-500 transition-all duration-300 placeholder:text-slate-500 hover:border-slate-600"
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
          className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold sm:font-black text-base sm:text-lg hover:shadow-xl transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span className="flex items-center justify-center gap-2">
            START MISSION
            <motion.span 
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-base sm:text-xl"
            >
              →
            </motion.span>
          </span>
        </motion.button>
        
        <p className="text-xs text-slate-500 mt-4 sm:mt-6">Enter both player names to continue</p>
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
        className="text-center z-10 px-4"
      >
        <div className="mb-6 sm:mb-8">
          <p className="text-blue-400 font-bold tracking-widest text-xs sm:text-sm uppercase mb-3 sm:mb-4">Level {level}</p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl sm:text-7xl md:text-8xl font-black italic bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight"
          >
            STAGE {level}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400 text-base sm:text-lg mt-3 sm:mt-4"
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
          className="text-3xl sm:text-4xl"
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
        className="text-center mb-8 sm:mb-10 z-10 px-4"
      >
        <p className="text-blue-400 font-bold tracking-[0.3em] text-xs sm:text-sm mb-1 sm:mb-2 uppercase">Select Your Category</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent leading-tight">
          Choose Wisely
        </h2>
        <p className="text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">Level {level} • ${totalMoney.toLocaleString()}</p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl z-10 px-4">
        {categories.map((cat, index) => (
          <motion.button
            key={cat}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startRound(cat)}
            className="relative p-8 sm:p-10 md:p-12 bg-gradient-to-br from-slate-900/80 to-slate-950/90 border-2 border-slate-700/50 rounded-2xl sm:rounded-3xl text-xl sm:text-2xl font-bold hover:border-blue-500/50 transition-all duration-300 shadow-2xl group overflow-hidden min-h-[140px] sm:min-h-[160px] md:min-h-[180px]"
          >
            {/* Hover effect background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            
            {/* Category text */}
            <span className="relative z-10 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent break-words px-2">
              {cat}
            </span>
            
            {/* Decorative element */}
            <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 text-2xl sm:text-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
              {index === 0 ? '' : ''}
            </div>
          </motion.button>
        ))}
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 sm:mt-12 text-slate-500 text-xs sm:text-sm font-medium z-10 px-4 text-center"
      >
        <p>Each category has different difficulty questions</p>
      </motion.div>
      
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-48 sm:w-56 md:w-64 h-48 sm:h-56 md:h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-48 sm:w-56 md:w-64 h-48 sm:h-56 md:h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
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
      <div className="flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-black/90 via-black/80 to-black/90 px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-b border-white/10 h-auto sm:h-24 backdrop-blur-lg z-20">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto mb-2 sm:mb-0">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Players</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-base sm:text-lg md:text-xl font-bold text-blue-300 truncate max-w-[80px] sm:max-w-none">{players.p1}</span>
              <span className="text-slate-500 text-sm">&</span>
              <span className="text-base sm:text-lg md:text-xl font-bold text-cyan-300 truncate max-w-[80px] sm:max-w-none">{players.p2}</span>
            </div>
          </div>
          <div className="h-6 sm:h-8 w-px bg-slate-700 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Remain Amount</span>
            <motion.span 
              key={totalMoney}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-lg sm:text-xl md:text-2xl font-black text-green-400 tabular-nums flex items-center gap-1 sm:gap-2"
            >
              {(totalMoney / 100000).toLocaleString()} သိန်း
            </motion.span>
          </div>
        </div>
        
        {/* Timer with visual indicator */}
        <div className="relative order-first sm:order-none mb-2 sm:mb-0">
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
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter">
                {timeLeft}
              </span>
              {/* Progress ring */}
              <svg className="absolute -inset-1 sm:-inset-2 w-16 sm:w-20 h-16 sm:h-20 -z-10" viewBox="0 0 100 100">
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

        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Level</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black italic text-blue-500">{level}</span>
              <span className="text-slate-600">/</span>
              <span className="text-base sm:text-lg text-slate-500">8</span>
            </div>
          </div>
          {selectedCategory && (
            <>
              <div className="h-6 sm:h-8 w-px bg-slate-700 hidden sm:block"></div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Category</span>
                <p className="text-sm font-bold text-blue-300 truncate max-w-[120px] sm:max-w-none">{selectedCategory}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-between py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 relative">
          {/* Question Container */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="w-full max-w-5xl bg-gradient-to-b from-slate-900/40 to-slate-950/60 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] border-2 border-white/10 shadow-2xl backdrop-blur-sm relative overflow-hidden mx-3"
          >
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 border-t-2 border-l-2 border-blue-500/30 rounded-tl-xl sm:rounded-tl-2xl md:rounded-tl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 border-b-2 border-r-2 border-cyan-500/30 rounded-br-xl sm:rounded-br-2xl md:rounded-br-3xl"></div>
            
            <div className="relative z-10">
              <div className="mb-4 sm:mb-6">
                <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500/20 rounded-full text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 sm:mb-3">
                  Question #{usedQuestions.length}
                </span>
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-bold leading-tight text-center px-2">
                  {currentQuestion.question_text}
                </h3>
              </div>
              
              {/* Betting info */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8">
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Amount</p>
                  <p className="text-lg sm:text-xl font-black text-yellow-400">
                    {(Object.values(bets).reduce((a, b) => a + b, 0) / 100000).toLocaleString()} သိန်း
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Remaining</p>
                  <p className="text-lg sm:text-xl font-black text-green-400">
                    {((totalMoney - Object.values(bets).reduce((a, b) => a + b, 0)) / 100000).toLocaleString()} သိန်း
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Slots Grid */}
          <div className="w-full max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 my-4 sm:my-6 md:my-8 px-3 sm:px-4">
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
                  className="relative flex flex-col justify-end min-h-[160px] sm:min-h-[180px] md:min-h-[200px] lg:min-h-[260px]"
                >
                  {/* Cash Stack Animation */}
                  <div className="absolute inset-x-0 bottom-24 sm:bottom-28 md:bottom-32 top-0 flex flex-wrap-reverse justify-center content-start gap-1 p-2 sm:p-3 overflow-hidden z-10 pointer-events-none">
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
                          className="w-8 sm:w-10 h-3 sm:h-4 bg-gradient-to-r from-green-600 via-green-500 to-green-700 border border-green-400/50 rounded shadow-md"
                        />
                      ))}
                    </AnimatePresence>
                    
                    {/* Empty stack indicator */}
                    {currentBet === 0 && (
                      <motion.div 
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-xs text-slate-600 font-bold mt-3 sm:mt-4"
                      >

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
                    className={`relative h-20 sm:h-24 md:h-28 lg:h-32 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-3 sm:p-4 shadow-2xl overflow-hidden group ${
                      revealingSlot === 'FINAL' && isCorrect 
                        ? 'bg-gradient-to-b from-green-900/40 to-emerald-950/60 border-2 border-green-500/50' 
                        : 'bg-gradient-to-b from-slate-900/80 to-slate-950 border-2 border-slate-700/50'
                    }`}
                  >
                    {/* Option letter badge */}
                    <div className={`absolute top-2 sm:top-3 left-2 sm:left-3 w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black ${
                      isCorrect && revealingSlot === 'FINAL' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {opt}
                    </div>
                    
                    {/* Option content */}
                    <p className="text-xs sm:text-sm font-semibold text-center mb-1 sm:mb-2 px-2 sm:px-4 line-clamp-2 text-slate-300 leading-tight">
                      {optionText}
                    </p>
                    <motion.p 
                      key={currentBet}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-black ${
                        currentBet > 0 ? 'text-yellow-400' : 'text-slate-500'
                      } flex items-center gap-1`}
                    >
                      {currentBet > 0 ? (currentBet / 100000).toLocaleString() : '0'} သိန်း
                    </motion.p>
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </motion.div>

                  {/* Bet Controls */}
                  {gameState === 'PLAYING' && (
                    <div className="flex gap-1 sm:gap-2 mt-3 sm:mt-4 z-20">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBet(opt, true)}
                        disabled={Object.values(bets).reduce((a, b) => a + b, 0) + BET_STEP > totalMoney}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-1 sm:gap-2"
                      >
                        <span className="text-sm sm:text-lg">+</span>
                        <span>5 သိန်း</span>
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBet(opt, false)}
                        disabled={currentBet === 0}
                        className="px-2 sm:px-3 md:px-4 bg-gradient-to-r from-slate-800 to-slate-700 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
          <div className="h-16 sm:h-20 flex items-center justify-center px-3">
            {gameState === 'PLAYING' && timeLeft <= 45 && (
              <motion.button 
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={handleDrop}
                className="relative px-8 sm:px-12 md:px-16 py-3 sm:py-4 rounded-full text-base sm:text-lg md:text-xl font-black italic shadow-2xl overflow-hidden group"
              >
                {/* Glowing background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 group-hover:from-red-500 group-hover:via-red-400 group-hover:to-orange-400 transition-all duration-300"></div>
                
                {/* Top border effect */}
                <div className="absolute inset-x-0 top-0 h-1 sm:h-2 bg-gradient-to-r from-red-300 via-yellow-300 to-red-300 opacity-60"></div>
                
                {/* Button text */}
                <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                  <span>DROP</span>
                  <motion.span 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-lg sm:text-xl"
                  >
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
                className={`px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-base sm:text-lg font-black shadow-2xl flex items-center gap-2 sm:gap-3 ${
                  totalMoney > 0 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400' 
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                }`}
              >
                {totalMoney > 0 ? (
                  <>
                    <span>NEXT LEVEL</span>
                    <span className="text-lg sm:text-xl">→</span>
                  </>
                ) : (
                  <>
                    <span>TRY AGAIN</span>
                    <span className="text-lg sm:text-xl">↻</span>
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
              className="text-center mt-4 sm:mt-6 px-3"
            >
            </motion.div>
          )}
        </div>
      )}
    </motion.main>
  );
}