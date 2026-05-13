import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap } from 'lucide-react';

interface GameObject {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'obstacle' | 'gem';
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 20;

export default function NeonPulse() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerPos, setPlayerPos] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 });
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [level, setLevel] = useState(1);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const objectIdCounter = useRef(0);

  const spawnObject = useCallback(() => {
    const isGem = Math.random() > 0.8;
    const width = isGem ? 15 : 40 + Math.random() * 60;
    const height = isGem ? 15 : 15;
    const x = Math.random() * (GAME_WIDTH - width);
    
    const newObj: GameObject = {
      id: objectIdCounter.current++,
      x,
      y: -50,
      width,
      height,
      speed: 2 + level * 0.5 + Math.random() * 2,
      type: isGem ? 'gem' : 'obstacle',
    };
    
    setObjects(prev => [...prev, newObj]);
  }, [level]);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      
      // Spawn logic
      if (Math.random() < 0.02 + level * 0.005) {
        spawnObject();
      }

      setObjects(prev => {
        const nextObjects: GameObject[] = [];
        let hitObstacle = false;
        let collectedGem = false;

        for (const obj of prev) {
          const nextY = obj.y + obj.speed;
          
          // Collision detection
          const playerRect = {
            left: playerPos.x - PLAYER_SIZE / 2,
            right: playerPos.x + PLAYER_SIZE / 2,
            top: playerPos.y - PLAYER_SIZE / 2,
            bottom: playerPos.y + PLAYER_SIZE / 2,
          };

          const objRect = {
            left: obj.x,
            right: obj.x + obj.width,
            top: obj.y,
            bottom: obj.y + obj.height,
          };

          const isColliding = 
            playerRect.left < objRect.right &&
            playerRect.right > objRect.left &&
            playerRect.top < objRect.bottom &&
            playerRect.bottom > objRect.top;

          if (isColliding) {
            if (obj.type === 'obstacle') {
              hitObstacle = true;
            } else {
              collectedGem = true;
              continue; // Remove gem
            }
          }

          if (nextY < GAME_HEIGHT) {
            nextObjects.push({ ...obj, y: nextY });
          }
        }

        if (hitObstacle) {
          setGameState('gameover');
          return prev;
        }

        if (collectedGem) {
          setScore(s => {
            const nextScore = s + 10;
            if (nextScore % 100 === 0) setLevel(l => l + 1);
            return nextScore;
          });
        }

        return nextObjects;
      });
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, level, playerPos, spawnObject]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [gameState, updateGame]);

  useEffect(() => {
     const savedHigh = localStorage.getItem('neonPulseHighScore');
     if (savedHigh) setHighScore(parseInt(savedHigh));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('neonPulseHighScore', score.toString());
    }
  }, [score, highScore]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;
    
    const rect = gameContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Constraints
    x = Math.max(PLAYER_SIZE, Math.min(GAME_WIDTH - PLAYER_SIZE, x));
    y = Math.max(PLAYER_SIZE, Math.min(GAME_HEIGHT - PLAYER_SIZE, y));

    setPlayerPos({ x, y });
  };

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setObjects([]);
    setGameState('playing');
    setPlayerPos({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans overflow-hidden select-none">
      <div className="mb-4 flex gap-8 items-end">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-cyan-500 mb-1">Score</p>
          <p className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            {score.toString().padStart(5, '0')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-pink-500 mb-1">High Score</p>
          <p className="text-xl font-mono font-bold text-gray-400">
            {highScore.toString().padStart(5, '0')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-yellow-500 mb-1">Level</p>
          <p className="text-xl font-mono font-bold text-white">
            {level}
          </p>
        </div>
      </div>

      <div 
        ref={gameContainerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        className="relative overflow-hidden bg-gray-900/20 border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)',
               backgroundSize: '40px 40px' 
             }} 
        />

        {gameState === 'playing' && (
          <>
            {/* Player */}
            <motion.div 
              className="absolute bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]"
              style={{ 
                left: playerPos.x - PLAYER_SIZE / 2, 
                top: playerPos.y - PLAYER_SIZE / 2,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE
              }}
            />

            {/* Game Objects */}
            {objects.map(obj => (
              <div
                key={obj.id}
                className={`absolute rounded-full ${
                  obj.type === 'gem' 
                    ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_#facc15]' 
                    : 'bg-pink-500 shadow-[0_0_10px_#ec4899]'
                }`}
                style={{
                  left: obj.x,
                  top: obj.y,
                  width: obj.width,
                  height: obj.height,
                  borderRadius: obj.type === 'gem' ? '50%' : '4px'
                }}
              />
            ))}
          </>
        )}

        {/* Screens */}
        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20"
            >
              <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-500 mb-8">
                NEON PULSE
              </h1>
              <button 
                onClick={startGame}
                className="group relative px-8 py-3 bg-cyan-500 text-black font-bold rounded-lg overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="flex items-center gap-2">
                  <Play size={20} fill="currentColor" />
                  START GAME
                </span>
              </button>
              <p className="mt-8 text-cyan-500/50 text-xs font-mono">MOVE MOUSE TO STEER • COLLECT GEMS • DODGE PINK</p>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-30"
            >
              <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
              <h2 className="text-4xl font-bold text-pink-500 mb-2">GAME OVER</h2>
              <div className="text-center mb-8">
                <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold">Final Score</p>
                <p className="text-5xl font-mono font-bold text-white shadow-cyan-500/50">{score}</p>
              </div>
              
              <button 
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-3 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-400 transition-colors shadow-lg shadow-pink-500/30"
              >
                <RotateCcw size={20} />
                TRY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5 flex items-start gap-3">
          <Zap size={20} className="text-cyan-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-gray-300 uppercase mb-1">Precision Steering</h3>
            <p className="text-[10px] text-gray-500 leading-tight">The pulse follows your every move. Master the slipstream to weave through tight gaps.</p>
          </div>
        </div>
        <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5 flex items-start gap-3">
          <Trophy size={20} className="text-yellow-500 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-gray-300 uppercase mb-1">Level Scaling</h3>
            <p className="text-[10px] text-gray-500 leading-tight">Every 100 points, the speed increases. How long can you survive the surge?</p>
          </div>
        </div>
      </div>
    </div>
  );
}
