"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function MoneyDropCompact() {
  const [gameState, setGameState] = useState<'NAME_ENTRY' | 'INTRO' | 'CATEGORY_SELECT' | 'PLAYING' | 'DROPPING' | 'RESULT' | 'WINNER'>('NAME_ENTRY');
  const [players, setPlayers] = useState({ p1: '', p2: '' });
  const [level, setLevel] = useState(1);
  const [totalMoney, setTotalMoney] = useState(25000000);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [bets, setBets] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [revealingSlot, setRevealingSlot] = useState<string | null>(null);

  const BET_STEP = 500000;

  const getVisibleSlots = () => {
    if (level <= 4) return ['A', 'B', 'C', 'D'];
    if (level <= 7) return ['A', 'B', 'C'];
    return ['A', 'B'];
  };

  async function fetchCategories() {
    const { data } = await supabase.from('questions').select('category').eq('difficulty', level);
    if (data && data.length > 0) {
      const unique = Array.from(new Set(data.map((d: any) => d.category))).sort(() => Math.random() - 0.5).slice(0, 2);
      setCategories(unique as string[]);
      setGameState('CATEGORY_SELECT');
    } else {
      if (level > 1) setGameState('WINNER');
    }
  }

  useEffect(() => {
    let timer: any;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      handleDrop();
    }
    return () => clearInterval(timer);
  }, [timeLeft, gameState]);

  const handleDrop = async () => {
    if (!currentQuestion) return;
    setGameState('DROPPING');
    const slots = getVisibleSlots();
    for (const slot of slots) {
      if (slot !== currentQuestion.correct_answer) {
        setRevealingSlot(slot);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    setRevealingSlot('FINAL');
    setTimeout(() => {
      const winMoney = bets[currentQuestion.correct_answer] || 0;
      setTotalMoney(winMoney);
      setGameState('RESULT');
    }, 1000);
  };

  async function startRound(cat: string) {
    const { data } = await supabase.from('questions').select('*').eq('category', cat).eq('difficulty', level);
    if (data && data.length > 0) {
      setCurrentQuestion(data[Math.floor(Math.random() * data.length)]);
      setBets({ A: 0, B: 0, C: 0, D: 0 });
      setTimeLeft(60);
      setGameState('PLAYING');
    }
  }

  // --- Screens ---

  if (gameState === 'NAME_ENTRY') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a1a] text-white">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md p-10 rounded-3xl border border-white/10 shadow-2xl w-[400px]">
        <h1 className="text-3xl font-black mb-8 text-center text-blue-400 italic">THE MONEY DROP</h1>
        <div className="space-y-4">
          <input className="w-full bg-black/50 border border-slate-700 p-4 rounded-xl text-center outline-none focus:border-blue-500" placeholder="Player 1" value={players.p1} onChange={e => setPlayers({...players, p1: e.target.value})} />
          <input className="w-full bg-black/50 border border-slate-700 p-4 rounded-xl text-center outline-none focus:border-blue-500" placeholder="Player 2" value={players.p2} onChange={e => setPlayers({...players, p2: e.target.value})} />
          <button onClick={() => players.p1 && players.p2 && setGameState('INTRO')} className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all">ဂိမ်းစတင်မည်</button>
        </div>
      </motion.div>
    </div>
  );

  if (gameState === 'WINNER') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <div className="text-center">
        <h1 className="text-5xl font-black text-yellow-500 mb-4 italic">Congratulations!</h1>
        <p className="text-xl text-slate-400 mb-8">{players.p1} & {players.p2}</p>
        <div className="text-7xl font-black text-green-400 mb-10">{totalMoney.toLocaleString()} Ks</div>
        <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-3 rounded-full font-bold">ပြန်ကစားမည်</button>
      </div>
    </div>
  );

  if (gameState === 'INTRO') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black" onPointerEnter={() => {}}>
      <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onAnimationComplete={() => setTimeout(fetchCategories, 1500)} className="text-9xl font-black italic">STAGE {level}</motion.h1>
    </div>
  );

  if (gameState === 'CATEGORY_SELECT') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a1a] text-white">
      <p className="text-slate-500 uppercase tracking-widest mb-10">Select Topic</p>
      <div className="flex gap-6">
        {categories.map(cat => (
          <button key={cat} onClick={() => startRound(cat)} className="px-12 py-6 bg-blue-900/40 border border-blue-500 rounded-2xl text-2xl font-bold hover:bg-blue-600 transition-all">{cat}</button>
        ))}
      </div>
    </div>
  );

  return (
    <main className={`min-h-screen flex flex-col p-6 transition-colors duration-1000 ${timeLeft <= 10 && timeLeft > 0 ? 'bg-red-950' : 'bg-slate-950'} text-white`}>
      {/* HUD Section */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
        <div className="space-y-1">
          <p className="text-[10px] text-blue-400 font-bold uppercase">{players.p1} & {players.p2}</p>
          <p className="text-3xl font-black text-green-400">{totalMoney.toLocaleString()} <span className="text-xs text-white/50">Ks</span></p>
        </div>
        <div className={`text-7xl font-black font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
        <div className="text-right space-y-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progress</p>
          <p className="text-3xl font-black">STAGE {level}/8</p>
        </div>
      </div>

      {currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Question */}
          <div className="w-full max-w-4xl bg-slate-900/50 p-8 rounded-3xl border border-white/5 text-center mb-10">
            <h3 className="text-3xl font-bold italic leading-relaxed">{currentQuestion.question_text}</h3>
          </div>

          {/* Slots */}
          <div className={`grid grid-cols-${getVisibleSlots().length} gap-4 w-full max-w-6xl h-[300px]`}>
            {getVisibleSlots().map((opt) => {
              const isCorrect = opt === currentQuestion.correct_answer;
              const shouldDrop = revealingSlot === opt || (revealingSlot === 'FINAL' && !isCorrect);
              return (
                <div key={opt} className="relative flex flex-col justify-end">
                  {/* Money Visuals */}
                  <div className="absolute inset-x-0 bottom-32 top-0 flex flex-wrap-reverse justify-center content-start gap-1 p-2 overflow-hidden pointer-events-none z-10">
                    <AnimatePresence>
                      {[...Array(Math.floor((bets[opt] || 0) / BET_STEP))].map((_, i) => (
                        <motion.div key={i} initial={{ y: -400 }} animate={{ y: 0 }} exit={{ y: 800, opacity: 0 }} className="w-10 h-5 bg-green-600 border border-green-300 rounded-sm" />
                      ))}
                    </AnimatePresence>
                  </div>

                  <motion.div animate={shouldDrop ? { rotateX: 110, y: 150, opacity: 0 } : {}} transition={{ duration: 1 }} className={`h-32 bg-slate-900 border-2 rounded-2xl flex flex-col items-center justify-center p-4 relative shadow-xl ${revealingSlot === 'FINAL' && isCorrect ? 'border-green-500 bg-green-950/20' : 'border-slate-800'}`}>
                    <p className="text-sm font-bold text-center mb-2 line-clamp-2">{currentQuestion[`option_${opt.toLowerCase()}`]}</p>
                    <p className="text-2xl font-black text-yellow-500">{(bets[opt] || 0).toLocaleString()}</p>
                  </motion.div>

                  {gameState === 'PLAYING' && (
                    <div className="flex gap-2 mt-3 z-20">
                      <button onClick={() => {
                        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
                        if (totalBet + BET_STEP <= totalMoney) setBets(prev => ({...prev, [opt]: (prev[opt]||0) + BET_STEP}));
                      }} className="flex-1 bg-blue-600 py-3 rounded-xl font-black text-sm hover:bg-blue-500">+ ၅ သိန်း</button>
                      <button onClick={() => setBets(prev => ({...prev, [opt]: Math.max(0, (prev[opt]||0) - BET_STEP)}))} className="px-3 bg-red-950 py-3 rounded-xl text-[10px] font-bold">လျှော့</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="mt-12 h-20">
            {gameState === 'PLAYING' && (
              <>
                {level <= 4 ? (
                  timeLeft <= 30 ? (
                    <button onClick={handleDrop} className="bg-red-600 px-16 py-4 rounded-full text-2xl font-black italic shadow-lg border-b-4 border-red-800 active:border-0 active:translate-y-1 transition-all">THE DROP</button>
                  ) : <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Available in {timeLeft - 30}s</p>
                ) : <p className="text-red-500 font-black uppercase tracking-widest text-sm animate-pulse">Wait for the bell!</p>}
              </>
            )}
            {gameState === 'RESULT' && (
              <button onClick={() => { 
                if(totalMoney > 0) { 
                  if(level === 8) setGameState('WINNER'); 
                  else { setLevel(l => l + 1); setGameState('INTRO'); setRevealingSlot(null); } 
                } else window.location.reload(); 
              }} className="bg-green-600 px-16 py-4 rounded-full text-2xl font-black shadow-lg">
                {totalMoney > 0 ? (level === 8 ? "ဂုဏ်ပြုလွှာ" : "နောက်တစ်ဆင့်") : "ရှုံးပြီ (ပြန်စမည်)"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}