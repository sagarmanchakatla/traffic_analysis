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

  const [accidentLocation, setAccidentLocation] = useState({
    lat: 18.9690,
    lng: 72.8194
  });

  const [emergencyServices, setEmergencyServices] = useState<Array<{
  name: string;
  icon: string;
  distance: string;
  eta: string;
}>>([]);


  /* ---------------- FETCH PREDICTIONS ---------------- */

  // const fetchPredictions = useCallback(async () => {
  //   try {
  //     const res = await fetch("http://localhost:5002/accident_status");
  //     const data = await res.json();

  //     if (data.lanes) {
  //       setLanePredictions(data.lanes);
  //     }

  //     if (data.latest) {
  //       setAccidentLane(data.latest.lane);
  //       setEmergencyMode(true);
  //     } else {
  //       setAccidentLane(null);
  //       setEmergencyMode(false);
  //     }

  //   } catch (err) {
  //     console.error("Prediction fetch error:", err);
  //   }
  // }, []);


// Update the fetchPredictions function to include emergency services
const fetchPredictions = useCallback(async () => {
  try {
    const res = await fetch("http://localhost:5002/accident_status");
    const data = await res.json();

    if (data.lanes) {
      setLanePredictions(data.lanes);
    }

    if (data.latest) {
      setAccidentLane(data.latest.lane);
      setEmergencyMode(true);
      
      // Fetch emergency services when accident detected
      if (data.latest.emergency_services) {
        setEmergencyServices(data.latest.emergency_services);
      }
    } else {
      setAccidentLane(null);
      setEmergencyMode(false);
      setEmergencyServices([]);
    }

  } catch (err) {
    console.error("Prediction fetch error:", err);
  }
}, []);
  /* ---------------- FETCH LOGS ---------------- */

  const fetchLogs = useCallback(async () => {
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

  /* ---------------- LIGHT STATE ---------------- */

  const getLightState = (index: number) => {
    if (emergencyMode) return "red";
    return index === activeLane ? "green" : "red";
  };

  /* ---------------- UI ---------------- */

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

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT VIDEOS */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">

          <h2 className="font-semibold mb-4">Traffic Camera Feeds</h2>

          <div className="grid md:grid-cols-2 gap-4">

            {LANES.map((lane, index) => {

              const laneData = lanePredictions[lane];
              const state = getLightState(index);
              const isAccidentLane = lane === accidentLane;

              return (
                <div
                  key={lane}
                  className={`space-y-2 p-2 rounded-lg
                  ${isAccidentLane ? "ring-4 ring-red-500" : ""}`}
                >

                  <div className="flex justify-between">
                    <span className="font-medium">
                      {lane.toUpperCase()}
                      {isAccidentLane && " 🚨"}
                    </span>

                    {state === "green" && !emergencyMode && (
                      <span>{greenTimer}s</span>
                    )}
                  </div>

                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">

                    <img
                      src={`http://localhost:5002/video_feed/${lane}`}
                      className="w-full h-full object-cover"
                      alt={lane}
                    />

                    <div className="absolute bottom-2 right-2">
                      <TrafficLight
                        state={state}
                        size="sm"
                        isBlinking={emergencyMode && blinking}
                      />
                    </div>

                  </div>

                  {/* PREDICTION */}
                  {laneData && (
                    <div className="text-sm">
                      <span
                        className={
                          laneData.pred === "Accident"
                            ? "text-red-600 font-semibold"
                            : "text-green-600"
                        }
                      >
                        {laneData.pred}
                      </span>

                      <span className="ml-2 text-gray-600">
                        {laneData.prob.toFixed(2)}%
                      </span>
                    </div>
                  )}

                </div>
              );
            })}

          </div>
        </div>


{/* RIGHT SIDE */}
<div className="space-y-6">

  {accidentLane && (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-2">Accident Location</h2>
      <AccidentMap
        lat={accidentLocation.lat}
        lng={accidentLocation.lng}
      />
    </div>
  )}

  {emergencyServices.length > 0 && (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        🚑 Emergency Services Notified
      </h2>
      <div className="space-y-2">
        {emergencyServices.map((service, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500"
          >
            <div className="text-2xl">{service.icon}</div>
            <div className="flex-1">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-gray-600">{service.distance}</p>
              <p className="text-xs text-gray-500">ETA: {service.eta}</p>
            </div>
            <div className="text-green-600 text-sm font-semibold">
              ✓ Notified
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  <StatsPanel />
</div>

          {/* Bottom: Logs Panel */}
          <div className="lg:col-span-3">
           <LogsPanel logs={accidentLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}