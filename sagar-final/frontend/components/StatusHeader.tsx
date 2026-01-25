'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrafficLight } from './TrafficLight';
import { Play, Square, RotateCcw } from 'lucide-react';

interface StatusHeaderProps {
  isRunning: boolean;
  cycleCount: number;
  phase: 'green' | 'yellow' | 'red';
  activeLane: string | null;
  secondsRemaining: number;
  canStart: boolean;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function StatusHeader({
  isRunning,
  cycleCount,
  phase,
  activeLane,
  secondsRemaining,
  canStart,
  isLoading,
  onStart,
  onStop,
}: StatusHeaderProps) {
  return (
    <Card className="border-none shadow-lg bg-gradient-to-r from-zinc-900 to-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title & Status */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              Traffic Signal Controller
            </h1>
            <p className="text-zinc-400 text-sm">
              Adaptive signal timing based on real-time vehicle detection
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge 
                variant={isRunning ? 'default' : 'secondary'} 
                className={isRunning ? 'bg-green-600 text-white' : ''}
              >
                {isRunning ? 'Simulation Running' : 'Simulation Stopped'}
              </Badge>
              {cycleCount > 0 && (
                <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                  Cycle #{cycleCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Center: Traffic Light & Timer */}
          {isRunning && (
            <div className="flex items-center gap-6 px-8 py-4 bg-zinc-950/50 rounded-xl">
              <TrafficLight state={phase} size="lg" />
              <div className="text-center">
                <div className="text-5xl font-mono font-bold text-white">
                  {secondsRemaining}
                </div>
                <div className="text-zinc-400 text-sm uppercase tracking-wider mt-1">
                  seconds
                </div>
                {activeLane && (
                  <div className="mt-2">
                    <Badge className="bg-blue-600 text-white capitalize">
                      {activeLane.replace('lane', 'Lane ')} - {phase.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Controls */}
          <div className="flex gap-2">
            {!isRunning ? (
              <Button
                size="lg"
                onClick={onStart}
                disabled={!canStart || isLoading}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isLoading ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Simulation
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={onStop}
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
