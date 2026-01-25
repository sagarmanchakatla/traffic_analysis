'use client';

import React from 'react';

type LightState = 'green' | 'yellow' | 'red';

interface TrafficLightProps {
  state: LightState;
  leftState?: LightState;
  rightState?: LightState;
  size?: 'sm' | 'md' | 'lg';
  showTimer?: boolean;
  secondsRemaining?: number;
}

export function TrafficLight({ 
  state, 
  leftState,
  rightState,
  size = 'md',
  showTimer = false,
  secondsRemaining 
}: TrafficLightProps) {
  const sizeClasses = {
    sm: { light: 'w-4 h-4', housing: 'p-1.5 gap-1', pole: 'w-2 h-8' },
    md: { light: 'w-6 h-6', housing: 'p-2 gap-1.5', pole: 'w-3 h-12' },
    lg: { light: 'w-10 h-10', housing: 'p-3 gap-2', pole: 'w-4 h-16' },
  };

  const s = sizeClasses[size];

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 items-end">
        {/* Left Turn Signal */}
        {leftState && (
           <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
             <div className={`${s.light} rounded-full ${leftState === 'red' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-red-950 opacity-30'}`} />
             <div className={`${s.light} rounded-full ${leftState === 'yellow' ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'bg-yellow-950 opacity-30'}`} />
             <div className={`${s.light} rounded-full flex items-center justify-center ${leftState === 'green' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-green-950 opacity-30'}`}>
               {leftState === 'green' && <span className="text-black font-bold text-[10px] leading-none">←</span>}
             </div>
           </div>
        )}

        {/* Main Signal */}
        <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
          {/* Red Light */}
          <div 
            className={`${s.light} rounded-full transition-all duration-300 ${
              state === 'red' 
                ? 'bg-red-500 shadow-[0_0_20px_8px_rgba(239,68,68,0.6)] ring-2 ring-red-400' 
                : 'bg-red-950 opacity-40'
            }`}
          />
          {/* Yellow Light */}
          <div 
            className={`${s.light} rounded-full transition-all duration-300 ${
              state === 'yellow' 
                ? 'bg-yellow-400 shadow-[0_0_20px_8px_rgba(250,204,21,0.6)] ring-2 ring-yellow-300' 
                : 'bg-yellow-950 opacity-40'
            }`}
          />
          {/* Green Light */}
          <div 
            className={`${s.light} rounded-full transition-all duration-300 ${
              state === 'green' 
                ? 'bg-green-500 shadow-[0_0_20px_8px_rgba(34,197,94,0.6)] ring-2 ring-green-400' 
                : 'bg-green-950 opacity-40'
            }`}
          />
        </div>

        {/* Right Turn Signal */}
        {rightState && (
           <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
             <div className={`${s.light} rounded-full ${rightState === 'red' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-red-950 opacity-30'}`} />
             <div className={`${s.light} rounded-full ${rightState === 'yellow' ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'bg-yellow-950 opacity-30'}`} />
             <div className={`${s.light} rounded-full flex items-center justify-center ${rightState === 'green' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-green-950 opacity-30'}`}>
               {rightState === 'green' && <span className="text-black font-bold text-[10px] leading-none">→</span>}
             </div>
           </div>
        )}
      </div>
      
      {/* Pole */}
      <div className={`${s.pole} bg-zinc-700 rounded-b`} />
      
      {/* Timer */}
      {showTimer && secondsRemaining !== undefined && (
        <div className="mt-2 bg-zinc-900 px-3 py-1 rounded-full">
          <span className="font-mono font-bold text-foreground text-lg">
            {secondsRemaining}s
          </span>
        </div>
      )}
    </div>
  );
}
