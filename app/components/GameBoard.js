"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GameBoard = ({ question, currentMoney, onLevelComplete }) => {
  const [bets, setBets] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [isDropping, setIsDropping] = useState(false);
  const [activeOptions, setActiveOptions] = useState(['A', 'B', 'C', 'D']);
  const [timeLeft, setTimeLeft] = useState(60);

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && !isDropping) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleDrop(); // အချိန်ပြည့်ရင် အလိုအလျောက် အပေါက်ဖွင့်မယ်
    }
  }, [timeLeft, isDropping]);

  const handleBet = (opt, amount) => {
    const totalCurrentBet = Object.values(bets).reduce((a, b) => a + b, 0);
    if (totalCurrentBet + amount <= currentMoney) {
      setBets({ ...bets, [opt]: bets[opt] + amount });
    }
  };

  const handleDrop = () => {
    setIsDropping(true);
    // အဖြေမှန်ကလွဲပြီး ကျန်တဲ့ option တွေကို ဖယ်ထုတ်ပစ်မယ်
    setTimeout(() => {
      const remainingOptions = [question.correct_answer];
      setActiveOptions(remainingOptions);
      
      // အဖြေမှန်ပေါ်က ပိုက်ဆံကိုပဲ နောက်တစ်ဆင့်အတွက် ပေးမယ်
      setTimeout(() => {
        onLevelComplete(bets[question.correct_answer]);
      }, 3000);
    }, 2000); // ၂ စက္ကန့်ကြာရင် အပေါက်ပွင့်မယ်
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Timer & Question */}
      <div className="text-center mb-10">
        <div className="text-6xl font-bold text-yellow-500 mb-4">{timeLeft}</div>
        <h2 className="text-3xl font-semibold bg-blue-900 p-6 rounded-lg shadow-xl">
          {question.question_text}
        </h2>
      </div>

      {/* Betting Slots */}
      <div className="grid grid-cols-4 gap-6 h-[400px]">
        {['A', 'B', 'C', 'D'].map((opt) => (
          <div key={opt} className="relative flex flex-col justify-end">
            
            {/* ပိုက်ဆံပုံလေးများ (Money Bundles Animation) */}
            <div className="flex flex-wrap-reverse justify-center mb-2 overflow-hidden h-full">
              <AnimatePresence>
                {/* ပိုက်ဆံသိန်း ၁၀ စီကို အထုပ်လေးတွေအဖြစ် ပြမယ် */}
                {[...Array(Math.floor(bets[opt] / 10))].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -500, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 800, opacity: 0, transition: { duration: 1, ease: "easeIn" } }}
                    className="w-12 h-6 bg-green-600 border-2 border-green-400 m-1 rounded shadow-md flex items-center justify-center text-[8px] font-bold"
                  >
                    CASH
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Drop Tray (အပေါက်) */}
            <motion.div
              animate={isDropping && opt !== question.correct_answer ? { rotateX: 90, opacity: 0.5 } : {}}
              className={`h-24 border-t-4 border-yellow-600 bg-slate-800 rounded-b-lg flex flex-col items-center justify-center transition-colors ${activeOptions.includes(opt) ? 'bg-slate-700' : 'bg-red-900'}`}
            >
              <span className="text-2xl font-bold">{opt}</span>
              <span className="text-yellow-400 font-mono">{bets[opt]} Lakhs</span>
            </motion.div>

            {/* Betting Buttons */}
            {!isDropping && (
              <button 
                onClick={() => handleBet(opt, 10)}
                className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded shadow-lg active:scale-95 transition"
              >
                + 10 Lakhs
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      {!isDropping && (
        <div className="text-center mt-12">
          <button 
            onClick={handleDrop}
            className="bg-red-600 hover:bg-red-500 text-white text-2xl font-bold px-12 py-4 rounded-full shadow-2xl pulse-animation"
          >
            THE DROP
          </button>
        </div>
      )}
    </div>
  );
};

export default GameBoard;