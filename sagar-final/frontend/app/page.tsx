"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { LaneCard } from '@/components/LaneCard';
import { LogPanel, type LogEntry } from '@/components/LogPanel';
import { ComparisonPanel } from '@/components/ComparisonPanel';
import { StatusHeader } from '@/components/StatusHeader';
import { calculateCycle, type CycleResponse } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, BarChart3 } from 'lucide-react';

type Phase = 'green' | 'yellow' | 'red' | 'left-green' | 'left-yellow';
type LaneId = 'lane1' | 'lane2' | 'lane3' | 'lane4';

interface SimulationState {
  activeLaneIndex: number;
  phase: Phase;
  secondsRemaining: number;
  isRunning: boolean;
  cycleCount: number;
}

const LANES: LaneId[] = ['lane1', 'lane2', 'lane3', 'lane4'];
const ALL_RED_TIME = 2;

export default function Home() {
  const [nextImages, setNextImages] = useState<{ [key: string]: File | null }>({
    lane1: null, lane2: null, lane3: null, lane4: null
  });

  const [laneConfig, setLaneConfig] = useState<{ [key: string]: { hasLeft: boolean; hasRight: boolean } }>({
    lane1: { hasLeft: false, hasRight: false },
    lane2: { hasLeft: false, hasRight: false },
    lane3: { hasLeft: false, hasRight: false },
    lane4: { hasLeft: false, hasRight: false },
  });




  const [timings, setTimings] = useState<CycleResponse | null>(null);
  
  const [simState, setSimState] = useState<SimulationState>({
    activeLaneIndex: 0,
    phase: 'red',
    secondsRemaining: 0,
    isRunning: false,
    cycleCount: 0,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((
    message: string, 
    type: LogEntry['type'] = 'info', 
    details?: string
  ) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      type,
      details,
    }, ...prev.slice(0, 49)]);
  }, []);

  const handleFileSelect = (lane: string, file: File) => {
    setNextImages(prev => ({ ...prev, [lane]: file }));
    addLog(`Image selected for ${lane.replace('lane', 'Lane ')}`, 'info', file.name);
  };

  const handleConfigChange = (lane: string, config: { hasLeft: boolean; hasRight: boolean }) => {
    setLaneConfig(prev => ({ ...prev, [lane]: config }));
    addLog(`Config updated for ${lane.replace('lane', 'Lane ')}`, 'info', 
      `Left: ${config.hasLeft ? 'Yes' : 'No'}, Right: ${config.hasRight ? 'Yes' : 'No'}`);
  };




  const canStart = Object.values(nextImages).every(f => f !== null);

  const handleStart = async () => {
    if (!canStart) return;
    setIsLoading(true);
    addLog('Starting simulation...', 'info', 'Processing uploaded images');
    
    try {
      const filesToUpload = nextImages as { [key: string]: File };
      const data = await calculateCycle(filesToUpload, laneConfig);
      setTimings(data);
      
      const firstLane = data.priority[0];
      const firstLaneTiming = data.timings[firstLane];
      
      // Determine initial phase
      let initialPhase: Phase = 'green';
      let initialTime = firstLaneTiming.green;
      
      if (firstLaneTiming.leftGreen && firstLaneTiming.leftGreen > 0) {
        initialPhase = 'left-green';
        initialTime = firstLaneTiming.leftGreen;
      }
      
      setSimState({
        activeLaneIndex: 0,
        phase: initialPhase,
        secondsRemaining: initialTime,
        isRunning: true,
        cycleCount: 1,
      });
      
      addLog('Simulation started successfully', 'success', `Cycle 1 - Total time: ${data.totalTime}s`);
      addLog(`Priority order: ${data.priority.map(l => l.replace('lane', 'L')).join(' → ')}`, 'info');
      
    } catch (error) {
      console.error(error);
      addLog('Failed to start simulation', 'error', 'Check console for details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    setSimState(prev => ({ ...prev, isRunning: false }));
    addLog('Simulation stopped by user', 'warning');
  };

  const handleCycleEnd = useCallback(async () => {
    if (!Object.values(nextImages).every(f => f !== null)) {
      addLog('Missing images for next cycle', 'error');
      setSimState(prev => ({ ...prev, isRunning: false }));
      return;
    }

    addLog('Cycle complete, recalculating...', 'info');

    try {
      const filesToUpload = nextImages as { [key: string]: File };
      const data = await calculateCycle(filesToUpload, laneConfig);
      setTimings(data);
      
      const firstLane = data.priority[0];
      const firstLaneTiming = data.timings[firstLane];
      
      let initialPhase: Phase = 'green';
      let initialTime = firstLaneTiming.green;
      
      if (firstLaneTiming.leftGreen && firstLaneTiming.leftGreen > 0) {
        initialPhase = 'left-green';
        initialTime = firstLaneTiming.leftGreen;
      }
      
      setSimState(prev => ({
        activeLaneIndex: 0,
        phase: initialPhase,
        secondsRemaining: initialTime,
        isRunning: true,
        cycleCount: prev.cycleCount + 1
      }));
      
      addLog(`New cycle started`, 'success', `Cycle #${simState.cycleCount + 1}`);
      addLog(`New priority: ${data.priority.map(l => l.replace('lane', 'L')).join(' → ')}`, 'transition');
    } catch (error) {
      console.error(error);
      setSimState(prev => ({ ...prev, isRunning: false }));
      addLog('Error refreshing cycle', 'error');
    }
  }, [nextImages, laneConfig, simState.cycleCount, addLog]);

  // Timer Logic
  useEffect(() => {
    if (!simState.isRunning || !timings) return;

    const tick = async () => {
      if (simState.secondsRemaining > 0) {
        setSimState(prev => ({ ...prev, secondsRemaining: prev.secondsRemaining - 1 }));
        return;
      }

      // Time is 0, transition
      const currentLane = timings.priority[simState.activeLaneIndex];
      const currentLaneTiming = timings.timings[currentLane];

      // State Machine for Phases
      // Sequence: Left Green -> Left Yellow -> Green -> Yellow -> Red (Next Lane)
      
      if (simState.phase === 'left-green') {
        setSimState(prev => ({
          ...prev,
          phase: 'left-yellow',
          secondsRemaining: currentLaneTiming.leftYellow || 2
        }));
        addLog(`${currentLane.replace('lane', 'Lane ')}: LEFT GREEN → LEFT YELLOW`, 'transition');
      
      } else if (simState.phase === 'left-yellow') {
        setSimState(prev => ({
          ...prev,
          phase: 'green',
          secondsRemaining: currentLaneTiming.green
        }));
        addLog(`${currentLane.replace('lane', 'Lane ')}: LEFT YELLOW → GREEN`, 'transition');
        
      } else if (simState.phase === 'green') {
        setSimState(prev => ({
          ...prev,
          phase: 'yellow',
          secondsRemaining: currentLaneTiming.yellow
        }));
        addLog(`${currentLane.replace('lane', 'Lane ')}: GREEN → YELLOW`, 'transition');
        
      } else if (simState.phase === 'yellow') {
        setSimState(prev => ({
          ...prev,
          phase: 'red',
          secondsRemaining: ALL_RED_TIME
        }));
        addLog(`${currentLane.replace('lane', 'Lane ')}: YELLOW → ALL RED`, 'transition');
        
      } else if (simState.phase === 'red') {
        const nextIndex = simState.activeLaneIndex + 1;
        
        if (nextIndex < timings.priority.length) {
          const nextLane = timings.priority[nextIndex];
          const nextLaneTiming = timings.timings[nextLane];
          
          let nextPhase: Phase = 'green';
          let nextTime = nextLaneTiming.green;
          
          if (nextLaneTiming.leftGreen && nextLaneTiming.leftGreen > 0) {
            nextPhase = 'left-green';
            nextTime = nextLaneTiming.leftGreen;
          }
          
          setSimState(prev => ({
            ...prev,
            activeLaneIndex: nextIndex,
            phase: nextPhase,
            secondsRemaining: nextTime
          }));
          addLog(`Switching to ${nextLane.replace('lane', 'Lane ')}: ${nextPhase.toUpperCase()}`, 'transition');
        } else {
          await handleCycleEnd();
        }
      }
    };

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [simState, timings, addLog, handleCycleEnd]);

  const activeLane = simState.isRunning && timings 
    ? timings.priority[simState.activeLaneIndex] 
    : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Status Header */}
        <StatusHeader
          isRunning={simState.isRunning}
          cycleCount={simState.cycleCount}
          phase={simState.phase as any}
          activeLane={activeLane}
          secondsRemaining={simState.secondsRemaining}
          canStart={canStart}
          isLoading={isLoading}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Lane Cards */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="lanes" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="lanes" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Lanes
                </TabsTrigger>
                <TabsTrigger value="comparison" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Comparison
                </TabsTrigger>
              </TabsList>

              {/* Lanes Tab */}
              <TabsContent value="lanes" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LANES.map((lane) => {
                    let lightState: 'green' | 'yellow' | 'red' = 'red';
                    let leftState: 'green' | 'yellow' | 'red' = 'red';
                    let rightState: 'green' | 'yellow' | 'red' = 'red';
                    let seconds = 0;
                    let isActive = false;

                    if (simState.isRunning && timings) {
                      const currentPriorityLane = timings.priority[simState.activeLaneIndex];
                      isActive = lane === currentPriorityLane;
                      if (isActive) {
                        seconds = simState.secondsRemaining;
                        
                        // Main Light Logic
                        if (simState.phase === 'green') lightState = 'green';
                        else if (simState.phase === 'yellow') lightState = 'yellow';
                        else lightState = 'red';
                        
                        // Left Turn Logic
                        if (simState.phase === 'left-green') leftState = 'green';
                        else if (simState.phase === 'left-yellow') leftState = 'yellow';
                        else leftState = 'red';
                        
                        // Right Turn Logic (Concurrent with Main Green)
                        // If Main is Green, Right is Green (if configured)
                        if (simState.phase === 'green') rightState = 'green';
                        else if (simState.phase === 'yellow') rightState = 'yellow';
                        else rightState = 'red';
                      }
                    }

                    return (
                      <LaneCard
                        key={lane}
                        laneId={lane}
                        lightState={lightState}
                        leftState={laneConfig[lane].hasLeft ? leftState : undefined}
                        rightState={laneConfig[lane].hasRight ? rightState : undefined}
                        secondsRemaining={isActive ? seconds : undefined}
                        vehicleCounts={timings?.vehicleCounts[lane]}
                        annotatedImage={timings?.annotatedImages?.[lane]}
                        priority={
                          timings?.priority && timings.priority.indexOf(lane) !== -1 
                            ? timings.priority.indexOf(lane) + 1 
                            : undefined
                        }
                        selectedFile={nextImages[lane]}
                        onFileSelect={(file) => handleFileSelect(lane, file)}
                        isActive={isActive}
                        config={laneConfig[lane]}
                        onConfigChange={(config) => handleConfigChange(lane, config)}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="comparison" className="mt-0">
                <ComparisonPanel timings={timings} activeLane={activeLane} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Activity Log */}
          <div className="lg:col-span-1">
            <LogPanel logs={logs} maxHeight="calc(100vh - 280px)" />
          </div>
        </div>
      </div>
    </div>
  );
}
