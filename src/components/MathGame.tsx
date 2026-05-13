import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, CheckCircle2, XCircle } from 'lucide-react';

interface Problem {
  id: number;
  question: string;
  answer: number;
  options: number[];
}

const WIN_OFFSET = 150; // Pixels from center to win
const CPU_STRENGTH = 0.5; // How fast CPU pulls (per second)

const Fireworks = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: "50%", y: "100%", scale: 0 }}
          animate={{
            x: [`${40 + Math.random() * 20}%`, `${Math.random() * 100}%`],
            y: ["100%", `${Math.random() * 50}%`],
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 5)],
            boxShadow: '0 0 10px currentColor'
          }}
        />
      ))}
    </div>
  );
};

export default function MathGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [ropeOffset, setRopeOffset] = useState(0); // 0 is center, negative is left player, positive is right player
  const [leftProblem, setLeftProblem] = useState<Problem | null>(null);
  const [rightProblem, setRightProblem] = useState<Problem | null>(null);
  const [leftFeedback, setLeftFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [rightFeedback, setRightFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const [score, setScore] = useState(0);

  // Customization state
  const [playerCount, setPlayerCount] = useState<number>(3); // 1, 2, 4 (Jamoa)
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [grade, setGrade] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'oson' | 'ortacha' | 'qiyin'>('oson');
  const [targetScore, setTargetScore] = useState<number>(5);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);

  const getTimeForProblem = useCallback(() => {
    // Base time: 5th grade gets more, 11th grade gets less base time per complexity?
    // Actually, higher grades need more time for harder operations.
    let base = 10;
    if (grade > 7) base += 5; // Extra for multiplication
    if (grade > 9) base += 5; // Extra for larger numbers

    const diffFactor = difficulty === 'oson' ? 1.5 : difficulty === 'ortacha' ? 1 : 0.7;
    return Math.round(base * diffFactor);
  }, [grade, difficulty]);

  const generateProblem = useCallback((side: 'left' | 'right') => {
    const operators = grade < 7 ? ['+', '-'] : ['+', '-', '*'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, answer;

    const multiplier = grade - 4;
    const diffBonus = difficulty === 'oson' ? 1 : difficulty === 'ortacha' ? 2 : 3;

    if (op === '+') {
      a = Math.floor(Math.random() * 20 * multiplier * diffBonus) + 1;
      b = Math.floor(Math.random() * 20 * multiplier * diffBonus) + 1;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 30 * multiplier * diffBonus) + 20;
      b = Math.floor(Math.random() * a);
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 8 * multiplier) + 2;
      b = Math.floor(Math.random() * 8 * multiplier) + 2;
      answer = a * b;
    }

    const options = new Set<number>();
    options.add(answer);
    while (options.size < 4) {
      const wrong = answer + (Math.floor(Math.random() * 20) - 10);
      if (wrong !== answer && wrong >= 0) options.add(wrong);
    }

    const newProb = {
      id: Math.random(),
      question: `${a} ${op === '*' ? '×' : op} ${b} = ?`,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5),
    };

    if (side === 'left') setLeftProblem(newProb);
    else setRightProblem(newProb);
  }, [grade, difficulty]);

  const startGame = () => {
    setRopeOffset(0);
    setScore(0);
    setWinner(null);
    setLeftFeedback(null);
    setRightFeedback(null);
    setGameState('playing');
    const initialTime = getTimeForProblem();
    setTimeLeft(initialTime);
    setMaxTime(initialTime);
    generateProblem('left');
    generateProblem('right');
  };

  // Timer Countdown
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timeout!
          setLeftFeedback('wrong');
          setRopeOffset(p => Math.min(WIN_OFFSET, p + 20)); // Pull to robot side
          setTimeout(() => {
            setLeftFeedback(null);
            const nextTime = getTimeForProblem();
            setTimeLeft(nextTime);
            setMaxTime(nextTime);
            generateProblem('left');
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, winner, generateProblem, getTimeForProblem]);


  const handleAnswer = (selected: number, side: 'left' | 'right') => {
    const problem = side === 'left' ? leftProblem : rightProblem;
    const feedbackSetter = side === 'left' ? setLeftFeedback : setRightFeedback;
    const feedback = side === 'left' ? leftFeedback : rightFeedback;

    if (!problem || feedback !== null) return;

    if (selected === problem.answer) {
      feedbackSetter('correct');
      setRopeOffset(prev => {
        const pullStep = WIN_OFFSET / targetScore;
        const pull = side === 'left' ? -pullStep : pullStep;
        const next = prev + pull;
        
        if (next <= -WIN_OFFSET) {
          setWinner('left');
          setGameState('gameover');
          return -WIN_OFFSET;
        }
        if (next >= WIN_OFFSET) {
          setWinner('right');
          setGameState('gameover');
          return WIN_OFFSET;
        }
        return next;
      });

      if (side === 'left') setScore(s => s + 1);

      setTimeout(() => {
        feedbackSetter(null);
        if (side === 'left') {
          const nextTime = getTimeForProblem();
          setTimeLeft(nextTime);
          setMaxTime(nextTime);
        }
        generateProblem(side);
      }, 500);
    } else {
      feedbackSetter('wrong');
      setRopeOffset(prev => {
        const penalty = side === 'left' ? 15 : -15;
        return Math.max(-WIN_OFFSET, Math.min(WIN_OFFSET, prev + penalty));
      });
      setTimeout(() => {
        feedbackSetter(null);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-400 to-green-500 p-4 font-sans overflow-hidden">
      {/* Game Title */}
      <div className="absolute top-8 text-center z-10 w-full px-4">
        <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-wider uppercase bg-red-600/20 py-2 px-6 rounded-full inline-block border-4 border-white">
          Matematik o'yin
        </h1>
      </div>

      {/* Main Arena */}
      <div className="relative w-full max-w-6xl h-[600px] flex flex-col items-center justify-center">
        {/* The Field */}
        <div className="absolute inset-0 bg-white/10 rounded-3xl border-4 border-white/30 backdrop-blur-sm -z-10" />
        
        {/* Center Line */}
        <div className="absolute left-1/2 h-full w-1 bg-white/50 border-dashed border-l-2 border-white/80" />

        {/* Tug of War Component */}
        <div className="relative w-full h-48 flex items-center justify-center overflow-visible">
          <motion.div 
            className="relative h-4 bg-orange-800 rounded-full shadow-lg border-2 border-orange-950 flex items-center"
            animate={{ x: -ropeOffset }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            style={{ width: '120%' }}
          >
            <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.5)_10px,rgba(0,0,0,0.5)_20px)]" />
            
            {/* Left Player Side */}
            <div className="absolute -left-12 flex items-center gap-1">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="flex flex-col items-center relative">
                  {/* Doppi (Skullcap) */}
                  <div className="absolute -top-3 w-8 h-4 bg-slate-900 rounded-t-full border border-white/20 z-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:3px_3px]" />
                  </div>

                  {/* Head (Now light brown and less circular) */}
                  <div className={`w-13 h-14 bg-[#d2b48c] rounded-2xl border-2 border-white shadow-md flex items-center justify-center text-2xl z-10 relative`}>
                    {/* Hair/Braids for Girl */}
                    {gender === 'girl' && (
                      <>
                        <div className="absolute -left-3 top-4 w-4 h-14 bg-slate-800 rounded-full border border-slate-950" />
                        <div className="absolute -right-3 top-4 w-4 h-14 bg-slate-800 rounded-full border border-slate-950" />
                      </>
                    )}
                    <span className="relative -top-1">
                      {gender === 'boy' ? '👦' : '👧'}
                    </span>
                  </div>

                  {/* Body / Outfit */}
                  <div className="relative w-12 h-16 -mt-2">
                    {gender === 'girl' ? (
                      /* Atlas Dress */
                      <div className="w-full h-full bg-pink-500 rounded-t-xl relative overflow-hidden shadow-inner border-x border-pink-600">
                        <div className="absolute inset-0 opacity-60 bg-[repeating-linear-gradient(45deg,#fbbf24_0px,#fbbf24_5px,#ec4899_5px,#ec4899_10px,#06b6d4_10px,#06b6d4_15px)]" />
                      </div>
                    ) : (
                      /* Boy's Outfit: Nimcha + Blue Pants */
                      <div className="w-full h-full flex flex-col">
                        <div className="w-full h-10 bg-white rounded-t-lg relative overflow-hidden border-x border-slate-200">
                           <div className="absolute inset-y-0 left-1 w-10 bg-slate-900 rounded-t-sm shadow-md">
                             <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,#fbbf24_1px,transparent_1px)] bg-[size:4px_4px]" />
                           </div>
                        </div>
                        <div className="w-full h-8 bg-blue-800 shadow-inner rounded-b-sm border-x border-blue-950" />
                      </div>
                    )}
                  </div>

                  {/* Shoes (Qora tufli) */}
                  <div className="flex gap-2 -mt-1">
                    <div className="w-5 h-3 bg-black rounded-full shadow-lg" />
                    <div className="w-5 h-3 bg-black rounded-full shadow-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Player Side (CPU Kids) */}
            <div className="absolute -right-12 flex items-center gap-1">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="flex flex-col items-center relative">
                   {/* Doppi */}
                   <div className="absolute -top-3 w-8 h-4 bg-slate-800 rounded-t-full border border-white/20 z-20">
                     <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:3px_3px]" />
                   </div>

                  <div className="w-13 h-14 bg-[#c3a17e] rounded-2xl border-2 border-white shadow-md flex items-center justify-center text-2xl z-10 opacity-90">
                    <span className="relative -top-1">👦</span>
                  </div>
                  <div className="relative w-12 h-16 -mt-2">
                    <div className="w-full h-full flex flex-col">
                      <div className="w-full h-10 bg-slate-100 rounded-t-lg relative overflow-hidden border-x border-slate-300">
                         <div className="absolute inset-y-0 left-1 w-10 bg-red-900 rounded-t-sm shadow-md opacity-80" />
                      </div>
                      <div className="w-full h-8 bg-slate-800 shadow-inner rounded-b-sm border-x border-slate-900" />
                    </div>
                  </div>
                  {/* Shoes */}
                  <div className="flex gap-2 -mt-1">
                    <div className="w-5 h-3 bg-black rounded-full opacity-80 shadow-md" />
                    <div className="w-5 h-3 bg-black rounded-full opacity-80 shadow-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Center Ribbon */}
            <div className="absolute left-1/2 -translate-x-1/2 w-4 h-12 bg-yellow-400 border-2 border-white shadow-md rounded-full -top-4" />
          </motion.div>
        </div>

        {/* Problems Under Players */}
        <div className="w-full grid grid-cols-2 gap-12 px-8 mt-12 h-64">
          {/* Left Problem (User) */}
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {gameState === 'playing' && leftProblem && (
                <motion.div 
                  key={leftProblem.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`bg-white/95 rounded-3xl p-6 shadow-2xl border-4 transition-colors w-full max-w-sm ${
                    leftFeedback === 'correct' ? 'border-green-500' : leftFeedback === 'wrong' ? 'border-red-500' : 'border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">1-O'yinchi</p>
                    <div className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      ⌛ {timeLeft}s
                    </div>
                  </div>
                  
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <motion.div 
                      className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                      initial={{ width: "100%" }}
                      animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>

                  <h3 className="text-3xl font-black text-center text-slate-800 mb-6">{leftProblem.question}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {leftProblem.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt, 'left')}
                        disabled={leftFeedback !== null}
                        className={`
                          py-4 px-2 text-xl font-black rounded-xl transition-all active:scale-95
                          ${leftFeedback === null ? 'bg-blue-100 text-blue-900 border-b-4 border-blue-200 hover:bg-blue-200' : ''}
                          ${leftFeedback === 'correct' && opt === leftProblem.answer ? 'bg-green-500 text-white border-b-4 border-green-700' : ''}
                          ${leftFeedback === 'wrong' && opt !== leftProblem.answer ? 'bg-red-200 text-red-900 border-b-4 border-red-300' : ''}
                        `}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Problem (Player 2) */}
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {gameState === 'playing' && rightProblem && (
                <motion.div 
                  key={rightProblem.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`bg-white/95 rounded-3xl p-6 shadow-2xl border-4 transition-colors w-full max-w-sm ${
                    rightFeedback === 'correct' ? 'border-green-500' : rightFeedback === 'wrong' ? 'border-red-500' : 'border-red-500'
                  }`}
                >
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-center mb-2">2-O'yinchi misoli</p>
                  <h3 className="text-3xl font-black text-center text-slate-800 mb-6">{rightProblem.question}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {rightProblem.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt, 'right')}
                        disabled={rightFeedback !== null}
                        className={`
                          py-4 px-2 text-xl font-black rounded-xl transition-all active:scale-95
                          ${rightFeedback === null ? 'bg-red-100 text-red-900 border-b-4 border-red-200 hover:bg-red-200' : ''}
                          ${rightFeedback === 'correct' && opt === rightProblem.answer ? 'bg-green-500 text-white border-b-4 border-green-700' : ''}
                          ${rightFeedback === 'wrong' && opt !== rightProblem.answer ? 'bg-red-200 text-red-900 border-b-4 border-red-300' : ''}
                        `}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Start / Game Over Screens */}
      <div className="mt-4 w-full max-w-4xl">
        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Complex Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {/* 1. Grade Selection */}
                <div className="bg-white/90 p-4 rounded-2xl shadow-lg border-2 border-white">
                  <p className="text-slate-800 font-bold mb-3 uppercase text-xs tracking-widest text-center">Sinfni tanlang</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 6, 7, 8, 9, 10, 11].map(s => (
                      <button
                        key={s}
                        onClick={() => setGrade(s)}
                        className={`py-2 rounded-lg font-black transition-all ${
                          grade === s ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Difficulty */}
                <div className="bg-white/90 p-4 rounded-2xl shadow-lg border-2 border-white">
                  <p className="text-slate-800 font-bold mb-3 uppercase text-xs tracking-widest text-center">Qiyinlik darajasi</p>
                  <div className="flex gap-2">
                    {(['oson', 'ortacha', 'qiyin'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-3 rounded-lg font-black capitalize transition-all ${
                          difficulty === d ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Players & Gender */}
                <div className="bg-white/90 p-4 rounded-2xl shadow-lg border-2 border-white flex flex-col gap-4">
                  <div className="flex flex-col">
                    <p className="text-slate-800 font-bold mb-2 uppercase text-[10px] tracking-widest text-center">Jamoa va Jins</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 4].map(n => (
                        <button key={n} onClick={() => setPlayerCount(n)} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${playerCount === n ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                          {n === 4 ? 'Jamoa' : `${n} ta`}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {(['boy', 'girl'] as const).map(g => (
                        <button key={g} onClick={() => setGender(g)} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${gender === g ? 'bg-pink-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                          {g === 'boy' ? 'O\'g\'il' : 'Qiz'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Target Score */}
                <div className="bg-white/90 p-4 rounded-2xl shadow-lg border-2 border-white lg:col-span-3">
                  <p className="text-slate-800 font-bold mb-3 uppercase text-xs tracking-widest text-center">Nechta misol yechilsin? (G'alaba uchun)</p>
                  <div className="flex gap-4">
                    {[5, 10, 15, 20].map(val => (
                      <button
                        key={val}
                        onClick={() => setTargetScore(val)}
                        className={`flex-1 py-3 rounded-xl font-black transition-all ${
                          targetScore === val ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {val} ta
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative inline-flex items-center gap-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 px-12 py-6 rounded-full text-3xl font-black shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <Play size={40} fill="currentColor" />
                O'YINNI BOSHLASH
                <div className="absolute -top-4 -right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse border-2 border-white shadow-lg">OMAD!</div>
              </button>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 bg-white rounded-3xl p-10 text-center shadow-2xl border-8 border-yellow-400 relative overflow-hidden"
            >
              {winner === 'left' && <Fireworks />}
              {winner === 'left' ? (
                <>
                  <div className="flex justify-center mb-4 relative z-10">
                    <Trophy size={80} className="text-yellow-400 animate-bounce" />
                  </div>
                  <h2 className="text-5xl font-black text-green-600 mb-2 relative z-10">QAHRABON!</h2>
                  <p className="text-xl text-slate-600 mb-6 font-bold relative z-10">Siz g'olib bo'ldingiz!</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <XCircle size={80} className="text-red-500" />
                  </div>
                  <h2 className="text-5xl font-black text-red-600 mb-2">YUTQAZDINGIZ</h2>
                  <p className="text-xl text-slate-600 mb-6 font-bold">Raqib kuchliroq chiqdi.</p>
                </>
              )}
              
              <div className="flex flex-col gap-4">
                <div className="bg-slate-100 py-3 px-6 rounded-xl font-bold text-slate-500">
                  Topilgan misollar: <span className="text-slate-900 text-2xl">{score}</span>
                </div>
                <button 
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-2xl text-2xl font-black transition-all shadow-lg active:scale-95"
                >
                  <RotateCcw size={28} />
                  QAYTADAN BOSHLASH
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Indicators */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
        <CheckCircle2 size={20} className="text-white" />
        <span className="text-white font-black text-xl">{score}</span>
      </div>

      {/* Sound/Setting placeholders or simple guide */}
      <div className="absolute bottom-4 right-4 text-white/50 text-[10px] font-mono leading-none tracking-widest uppercase">
        Matematika Master v1.0
      </div>
    </div>
  );
}
