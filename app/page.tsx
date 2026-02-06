"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function MoneyDropOptimized() {
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
  const [errorMsg, setErrorMsg] = useState('');

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
      setGameState('CATEGORY_SELECT');
    }
  }

  async function startRound(cat: string) {
    const { data } = await supabase.from('questions').select('*').eq('category', cat).eq('difficulty', level);
    if (data && data.length > 0) {
      const available = data.filter(q => !usedQuestions.includes(q.id));
      const finalQ = available.length > 0 ? available[0] : data[0];
      setCurrentQuestion(finalQ);
      setUsedQuestions(prev => [...prev, finalQ.id]);
      setBets({ A: 0, B: 0, C: 0, D: 0 });
      setTimeLeft(60);
      setGameState('PLAYING');
    }
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
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    setRevealingSlot('FINAL');
    setTimeout(() => {
      setTotalMoney(bets[currentQuestion.correct_answer] || 0);
      setGameState('RESULT');
    }, 800);
  };

  // --- Screens ---

  if (gameState === 'NAME_ENTRY') return (
    <div className="flex items-center justify-center min-h-screen bg-[#05070a] text-white">
      <div className="bg-slate-900/40 p-10 rounded-3xl border border-white/10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-black mb-8 tracking-tighter text-blue-500">MONEY DROP MYANMAR</h1>
        <div className="space-y-4 text-sm">
          <input className="w-full bg-black/50 border border-slate-800 p-4 rounded-xl outline-none" placeholder="Player 1" value={players.p1} onChange={e => setPlayers({...players, p1: e.target.value})} />
          <input className="w-full bg-black/50 border border-slate-800 p-4 rounded-xl outline-none" placeholder="Player 2" value={players.p2} onChange={e => setPlayers({...players, p2: e.target.value})} />
          <button onClick={() => players.p1 && players.p2 && setGameState('INTRO')} className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all">START GAME</button>
        </div>
      </div>
    </div>
  );

  if (gameState === 'WINNER') return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#fffdf5] p-8 md:p-12 rounded shadow-2xl w-full max-w-3xl border-[12px] border-double border-yellow-800 text-center text-slate-900">
         <h1 className="text-3xl md:text-5xl font-serif font-bold text-yellow-900 mb-6">CERTIFICATE OF VICTORY</h1>
         <p className="text-xl mb-4 font-bold border-b-2 border-slate-200 inline-block px-10">{players.p1} & {players.p2}</p>
         <p className="my-6 text-sm text-slate-600">Stage (၈) ဆင့်လုံးအား အောင်မြင်စွာဖြေဆိုနိုင်ခဲ့ပါသည်။</p>
         <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Money Won</p>
            <div className="text-4xl md:text-6xl font-black text-green-700 tracking-tighter">{totalMoney.toLocaleString()} Ks</div>
         </div>
         <button onClick={() => window.location.reload()} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-sm">REPLAY</button>
      </motion.div>
    </div>
  );

  if (gameState === 'INTRO') return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} onAnimationComplete={() => setTimeout(fetchCategories, 1200)} className="text-7xl md:text-9xl font-black italic text-white">STAGE {level}</motion.h1>
    </div>
  );

  if (gameState === 'CATEGORY_SELECT') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070a] text-white">
      <p className="text-blue-500 font-bold tracking-widest text-xs mb-8 uppercase">Choose Your Category</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-6">
        {categories.map((cat) => (
          <button key={cat} onClick={() => startRound(cat)} className="p-8 md:p-12 bg-slate-900/50 border border-blue-500/20 rounded-2xl text-2xl md:text-3xl font-bold hover:bg-blue-600 transition-all shadow-lg">{cat}</button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col bg-[#05070a] text-white overflow-hidden">
      {/* Compact HUD Header */}
      <div className="flex justify-between items-center bg-black/60 px-6 py-3 border-b border-white/5">
        <div className="w-1/3">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">{players.p1} & {players.p2}</p>
          <p className="text-xl font-black text-green-400">{totalMoney.toLocaleString()} <span className="text-[10px] font-normal opacity-60">Ks</span></p>
        </div>
        <div className={`text-5xl md:text-6xl font-black font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
        <div className="w-1/3 text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">MISSION</p>
          <p className="text-xl font-black italic">STAGE {level}/8</p>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-2 rounded-full font-bold z-50 text-xs">{errorMsg}</motion.div>}
      </AnimatePresence>

      {currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-4">
          {/* Question Box - Balanced Size */}
          <div className="w-full max-w-4xl bg-slate-900/30 p-8 md:p-12 rounded-3xl border border-white/5 text-center shadow-2xl">
            <h3 className="text-xl md:text-4xl font-bold leading-snug italic tracking-tight">{currentQuestion.question_text}</h3>
          </div>

          {/* Slots Grid - Centered & Properly Scaled */}
          <div className="w-full max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
            {getVisibleSlots().map((opt) => {
              const isCorrect = opt === currentQuestion.correct_answer;
              const shouldDrop = revealingSlot === opt || (revealingSlot === 'FINAL' && !isCorrect);
              return (
                <div key={opt} className="relative flex flex-col justify-end min-h-[220px]">
                  {/* Money Visuals */}
                  <div className="absolute inset-x-0 bottom-24 top-0 flex flex-wrap-reverse justify-center content-start gap-1 p-2 overflow-hidden pointer-events-none z-10">
                    <AnimatePresence>
                      {[...Array(Math.floor((bets[opt] || 0) / BET_STEP))].map((_, i) => (
                        <motion.div key={i} initial={{ y: -200 }} animate={{ y: 0 }} exit={{ y: 500 }} className="w-8 md:w-12 h-4 md:h-6 bg-gradient-to-br from-green-600 to-green-800 border-x border-green-400 rounded-sm shadow-md" />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Tray UI */}
                  <motion.div animate={shouldDrop ? { rotateX: 105, y: 150, opacity: 0 } : {}} transition={{ duration: 1 }} className={`h-24 md:h-32 bg-slate-900 border rounded-2xl flex flex-col items-center justify-center p-3 relative shadow-xl overflow-hidden ${revealingSlot === 'FINAL' && isCorrect ? 'border-green-500 bg-green-950/20' : 'border-white/10'}`}>
                    <p className="text-[10px] md:text-xs font-bold text-center mb-1 z-20 uppercase tracking-tighter opacity-80">{currentQuestion[`option_${opt.toLowerCase()}`]}</p>
                    <p className="text-lg md:text-2xl font-black text-yellow-500 z-20">{(bets[opt] || 0).toLocaleString()}</p>
                  </motion.div>

                  {/* Better Controls */}
                  {gameState === 'PLAYING' && (
                    <div className="flex gap-1.5 mt-2 z-20">
                      <button onClick={() => {
                        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
                        const active = getVisibleSlots();
                        const withMoney = active.filter(s => bets[s] > 0 || s === opt);
                        if (withMoney.length >= active.length && bets[opt] === 0) {
                          setErrorMsg("အနည်းဆုံး တစ်ကွက်လွတ်ရပါမည်");
                          setTimeout(() => setErrorMsg(''), 2000);
                          return;
                        }
                        if (totalBet + BET_STEP <= totalMoney) setBets(p => ({...p, [opt]: (p[opt]||0) + BET_STEP}));
                      }} className="flex-1 bg-blue-600 py-2.5 rounded-lg font-bold text-xs hover:bg-blue-500 active:scale-95 transition-all">+ ၅သိန်း</button>
                      <button onClick={() => setBets(p => ({...p, [opt]: Math.max(0, (p[opt]||0) - BET_STEP)}))} className="px-3 bg-red-950/30 border border-red-900/20 py-2.5 rounded-lg text-[10px] font-bold">လျော့</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex items-center justify-center">
            {gameState === 'PLAYING' && timeLeft <= 30 && (
              <button onClick={handleDrop} className="bg-red-600 px-16 py-3 rounded-full text-xl font-black italic shadow-xl border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all">THE DROP</button>
            )}
            {gameState === 'RESULT' && (
              <button onClick={() => {
                if (totalMoney > 0) { setLevel(l => l + 1); setGameState('INTRO'); setRevealingSlot(null); }
                else window.location.reload();
              }} className="bg-green-600 px-16 py-3 rounded-full text-xl font-black shadow-lg">
                {totalMoney > 0 ? (level === 8 ? "ဂုဏ်ပြုလွှာယူမည်" : "NEXT STAGE") : "TRY AGAIN"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}