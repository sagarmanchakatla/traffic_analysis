"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import StatsPanel from "@/components/accident/StatsPanel";
import LogsPanel from "@/components/accident/LogsPanel";
import { TrafficLight } from "@/components/TrafficLight";

// Load Leaflet only on client
const AccidentMap = dynamic(
  () => import("@/components/accident/AccidentMap"),
  { ssr: false }
);

const LANES = ["lane1", "lane2", "lane3", "lane4"];

export default function AccidentPage() {

  /* ---------------- STATES ---------------- */

  const [lanePredictions, setLanePredictions] = useState({});
  const [accidentLane, setAccidentLane] = useState(null);

  const [accidentLogs, setAccidentLogs] = useState([]);

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blinking, setBlinking] = useState(false);

  const [activeLane, setActiveLane] = useState(0);
  const [greenTimer, setGreenTimer] = useState(30);

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
      if (data.logs) setAccidentLogs(data.logs);
    } catch (err) {
      console.error("Log fetch error:", err);
    }
  }, []);

  /* ---------------- BLINKING ---------------- */

  useEffect(() => {
    if (!emergencyMode) return;

    const blink = setInterval(() => {
      setBlinking((b) => !b);
    }, 500);

    return () => clearInterval(blink);
  }, [emergencyMode]);

  /* ---------------- TRAFFIC TIMER ---------------- */

  useEffect(() => {
    if (emergencyMode) return;

    const timer = setInterval(() => {
      setGreenTimer((t) => {
        if (t <= 1) {
          setActiveLane((l) => (l + 1) % 4);
          return 30;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emergencyMode]);

  /* ---------------- POLLING ---------------- */

  useEffect(() => {
    fetchPredictions();
    fetchLogs();

    const p1 = setInterval(fetchPredictions, 2000);
    const p2 = setInterval(fetchLogs, 2000);

    return () => {
      clearInterval(p1);
      clearInterval(p2);
    };
  }, [fetchPredictions, fetchLogs]);

  /* ---------------- LIGHT STATE ---------------- */

  const getLightState = (index: number) => {
    if (emergencyMode) return "red";
    return index === activeLane ? "green" : "red";
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8">

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Link href="/" className="px-4 py-2 border rounded-lg">
          🚦 Traffic System
        </Link>

        <Link href="/accident" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          🚑 Accident Detection
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex justify-between">

        <div>
          <h1 className="text-2xl font-bold">Accident Detection System</h1>
          <p className="text-gray-500">AI Powered Emergency Response</p>
        </div>

        {emergencyMode ? (
          <div className="flex items-center gap-2 text-red-600">
            <div className={`w-3 h-3 bg-red-600 rounded-full ${blinking ? "" : "opacity-30"}`}></div>
            Emergency Mode
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            Normal Mode
          </div>
        )}

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

        {/* LOGS */}
        <div className="lg:col-span-3">
          <LogsPanel logs={accidentLogs} />
        </div>

      </div>
    </div>
  );
}
