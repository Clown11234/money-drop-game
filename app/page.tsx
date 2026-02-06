"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function MoneyDropFinal() {
  const [gameState, setGameState] = useState<'NAME_ENTRY' | 'INTRO' | 'CATEGORY_SELECT' | 'PLAYING' | 'DROPPING' | 'RESULT' | 'WINNER'>('NAME_ENTRY');
  const [players, setPlayers] = useState({ p1: '', p2: '' });
  const [level, setLevel] = useState(1);
  const [totalMoney, setTotalMoney] = useState(25000000);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [bets, setBets] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [revealingSlot, setRevealingSlot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const BET_STEP = 500000;

  const getVisibleSlots = () => {
    if (level <= 4) return ['A', 'B', 'C', 'D'];
    if (level <= 7) return ['A', 'B', 'C'];
    return ['A', 'B'];
  };

  // Rule Check: အနည်းဆုံး တစ်ကွက် လွတ်နေရမည်
  const canBetOnSlot = (slot: string) => {
    const activeSlots = getVisibleSlots();
    const slotsWithMoney = activeSlots.filter(s => bets[s] > 0 || (s === slot));
    
    // အဖြေအားလုံးထဲက ၁ ကွက် လွတ်ရမည်ဖြစ်သောကြောင့် slotsWithMoney အရေအတွက်သည် စုစုပေါင်းထက် နည်းရမည်
    if (slotsWithMoney.length >= activeSlots.length && bets[slot] === 0) {
      setErrorMsg("အနည်းဆုံး တစ်ကွက် အလွတ်ထားရပါမည်!");
      setTimeout(() => setErrorMsg(''), 2000);
      return false;
    }
    return true;
  };

  async function fetchCategories() {
    const { data } = await supabase.from('questions').select('category').eq('difficulty', level);
    if (data && data.length > 0) {
      const unique = Array.from(new Set(data.map((d: any) => d.category))).sort(() => Math.random() - 0.5).slice(0, 2);
      setCategories(unique as string[]);
      setGameState('CATEGORY_SELECT');
    } else if (level > 1) setGameState('WINNER');
  }

  useEffect(() => {
    let timer: any;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') handleDrop();
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
      setTotalMoney(bets[currentQuestion.correct_answer] || 0);
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

  // --- UI Components ---

  if (gameState === 'NAME_ENTRY') return (
    <div className="flex items-center justify-center min-h-screen bg-[#050508] text-white p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-black mb-8 text-center text-blue-500 italic uppercase">The Money Drop</h1>
        <div className="space-y-4">
          <input className="w-full bg-black/40 border border-slate-700 p-4 rounded-xl text-center outline-none focus:border-blue-500" placeholder="Player 1 Name" value={players.p1} onChange={e => setPlayers({...players, p1: e.target.value})} />
          <input className="w-full bg-black/40 border border-slate-700 p-4 rounded-xl text-center outline-none focus:border-blue-500" placeholder="Player 2 Name" value={players.p2} onChange={e => setPlayers({...players, p2: e.target.value})} />
          <button onClick={() => players.p1 && players.p2 && setGameState('INTRO')} className="w-full bg-blue-600 py-4 rounded-xl font-black text-lg hover:bg-blue-500 transition-all">START GAME</button>
        </div>
      </motion.div>
    </div>
  );

  if (gameState === 'INTRO') return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onAnimationComplete={() => setTimeout(fetchCategories, 1500)} className="text-7xl md:text-[10rem] font-black italic text-white">STAGE {level}</motion.h1>
    </div>
  );

  if (gameState === 'CATEGORY_SELECT') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050508] p-4 text-white">
      <h2 className="text-slate-500 uppercase tracking-widest mb-10 text-sm font-bold">Choose Topic</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {categories.map(cat => (
          <button key={cat} onClick={() => startRound(cat)} className="p-8 md:p-12 bg-blue-900/30 border-2 border-blue-500/50 rounded-3xl text-2xl md:text-4xl font-black hover:bg-blue-600 transition-all">{cat}</button>
        ))}
      </div>
    </div>
  );

  return (
    <main className={`min-h-screen flex flex-col p-4 md:p-6 transition-colors duration-1000 ${timeLeft <= 10 && timeLeft > 0 ? 'bg-red-950' : 'bg-slate-950'} text-white`}>
      {/* Header HUD */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] text-blue-400 font-bold uppercase">{players.p1} & {players.p2}</span>
          <h2 className="text-2xl md:text-4xl font-black text-green-400">{totalMoney.toLocaleString()} <span className="text-xs font-normal">Ks</span></h2>
        </div>
        <div className={`text-5xl md:text-8xl font-black font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">STAGE</span>
          <h2 className="text-2xl md:text-4xl font-black italic">{level}/8</h2>
        </div>
      </div>

      {/* Warning Message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-600 px-6 py-2 rounded-full font-bold shadow-2xl">
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl bg-white/[0.03] p-6 md:p-10 rounded-[2rem] border border-white/10 text-center mb-8 shadow-xl">
            <h3 className="text-xl md:text-4xl font-black leading-tight italic">{currentQuestion.question_text}</h3>
          </div>

          {/* Slots Grid */}
          <div className={`grid grid-cols-2 lg:grid-cols-${getVisibleSlots().length} gap-4 w-full max-w-7xl h-auto min-h-[350px]`}>
            {getVisibleSlots().map((opt) => {
              const isCorrect = opt === currentQuestion.correct_answer;
              const shouldDrop = revealingSlot === opt || (revealingSlot === 'FINAL' && !isCorrect);
              return (
                <div key={opt} className="relative flex flex-col justify-end">
                  {/* Money Visuals */}
                  <div className="absolute inset-x-0 bottom-32 top-0 flex flex-wrap-reverse justify-center content-start gap-1 p-2 overflow-hidden pointer-events-none z-10">
                    <AnimatePresence>
                      {[...Array(Math.floor((bets[opt] || 0) / BET_STEP))].map((_, i) => (
                        <motion.div key={i} initial={{ y: -300 }} animate={{ y: 0 }} exit={{ y: 600, opacity: 0 }} className="w-10 md:w-14 h-5 md:h-7 bg-green-700 border border-green-400 rounded-sm shadow-md" />
                      ))}
                    </AnimatePresence>
                  </div>

                  <motion.div animate={shouldDrop ? { rotateX: 110, y: 150, opacity: 0 } : {}} transition={{ duration: 1 }} className={`h-28 md:h-40 bg-slate-900 border-2 rounded-2xl flex flex-col items-center justify-center p-4 relative shadow-xl ${revealingSlot === 'FINAL' && isCorrect ? 'border-green-500 bg-green-950/20' : 'border-white/5'}`}>
                    <span className="absolute top-1 left-2 text-2xl font-black opacity-10">{opt}</span>
                    <p className="text-[10px] md:text-sm font-bold text-center mb-2 z-20 uppercase line-clamp-2">{currentQuestion[`option_${opt.toLowerCase()}`]}</p>
                    <p className="text-xl md:text-3xl font-black text-yellow-500 z-20">{(bets[opt] || 0).toLocaleString()}</p>
                  </motion.div>

                  {gameState === 'PLAYING' && (
                    <div className="flex gap-2 mt-4 z-20">
                      <button onClick={() => {
                        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
                        if (totalBet + BET_STEP <= totalMoney && canBetOnSlot(opt)) {
                          setBets(prev => ({...prev, [opt]: (prev[opt]||0) + BET_STEP}));
                        }
                      }} className="flex-1 bg-blue-600 py-3 rounded-xl font-black text-xs md:text-base active:scale-90 shadow-lg">+ ၅သိန်း</button>
                      <button onClick={() => setBets(prev => ({...prev, [opt]: Math.max(0, (prev[opt]||0) - BET_STEP)}))} className="px-4 bg-red-950/50 py-3 rounded-xl text-[10px] font-bold uppercase active:bg-red-900 transition-all">လျော့</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="mt-12 h-24">
            {gameState === 'PLAYING' && (
              <>
                {level <= 4 ? (
                  timeLeft <= 30 ? (
                    <button onClick={handleDrop} className="bg-red-600 px-16 py-4 rounded-full text-2xl md:text-4xl font-black italic shadow-2xl active:scale-95 border-b-4 border-red-800">THE DROP</button>
                  ) : <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Wait: {timeLeft - 30}s</p>
                ) : <p className="text-red-500 font-black uppercase text-xs animate-pulse italic">Locked until countdown ends</p>}
              </>
            )}
            {gameState === 'RESULT' && (
              <button onClick={() => { 
                if(totalMoney > 0) { 
                  if(level === 8) setGameState('WINNER'); 
                  else { setLevel(l => l + 1); setGameState('INTRO'); setRevealingSlot(null); } 
                } else window.location.reload(); 
              }} className="bg-green-600 px-16 py-4 rounded-full text-2xl font-black shadow-xl active:scale-95 transition-all">
                {totalMoney > 0 ? (level === 8 ? "ဂုဏ်ပြုလွှာ" : "နောက်တစ်ဆင့်") : "ရှုံးနိမ့်သွားပါပြီ (Useless Brain)"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}