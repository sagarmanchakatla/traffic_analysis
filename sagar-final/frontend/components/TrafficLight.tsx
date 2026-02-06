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
  isBlinking?: boolean; // New prop for blinking
}

export function TrafficLight({ 
  state, 
  leftState,
  rightState,
  size = 'md',
  showTimer = false,
  secondsRemaining,
  isBlinking = false
}: TrafficLightProps) {
  const sizeClasses = {
    sm: { light: 'w-4 h-4', housing: 'p-1.5 gap-1', pole: 'w-2 h-8' },
    md: { light: 'w-6 h-6', housing: 'p-2 gap-1.5', pole: 'w-3 h-12' },
    lg: { light: 'w-10 h-10', housing: 'p-3 gap-2', pole: 'w-4 h-16' },
  };

  const s = sizeClasses[size];

  // Determine if red light should be blinking
  const getRedLightClass = (currentState: LightState) => {
    const baseClass = `${s.light} rounded-full transition-all duration-300`;
    
    if (currentState === 'red') {
      if (isBlinking) {
        return `${baseClass} bg-red-500 shadow-[0_0_20px_8px_rgba(239,68,68,0.6)] ring-2 ring-red-400`;
      }
      return `${baseClass} bg-red-500 shadow-[0_0_20px_8px_rgba(239,68,68,0.6)] ring-2 ring-red-400`;
    }
    return `${baseClass} bg-red-950 opacity-40`;
  };

  // Helper function to get light class for other lights
  const getLightClass = (lightType: LightState, currentState: LightState) => {
    const baseClass = `${s.light} rounded-full transition-all duration-300`;
    const isActive = currentState === lightType;
    
    switch(lightType) {
      case 'red':
        return getRedLightClass(currentState);
      case 'yellow':
        return `${baseClass} ${isActive ? 'bg-yellow-400 shadow-[0_0_20px_8px_rgba(250,204,21,0.6)] ring-2 ring-yellow-300' : 'bg-yellow-950 opacity-40'}`;
      case 'green':
        return `${baseClass} ${isActive ? 'bg-green-500 shadow-[0_0_20px_8px_rgba(34,197,94,0.6)] ring-2 ring-green-400' : 'bg-green-950 opacity-40'}`;
      default:
        return `${baseClass} bg-gray-900 opacity-40`;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 items-end">
        {/* Left Turn Signal */}
        {leftState && (
           <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
             <div className={getLightClass('red', leftState)} />
             <div className={getLightClass('yellow', leftState)} />
             <div className={getLightClass('green', leftState)}>
               {leftState === 'green' && (
                 <div className="flex items-center justify-center h-full">
                   <span className="text-black font-bold text-[10px] leading-none">←</span>
                 </div>
               )}
             </div>
           </div>
        )}

        {/* Main Signal */}
        <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
          {/* Red Light */}
          <div className={`${getLightClass('red', state)} ${
            isBlinking && state === 'red' ? 'animate-pulse' : ''
          }`} />
          {/* Yellow Light */}
          <div className={getLightClass('yellow', state)} />
          {/* Green Light */}
          <div className={getLightClass('green', state)} />
        </div>

        {/* Right Turn Signal */}
        {rightState && (
           <div className={`bg-zinc-800 rounded-lg ${s.housing} flex flex-col items-center shadow-xl border-2 border-zinc-700`}>
             <div className={getLightClass('red', rightState)} />
             <div className={getLightClass('yellow', rightState)} />
             <div className={getLightClass('green', rightState)}>
               {rightState === 'green' && (
                 <div className="flex items-center justify-center h-full">
                   <span className="text-black font-bold text-[10px] leading-none">→</span>
                 </div>
               )}
             </div>
           </div>
        )}
      </div>
      
      {/* Pole */}
      <div className={`${s.pole} bg-zinc-700 rounded-b`} />
      
      {/* Timer */}
      {showTimer && secondsRemaining !== undefined && (
        <div className="mt-2 bg-zinc-900 px-3 py-1 rounded-full">
          <span className="font-mono font-bold text-white text-lg">
            {secondsRemaining}s
          </span>
        </div>
      )}
    </div>
  );
}