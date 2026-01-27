"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatsPanel from "../../components/accident/StatsPanel";
import LogsPanel from "../../components/accident/LogsPanel";
import { TrafficLight } from "@/components/TrafficLight";
import AccidentMap from "@/components/accident/AccidentMap";

const LANES = ["lane1", "lane2", "lane3", "lane4"];

export default function AccidentPage() {

  const [accidentLogs, setAccidentLogs] = useState([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blinking, setBlinking] = useState(false);

  const [activeLane, setActiveLane] = useState(0);
  const [greenTimer, setGreenTimer] = useState(20);

  const [accidentLane, setAccidentLane] = useState(null);
  const [accidentLocation, setAccidentLocation] = useState({
    lat: 18.9690,
    lng: 72.8194, // Mumbai Central demo
  });

  /* -----------------------------------
     Check Accident Status
  ------------------------------------*/

  const fetchAccidentStatus = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5002/accident_status");
      const data = await res.json();

      if (data.accident) {
        setAccidentLane(data.lane);
        setEmergencyMode(true);

        if (data.lat && data.lng) {
          setAccidentLocation({ lat: data.lat, lng: data.lng });
        }
      } else {
        setAccidentLane(null);
        setEmergencyMode(false);
      }
    } catch (err) {
      console.error("Accident status error:", err);
    }
  }, []);

  /* -----------------------------------
     Fetch Logs
  ------------------------------------*/

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5002/accident_logs");
      const data = await res.json();
      if (data.logs) setAccidentLogs(data.logs);
    } catch (err) {
      console.error("Log fetch error:", err);
    }
  }, []);

  /* -----------------------------------
     Emergency blinking
  ------------------------------------*/

  useEffect(() => {
    if (!emergencyMode) return;

    const blink = setInterval(() => {
      setBlinking((p) => !p);
    }, 500);

    return () => clearInterval(blink);
  }, [emergencyMode]);

  /* -----------------------------------
     Normal traffic timer
  ------------------------------------*/

  useEffect(() => {
    if (emergencyMode) return;

    const timer = setInterval(() => {
      setGreenTimer((prev) => {
        if (prev <= 1) {
          setActiveLane((p) => (p + 1) % 4);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emergencyMode]);

  /* -----------------------------------
     Polling
  ------------------------------------*/

  useEffect(() => {
    fetchAccidentStatus();
    fetchLogs();

    const i1 = setInterval(fetchAccidentStatus, 2000);
    const i2 = setInterval(fetchLogs, 2000);

    return () => {
      clearInterval(i1);
      clearInterval(i2);
    };
  }, [fetchAccidentStatus, fetchLogs]);

  /* -----------------------------------
     Light State
  ------------------------------------*/

  const getLightState = (index: number) => {
    if (emergencyMode) return "red";
    return index === activeLane ? "green" : "red";
  };

  /* -----------------------------------
     UI
  ------------------------------------*/

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
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex justify-between items-center">

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left - Videos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">

          <h2 className="font-semibold mb-4">Traffic Camera Feeds</h2>

          <div className="grid md:grid-cols-2 gap-4">

            {LANES.map((lane, index) => {

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

                </div>
              );
            })}

          </div>
        </div>

        {/* Right - Map + Stats */}
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

          <StatsPanel />

        </div>

        {/* Logs */}
        <div className="lg:col-span-3">
          <LogsPanel logs={accidentLogs} />
        </div>

      </div>
    </div>
  );
}
