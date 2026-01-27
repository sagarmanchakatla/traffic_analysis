"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

// Create Leaflet div icon using Lucide SVG
const accidentIcon = new L.DivIcon({
  html: renderToStaticMarkup(
    <div style={{ color: "red" }}>
      <AlertTriangle size={32} />
    </div>
  ),
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function AccidentMap({ lat, lng }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[lat, lng]} icon={accidentIcon}>
        <Popup>Accident Location</Popup>
      </Marker>
    </MapContainer>
  );
}
