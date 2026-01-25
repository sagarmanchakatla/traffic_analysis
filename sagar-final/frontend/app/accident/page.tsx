"use client";

import VideoFeed from "../../components/accident/VideoFeed";
import StatsPanel from "../../components/accident/StatsPanel";
import LogsPanel from "../../components/accident/LogsPanel";
import Link from "next/link";

export default function AccidentPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-6">

        {/* Top Tabs */}
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

        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Accident Detection System
          </h1>

          <span className="flex items-center gap-2 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live
          </span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="md:col-span-2">
            <VideoFeed />
          </div>

          <StatsPanel />

          <div className="md:col-span-3">
            <LogsPanel />
          </div>

        </div>
      </div>
    </main>
  );
}
