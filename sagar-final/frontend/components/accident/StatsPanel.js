"use client";
import { useEffect, useState } from "react";

export default function StatsPanel() {
  const [total, setTotal] = useState(0);
  const [last, setLast] = useState("-");

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("http://localhost:5002/accident_logs");
      const data = await res.json();
      setTotal(data.logs.length);
      setLast(
        data.logs.length
          ? data.logs[data.logs.length - 1].timestamp
          : "-"
      );
    }, 2000);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="font-semibold mb-3">Statistics</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border rounded-lg">
          <p className="text-sm text-gray-500">Total accidents</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="p-3 border rounded-lg">
          <p className="text-sm text-gray-500">Last detection</p>
          <p className="text-lg font-semibold">{last}</p>
        </div>
      </div>
    </div>
  );
}
