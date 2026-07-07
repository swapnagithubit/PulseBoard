import React, { useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useSocket } from "../context/SocketContext";
import { Globe, Activity, Wifi, WifiOff } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country name → approximate centroid coordinates [longitude, latitude]
const COUNTRY_COORDS = {
  "United States": [-100, 38],
  "United Kingdom": [-2, 54],
  "Germany": [10, 51],
  "France": [2, 46],
  "India": [78, 20],
  "Japan": [138, 36],
  "Brazil": [-51, -14],
  "Canada": [-96, 56],
  "Australia": [133, -27],
  "China": [104, 35],
  "Russia": [60, 60],
  "Mexico": [-102, 24],
  "South Korea": [128, 36],
  "Italy": [12, 42],
  "Spain": [-4, 40],
  "Netherlands": [5, 52],
  "Singapore": [104, 1],
  "South Africa": [25, -30],
  "Argentina": [-64, -34],
  "Indonesia": [115, -8],
};

const EVENT_COLORS = {
  click: "#6366f1",
  purchase: "#10b981",
  signup: "#f59e0b",
  add_to_cart: "#8b5cf6",
  default: "#3b82f6",
};

const EVENT_LABELS = {
  click: "Click",
  purchase: "Purchase 💰",
  signup: "Signup ✨",
  add_to_cart: "Cart",
};

// Single animated pulse marker
const PulseMarker = ({ coordinates, color, label, onExpire }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 2500);
    const removeTimer = setTimeout(() => {
      onExpire();
    }, 3500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onExpire]);

  return (
    <Marker coordinates={coordinates}>
      <g style={{ transition: "opacity 1s ease-out", opacity }}>
        {/* Outer pulse ring */}
        <circle r={14} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3}>
          <animate attributeName="r" from="8" to="22" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
        {/* Inner dot */}
        <circle r={5} fill={color} opacity={0.9} />
        {/* Label */}
        <text
          textAnchor="middle"
          y={-12}
          fill={color}
          fontSize={9}
          fontWeight={600}
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      </g>
    </Marker>
  );
};

export default function WorldMap() {
  const { socket } = useSocket();
  const [markers, setMarkers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0, byType: {}, byCountry: {} });
  const [connected, setConnected] = useState(false);
  const markerIdRef = useRef(0);

  useEffect(() => {
    if (!socket) return;
    setConnected(true);

    const handleEvent = (event) => {
      const country = event.country;
      const coords = COUNTRY_COORDS[country];
      if (!coords) return;

      const id = ++markerIdRef.current;
      const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.default;
      const label = EVENT_LABELS[event.eventType] || event.eventType;

      setMarkers((prev) => [...prev, { id, coordinates: coords, color, label, country }]);

      setRecentEvents((prev) => [
        { id, eventType: event.eventType, country, device: event.device, amount: event.amount, color, timestamp: new Date() },
        ...prev.slice(0, 19),
      ]);

      setStats((prev) => ({
        total: prev.total + 1,
        byType: { ...prev.byType, [event.eventType]: (prev.byType[event.eventType] || 0) + 1 },
        byCountry: { ...prev.byCountry, [country]: (prev.byCountry[country] || 0) + 1 },
      }));
    };

    socket.on("new-event", handleEvent);
    return () => socket.off("new-event", handleEvent);
  }, [socket]);

  const removeMarker = (id) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const topCountries = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="text-indigo-400" size={26} />
            Real-Time World Map
          </h1>
          <p className="text-gray-500 text-sm mt-1">Live event locations — dots appear as events arrive via Kafka → Socket.io</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
          connected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? "Live Stream Active" : "Connecting..."}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Events Received</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        {Object.entries(EVENT_COLORS).slice(0, 3).map(([type, color]) => (
          <div key={type} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1 capitalize">{type.replace("_", " ")}</p>
            <p className="text-2xl font-bold" style={{ color }}>{stats.byType[type] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Map */}
        <div className="xl:col-span-3 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-white">Live Event Locations</span>
            <div className="ml-auto flex items-center gap-3 text-xs">
              {Object.entries(EVENT_COLORS).slice(0, 4).map(([type, color]) => (
                <span key={type} className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {type.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
          <div className="relative bg-[#080c1a]" style={{ height: 400 }}>
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: 140, center: [0, 10] }}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#0f172a"
                      stroke="#1e293b"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#1e2d4a", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {markers.map((m) => (
                <PulseMarker
                  key={m.id}
                  coordinates={m.coordinates}
                  color={m.color}
                  label={m.label}
                  onExpire={() => removeMarker(m.id)}
                />
              ))}
            </ComposableMap>

            {stats.total === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <Globe size={40} className="text-indigo-500/30 mb-3" />
                <p className="text-gray-600 text-sm">Waiting for live events...</p>
                <p className="text-gray-700 text-xs mt-1">Events appear as animated dots when received via Socket.io</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Top Countries */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">🌍 Top Countries</h3>
            {topCountries.length === 0 ? (
              <p className="text-xs text-gray-600">No events yet</p>
            ) : (
              <div className="space-y-2.5">
                {topCountries.map(([country, count], i) => (
                  <div key={country} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{i + 1}. {country}</span>
                    <span className="text-xs font-semibold text-white bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live feed */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex-1">
            <h3 className="text-sm font-semibold text-white mb-3">⚡ Live Feed</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-gray-600">Events will appear here in real-time</p>
              ) : (
                recentEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">
                        <span style={{ color: e.color }} className="font-medium">{e.eventType}</span> · {e.country}
                      </p>
                      <p className="text-[10px] text-gray-600">{e.device} · {e.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                    </div>
                    {e.amount > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono">${e.amount}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
