"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatsPanel from "../../components/accident/StatsPanel";
import LogsPanel from "../../components/accident/LogsPanel";
import { TrafficLight } from "@/components/TrafficLight";

type LaneId = "lane1" | "lane2" | "lane3" | "lane4";

interface AccidentLog {
  timestamp: string;
  probability: number;
  severity?: string;
  location?: string;
}

export default function AccidentPage() {
  const [accidentLogs, setAccidentLogs] = useState<AccidentLog[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [activeLane, setActiveLane] = useState<number>(0);
  const [greenTimer, setGreenTimer] = useState<number>(20);

  const lanes: LaneId[] = ["lane1", "lane2", "lane3", "lane4"];

  // Check for emergency mode (accident > 95%)
  const checkEmergencyMode = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5002/accident_logs");
      const data = await res.json();
      
      if (data.logs && data.logs.length > 0) {
        setAccidentLogs(data.logs);
        
        // Check recent logs for >95% confidence
        const recentLogs = data.logs.slice(-3);
        const severeAccident = recentLogs.find((log: AccidentLog) => log.probability > 95);
        
        if (severeAccident && !emergencyMode) {
          setEmergencyMode(true);
        } else if (!severeAccident && emergencyMode) {
          setEmergencyMode(false);
        }
      }
    } catch (error) {
      console.error("Error checking accident logs:", error);
    }
  }, [emergencyMode]);

  // Blinking effect for emergency mode
  useEffect(() => {
    if (emergencyMode) {
      const interval = setInterval(() => {
        setBlinking((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setBlinking(false);
    }
  }, [emergencyMode]);

  // Traffic cycle timer
  useEffect(() => {
    if (emergencyMode) return;

    const timer = setInterval(() => {
      setGreenTimer((prev) => {
        if (prev <= 1) {
          setActiveLane((prevLane) => (prevLane + 1) % 4);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emergencyMode]);

  useEffect(() => {
    checkEmergencyMode();
    const interval = setInterval(checkEmergencyMode, 2000);
    return () => clearInterval(interval);
  }, [checkEmergencyMode]);

  // Determine light states for each lane
  const getLightState = (laneIndex: number) => {
    if (emergencyMode) {
      return {
        lightState: "red" as const,
        isActive: false,
        secondsRemaining: undefined,
      };
    }

    if (laneIndex === activeLane) {
      return {
        lightState: "green" as const,
        isActive: true,
        secondsRemaining: greenTimer,
      };
    } else {
      return {
        lightState: "red" as const,
        isActive: false,
        secondsRemaining: undefined,
      };
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex gap-4 mb-6">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border hover:bg-gray-200"
          >
            🚦 Traffic System
          </Link>

          <Link
            href="/accident"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            🚑 Accident Detection
          </Link>
        </div>

        {/* Status Header - Simplified */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Accident Detection System</h1>
              <p className="text-gray-600">Real-time monitoring with emergency response</p>
            </div>
            
            <div className="flex items-center gap-4">
              {emergencyMode ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg">
                  <div className={`w-3 h-3 rounded-full bg-red-500 ${blinking ? 'opacity-100' : 'opacity-30'}`}></div>
                  <span className="font-medium">Emergency Mode</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">Normal</span>
                </div>
              )}
              
              {!emergencyMode && (
                <div className="text-sm text-gray-500">
                  Active: <span className="font-medium">Lane {activeLane + 1}</span>
                  <span className="ml-2">({greenTimer}s)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video Feeds with Traffic Signals */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Traffic Camera Feeds</h2>
              
              {/* 4 Lane Grid - EACH LANE WITH ITS OWN VIDEO FEED */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lanes.map((lane, index) => {
                  const lightStates = getLightState(index);
                  
                  return (
                    <div key={lane} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">
                          {lane.replace("lane", "Lane ")}
                          {lightStates.isActive && " • Active"}
                        </h3>
                        {lightStates.secondsRemaining !== undefined && (
                          <div className="bg-gray-100 px-3 py-1 rounded">
                            <span className="font-mono font-medium">{lightStates.secondsRemaining}s</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        {/* Each lane shows its own video feed from the backend */}
                        <img
                          src={`http://localhost:5002/video_feed/${lane}`}
                          className="w-full h-full object-cover"
                          alt={`${lane} live feed`}
                          onError={(e) => {
                            // Fallback if video fails to load
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `data:image/svg+xml,${encodeURIComponent(`
                              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                <rect width="100%" height="100%" fill="#111827"/>
                                <text x="50%" y="50%" text-anchor="middle" fill="white" dy=".3em" font-family="Arial">
                                  ${lane.replace("lane", "Lane ")} Feed
                                </text>
                              </svg>
                            `)}`;
                          }}
                        />
                        
                        {/* Traffic Light Overlay */}
                        <div className="absolute bottom-3 right-3">
                          <TrafficLight
                            state={lightStates.lightState}
                            size="sm"
                            isBlinking={emergencyMode && blinking}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            emergencyMode ? (blinking ? 'bg-red-500' : 'bg-red-300') :
                            lightStates.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span>
                            {emergencyMode ? 'Red Blinking' :
                             lightStates.isActive ? 'Green' : 'Red'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Emergency Status */}
              {emergencyMode && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-red-500 ${blinking ? 'opacity-100' : 'opacity-30'}`}></div>
                    <div>
                      <p className="font-medium text-red-700">Emergency Mode Active</p>
                      <p className="text-sm text-red-600 mt-1">
                        Accident detected with confidence &gt;95%. All signals blinking red.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats Panel */}
          <div className="lg:col-span-1">
            <StatsPanel />
          </div>

          {/* Bottom: Logs Panel */}
          <div className="lg:col-span-3">
            <LogsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}