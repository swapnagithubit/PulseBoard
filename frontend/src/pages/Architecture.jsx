import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { Server, Database, Cpu, Wifi, Activity, CheckCircle2, XCircle, Clock, MemoryStick, Zap, RefreshCw } from "lucide-react";
import { useContext } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Animated data packet that flows along SVG paths
const DataPacket = ({ pathId, color = "#6366f1", delay = 0 }) => (
  <circle r="4" fill={color} opacity="0.9">
    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}>
      <mptah xlinkHref={`#${pathId}`} />
    </animateMotion>
  </circle>
);

const StatusDot = ({ status }) => {
  const color = status === "healthy" ? "bg-emerald-400" : status === "disconnected" ? "bg-amber-400" : "bg-red-400";
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} ${status === "healthy" ? "animate-pulse" : ""}`} />
  );
};

const ServiceCard = ({ icon: Icon, name, status, details = [], color, metrics = [] }) => {
  const isHealthy = status === "healthy";
  const borderColor = isHealthy ? "border-emerald-500/20" : "border-red-500/20";
  const bgColor = isHealthy ? "bg-emerald-500/5" : "bg-red-500/5";

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 flex flex-col gap-3 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHealthy ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
            <Icon size={18} className={isHealthy ? "text-emerald-400" : "text-red-400"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusDot status={status} />
              <span className={`text-[10px] font-medium capitalize ${isHealthy ? "text-emerald-400" : status === "disconnected" ? "text-amber-400" : "text-red-400"}`}>
                {status}
              </span>
            </div>
          </div>
        </div>
        {isHealthy ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-red-400" />}
      </div>
      {details.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-white/5">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-[11px] text-gray-500">{d.label}</span>
              <span className="text-[11px] text-gray-300 font-mono">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PIPELINE_NODES = [
  { id: "website", label: "Website", sublabel: "tracker.js", icon: "🌐", color: "#6366f1" },
  { id: "kafka", label: "Kafka", sublabel: "website-events", icon: "⚡", color: "#f59e0b" },
  { id: "consumer", label: "Consumer", sublabel: "Node.js", icon: "⚙️", color: "#8b5cf6" },
  { id: "mongodb", label: "MongoDB", sublabel: "events collection", icon: "🗄️", color: "#10b981" },
  { id: "backend", label: "Backend", sublabel: "Express + Socket.io", icon: "🖥️", color: "#3b82f6" },
  { id: "dashboard", label: "Dashboard", sublabel: "React + Recharts", icon: "📊", color: "#ec4899" },
];

export default function Architecture() {
  const { token } = useContext(AuthContext);
  const { socket } = useSocket();
  const [health, setHealth] = useState(null);
  const [kafkaMetrics, setKafkaMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activePackets, setActivePackets] = useState([]);
  const packetRef = useRef(0);

  const fetchHealth = async () => {
    try {
      const [svc, kafka] = await Promise.all([
        axios.get(`${API_BASE}/api/health/services`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/api/health/kafka`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setHealth(svc.data);
      setKafkaMetrics(kafka.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Health fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Trigger packet animation on each new event
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      const id = ++packetRef.current;
      setActivePackets((prev) => [...prev, id]);
      setTimeout(() => setActivePackets((prev) => prev.filter((p) => p !== id)), 3000);
    };
    socket.on("new-event", handler);
    return () => socket.off("new-event", handler);
  }, [socket]);

  const services = health?.services || {};

  const kafkaStatus = services.kafka?.status || "unknown";
  const mongoStatus = services.mongodb?.status || "unknown";
  const consumerStatus = services.consumer?.status || "unknown";
  const backendStatus = services.backend?.status || "unknown";
  const aiStatus = services.ai?.status || "unknown";

  const nodeStatuses = {
    website: "healthy",
    kafka: kafkaStatus,
    consumer: consumerStatus,
    mongodb: mongoStatus,
    backend: backendStatus,
    dashboard: "healthy",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-indigo-400" size={26} />
            System Architecture
          </h1>
          <p className="text-gray-500 text-sm mt-1">Live service health, data flow visualization, and Kafka metrics</p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Architecture Flow Diagram */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">Data Flow Pipeline</h2>

        <div className="relative overflow-x-auto">
          {/* Pipeline Nodes */}
          <div className="flex items-center justify-between min-w-[700px] px-4">
            {PIPELINE_NODES.map((node, i) => {
              const status = nodeStatuses[node.id] || "unknown";
              const isHealthy = status === "healthy";

              return (
                <React.Fragment key={node.id}>
                  {/* Node card */}
                  <div className="flex flex-col items-center gap-2 relative">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl relative border-2 transition-all duration-500"
                      style={{
                        backgroundColor: `${node.color}15`,
                        borderColor: isHealthy ? node.color + "40" : "#ef444440",
                        boxShadow: isHealthy ? `0 0 20px ${node.color}20` : "none",
                      }}
                    >
                      {node.icon}
                      {/* Status indicator */}
                      <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#070a13] ${isHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">{node.label}</p>
                      <p className="text-[10px] text-gray-600">{node.sublabel}</p>
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {i < PIPELINE_NODES.length - 1 && (
                    <div className="flex-1 flex items-center justify-center relative mx-2" style={{ marginBottom: 28 }}>
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
                        {/* Animated flow indicator */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400"
                          style={{
                            animation: `flowRight 2s linear infinite`,
                            animationDelay: `${i * 0.4}s`,
                          }}
                        />
                      </div>
                      <svg className="absolute" width="12" height="12" viewBox="0 0 12 12" style={{ right: -5 }}>
                        <path d="M0 6 L8 6 M5 3 L8 6 L5 9" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Flow animation CSS */}
        <style>{`
          @keyframes flowRight {
            0% { left: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
        `}</style>

        {/* Live event count indicator */}
        {activePackets.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 w-fit">
            <Zap size={12} className="animate-pulse" />
            {activePackets.length} event{activePackets.length > 1 ? "s" : ""} flowing through pipeline
          </div>
        )}
      </div>

      {/* Service Health Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Service Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceCard
            icon={Server}
            name="Backend API"
            status={backendStatus}
            color="#3b82f6"
            details={[
              { label: "Uptime", value: services.backend?.uptime || "—" },
              { label: "Memory", value: services.backend?.memoryMB ? `${services.backend.memoryMB} MB` : "—" },
              { label: "Node.js", value: services.backend?.nodeVersion || "—" },
              { label: "Port", value: "5000" },
            ]}
          />
          <ServiceCard
            icon={Database}
            name="MongoDB"
            status={mongoStatus}
            color="#10b981"
            details={[
              { label: "Database", value: services.mongodb?.database || "pulseboard" },
              { label: "Ping", value: services.mongodb?.pingMs != null ? `${services.mongodb.pingMs}ms` : "—" },
              { label: "ODM", value: "Mongoose 9.x" },
            ]}
          />
          <ServiceCard
            icon={Zap}
            name="Kafka Broker"
            status={kafkaStatus}
            color="#f59e0b"
            details={[
              { label: "Topic", value: services.kafka?.metrics?.topicName || "website-events" },
              { label: "Consumer Lag", value: kafkaMetrics?.kafka?.consumerLag ?? "—" },
              { label: "Partitions", value: kafkaMetrics?.kafka?.topicDetails?.partitionCount ?? "1" },
              { label: "Broker", value: "localhost:9092" },
            ]}
          />
          <ServiceCard
            icon={Activity}
            name="Kafka Consumer"
            status={consumerStatus}
            color="#8b5cf6"
            details={[
              { label: "Group ID", value: "pulseboard-consumer" },
              { label: "Socket", value: "Heartbeat-based" },
              { label: "Runtime", value: "Node.js KafkaJS" },
            ]}
          />
          <ServiceCard
            icon={Cpu}
            name="AI Engine"
            status={aiStatus}
            color="#ec4899"
            details={[
              { label: "Provider", value: services.ai?.provider || "Deterministic" },
              { label: "Memory", value: "In-process sessions" },
              { label: "RAG Context", value: "MongoDB live data" },
              { label: "Streaming", value: "Socket.io" },
            ]}
          />
          <ServiceCard
            icon={Wifi}
            name="Socket.io"
            status="healthy"
            color="#6366f1"
            details={[
              { label: "Protocol", value: "WebSocket / Polling" },
              { label: "Events", value: "new-event, chat:*, alerts" },
              { label: "CORS", value: "Wildcard (*)" },
            ]}
          />
        </div>
      </div>

      {/* Kafka Metrics Detail */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Kafka Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Topic", value: kafkaMetrics?.kafka?.topicName || "website-events", icon: "📨" },
            { label: "Consumer Lag", value: kafkaMetrics?.kafka?.consumerLag ?? "—", icon: "⏳" },
            { label: "Partitions", value: kafkaMetrics?.kafka?.topicDetails?.partitionCount ?? "1", icon: "🔀" },
            { label: "Latest Offset", value: kafkaMetrics?.kafka?.topicDetails?.latestOffset ?? "—", icon: "📍" },
          ].map((m) => (
            <div key={m.label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{m.icon}</span>
                <span className="text-xs text-gray-500">{m.label}</span>
              </div>
              <p className="text-xl font-bold text-white font-mono">{String(m.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Technology Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Apache Kafka", category: "Messaging", color: "#f59e0b" },
            { name: "MongoDB", category: "Database", color: "#10b981" },
            { name: "Socket.io", category: "Real-time", color: "#6366f1" },
            { name: "Express.js", category: "Backend API", color: "#3b82f6" },
            { name: "React 18", category: "Frontend", color: "#38bdf8" },
            { name: "Recharts", category: "Visualization", color: "#ec4899" },
            { name: "JWT + bcrypt", category: "Auth", color: "#8b5cf6" },
            { name: "Docker Compose", category: "Infrastructure", color: "#0ea5e9" },
            { name: "LLM Abstraction", category: "AI Layer", color: "#f43f5e" },
            { name: "Z-score Anomaly", category: "AI Detection", color: "#a78bfa" },
            { name: "EWMA / LR", category: "Predictions", color: "#34d399" },
            { name: "KafkaJS", category: "Kafka Client", color: "#fbbf24" },
          ].map((t) => (
            <div key={t.name} className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <div>
                <p className="text-xs font-semibold text-white">{t.name}</p>
                <p className="text-[10px] text-gray-600">{t.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastRefresh && (
        <p className="text-[11px] text-gray-700 text-right">Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 10s</p>
      )}
    </div>
  );
}
