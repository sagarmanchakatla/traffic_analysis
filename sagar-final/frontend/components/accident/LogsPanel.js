"use client";
import { useEffect, useState } from "react";

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await fetch("http://localhost:5002/accident_logs");
    const data = await res.json();
    setLogs(data.logs);
  };

  const clearLogs = async () => {
    await fetch("http://localhost:5002/clear_logs", { method: "POST" });
    setLogs([]);
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Detection Logs</h2>

        <button
          onClick={clearLogs}
          className="text-sm text-red-500 border border-red-300 px-3 py-1 rounded hover:bg-red-50"
        >
          Clear
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400">
            No accidents detected yet
          </p>
        ) : (
          [...logs].reverse().map((log, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-l-4 border-red-500"
            >
              <span>{log.timestamp}</span>
              <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                {log.probability}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
