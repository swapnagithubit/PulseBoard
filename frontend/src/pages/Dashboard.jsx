import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import KPIStats from "../components/KPIStats";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  AreaChart, Area, 
  PieChart, Pie, Cell, 
  BarChart, Bar,
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  Legend 
} from "recharts";
import { 
  Activity, 
  TrendingUp, 
  Smartphone, 
  Laptop, 
  Globe, 
  Layers,
  FileText,
  Clock
} from "lucide-react";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const countryNameMap = {
  "United States": "United States of America",
  "US": "United States of America",
  "UK": "United Kingdom",
  "Great Britain": "United Kingdom",
  "Germany": "Germany",
  "Canada": "Canada",
  "India": "India",
  "France": "France",
  "Australia": "Australia",
  "Japan": "Japan",
  "Brazil": "Brazil",
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { liveEvents, latestKpis, kafkaStatus } = useContext(SocketContext);

  const [kpis, setKpis] = useState({
    totalClicks: 0,
    totalSignups: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    activeUsers: 0,
    eventsPerMinute: 0,
  });

  const [chartsData, setChartsData] = useState({
    eventsTrend: [],
    revenueTrend: [],
    deviceDistribution: [],
    countryDistribution: [],
    pageDistribution: [],
    eventTypeDistribution: [],
  });

  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [hoveredCountry, setHoveredCountry] = useState(null);

  // Function to fetch latest analytics from Express REST API
  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get("/api/analytics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("✅ Analytics data fetched:", data);
      setKpis(data.kpis);
      setChartsData({
        eventsTrend: data.eventsTrend || [],
        revenueTrend: data.revenueTrend || [],
        deviceDistribution: data.deviceDistribution || [],
        countryDistribution: data.countryDistribution || [],
        pageDistribution: data.pageDistribution || [],
        eventTypeDistribution: data.eventTypeDistribution || [],
      });
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("❌ Failed to fetch analytics data:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // On Mount: Load analytics data & set up 5-second auto-refresh
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000); // Auto refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync real-time KPI socket messages immediately to override cached statistics
  useEffect(() => {
    if (latestKpis) {
      setKpis((prev) => ({
        ...prev,
        totalClicks: latestKpis.totalClicks,
        totalSignups: latestKpis.totalSignups,
        totalPurchases: latestKpis.totalPurchases,
        totalRevenue: latestKpis.totalRevenue,
      }));
    }
  }, [latestKpis]);

  // Format currencies
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide uppercase">Populating dashboard metrics...</span>
        </div>
      </div>
    );
  }

  // Fallback structures for charts if empty
  const defaultDeviceData = chartsData.deviceDistribution.length > 0 
    ? chartsData.deviceDistribution 
    : [{ name: "mobile", value: 1 }, { name: "desktop", value: 1 }];

  const defaultEventTypeData = chartsData.eventTypeDistribution.length > 0 
    ? chartsData.eventTypeDistribution 
    : [{ name: "click", value: 1 }, { name: "signup", value: 1 }, { name: "purchase", value: 1 }, { name: "add_to_cart", value: 1 }];

  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-gray-400 font-medium">
            Here's what is happening on your website right now.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl font-semibold">
          <Clock size={14} className="text-indigo-400" />
          <span className="text-gray-400">Auto-refresh loop active</span>
          <span className="text-white bg-indigo-600/35 px-1.5 py-0.5 rounded text-[10px]">
            {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* KPI Stats Components */}
      <KPIStats kpis={kpis} />

      {/* Primary Analytical Grid (Trends and Line Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Events Per Minute Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity size={18} className="text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Events per Minute</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">Last 10 minutes interval</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.eventsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "rgba(17, 24, 39, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Event Count"
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 1 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-Time User Activity Ticker Feed */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[352px]">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Event Stream</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              {kafkaStatus === "Connected" ? "Streaming" : "Pipeline Idle"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            <AnimatePresence initial={false}>
              {liveEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Activity size={32} className="text-gray-600 mb-2 animate-pulse" />
                  <p className="text-xs text-gray-500">Waiting for events from Kafka producer...</p>
                </div>
              ) : (
                liveEvents.map((evt, idx) => (
                  <motion.div
                    key={evt._id || idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition duration-150"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                          evt.eventType === "purchase" 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                            : evt.eventType === "signup"
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                            : evt.eventType === "add_to_cart"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                        }`}>
                          {evt.eventType}
                        </span>
                        <span className="text-gray-300 font-bold truncate">
                          {evt.page}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium mt-1 truncate">
                        ID: {evt.userId.slice(0, 8)}... ({evt.country})
                      </span>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      {evt.eventType === "purchase" && (
                        <span className="font-extrabold text-emerald-400 text-sm">
                          +${evt.amount}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-500 font-medium">
                        {evt.device === "desktop" ? <Laptop size={12} className="inline text-gray-500" /> : <Smartphone size={12} className="inline text-gray-500" />}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Secondary Aggregated Metrics Grid (Device Pie, Country Bar, Revenue Area) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend Area Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Trend</h3>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">Income</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData.revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip 
                  formatter={(val) => [`$${val}`, "Revenue"]}
                  contentStyle={{ backgroundColor: "rgba(17, 24, 39, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Country-wise Analytics Geo Map */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Globe size={18} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Countries Map</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">User base</span>
          </div>

          <div className="relative h-56 flex items-center justify-center overflow-hidden rounded-xl bg-black/20 border border-white/5">
            {hoveredCountry && (
              <div className="absolute top-2 right-2 bg-[#0d1326]/90 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-[10px] text-white font-semibold z-10 shadow-lg shadow-black/40">
                📍 {hoveredCountry.name}: <span className="text-indigo-400 font-bold">{hoveredCountry.count} events</span>
              </div>
            )}
            <div className="w-full h-full">
              <ComposableMap
                projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) => {
                    const maxCount = Math.max(...chartsData.countryDistribution.map((c) => c.count), 1);
                    
                    const getChoroplethColor = (count) => {
                      if (!count) return "rgba(255, 255, 255, 0.05)";
                      const ratio = count / maxCount;
                      // Interpolate slate-800 (30,41,59) to indigo-500 (99,102,241)
                      const r = Math.round(30 + ratio * (99 - 30));
                      const g = Math.round(41 + ratio * (102 - 41));
                      const b = Math.round(59 + ratio * (241 - 59));
                      return `rgb(${r}, ${g}, ${b})`;
                    };

                    return geographies.map((geo) => {
                      const countryName = geo.properties.name;
                      const dbMatch = chartsData.countryDistribution.find(
                        (c) =>
                          c.country === countryName ||
                          countryNameMap[c.country] === countryName
                      );
                      const count = dbMatch ? dbMatch.count : 0;
                      const fillColor = getChoroplethColor(count);

                      return (
                        <Geography
                          key={geo.rvalue || geo.key || countryName}
                          geography={geo}
                          onMouseEnter={() => {
                            setHoveredCountry({ name: countryName, count: count });
                          }}
                          onMouseLeave={() => {
                            setHoveredCountry(null);
                          }}
                          style={{
                            default: {
                              fill: fillColor,
                              stroke: "rgba(255, 255, 255, 0.1)",
                              strokeWidth: 0.5,
                              outline: "none",
                              transition: "all 250ms",
                            },
                            hover: {
                              fill: count ? "#6366f1" : "rgba(255, 255, 255, 0.15)",
                              stroke: "rgba(255, 255, 255, 0.3)",
                              strokeWidth: 0.8,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: "#4f46e5",
                              outline: "none",
                            },
                          }}
                        />
                      );
                    });
                  }}
                </Geographies>
              </ComposableMap>
            </div>
          </div>
        </div>

        {/* Device Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Laptop size={18} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Device Distribution</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">Platform share</span>
          </div>

          <div className="h-56 flex items-center justify-center">
            <div className="w-full h-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(17, 24, 39, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  />
                  <Pie
                    data={defaultDeviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {defaultDeviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-6 text-[11px] font-semibold">
                {defaultDeviceData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 capitalize text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tertiary Metrics Grid (Event Types Donut & Top Pages Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Event Type Distribution Doughnut Chart */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Layers size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Event Actions</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">Action Breakdown</span>
          </div>

          <div className="h-60 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Tooltip contentStyle={{ backgroundColor: "rgba(17, 24, 39, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                <Pie
                  data={defaultEventTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  dataKey="value"
                >
                  {defaultEventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-semibold mt-2">
              {defaultEventTypeData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 capitalize text-gray-300">
                  <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Top Pages Horizontal Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText size={18} className="text-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Most Visited Pages</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">Pageview count</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartsData.pageDistribution}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#6b7280" fontSize={9} tickLine={false} />
                <YAxis dataKey="page" type="category" stroke="#6b7280" fontSize={9} width={80} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(17, 24, 39, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                <Bar dataKey="count" name="Views" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
