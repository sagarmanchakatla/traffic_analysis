"use client";

export default function VideoFeed() {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="font-semibold mb-3">Video Feed</h2>

      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <img
          src="http://localhost:5002/video_feed"
          className="w-full h-full object-cover"
          alt="Live Feed"
        />
      </div>
    </div>
  );
}
