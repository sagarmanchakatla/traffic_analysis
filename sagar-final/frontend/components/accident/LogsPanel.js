"use client";

export default function LogsPanel({ logs }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Detection Logs</h2>
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
