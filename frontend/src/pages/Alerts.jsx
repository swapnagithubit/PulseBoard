import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Bell, 
  AlertCircle, 
  Info,
  ShieldAlert
} from "lucide-react";

const Alerts = () => {
  const { user } = useContext(AuthContext);
  const { realtimeAlerts, setRealtimeAlerts } = useContext(SocketContext);
  const [filterType, setFilterType] = useState("all"); // 'all', 'danger', 'warning', 'info', 'unread'
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const { data } = await axios.get("/api/alerts");
      const uniqueAlerts = [];
      const seenIds = new Set();
      for (const alert of data) {
        const id = alert._id || alert.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          uniqueAlerts.push(alert);
        }
      }
      setRealtimeAlerts(uniqueAlerts);
    } catch (err) {
      console.error("❌ Failed to fetch alerts:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`/api/alerts/${id}/read`);
      setRealtimeAlerts(prev =>
        prev.map(alert => (alert._id === id ? { ...alert, read: true } : alert))
      );
    } catch (err) {
      console.error("❌ Failed to mark alert as read:", err.message);
    }
  };

  const handleClearAll = async () => {
    if (user?.role !== "Admin") {
      alert("Only Administrators can clear the incident log.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently clear all system alerts?")) {
      return;
    }
    try {
      await axios.delete("/api/alerts");
      setRealtimeAlerts([]);
    } catch (err) {
      console.error("❌ Failed to clear alerts:", err.message);
    }
  };

  // Filter the alerts array
  const filteredAlerts = realtimeAlerts.filter(alert => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !alert.read;
    return alert.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Alert Rules Overview Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-400" /> Active Alert Policies
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Ingestion monitors scan transactions for purchase frequency spikes, consumer drops, and volume changes.
          </p>
        </div>

        {user?.role === "Admin" && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-500/10"
          >
            <Trash2 size={14} /> Clear All Alerts
          </button>
        )}
      </div>

      {/* Categories Selectors & Items list */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterType === "all"
                ? "bg-indigo-600/25 border-indigo-500/20 text-indigo-400"
                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
            }`}
          >
            All Incidents ({realtimeAlerts.length})
          </button>
          <button
            onClick={() => setFilterType("unread")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterType === "unread"
                ? "bg-indigo-600/25 border-indigo-500/20 text-indigo-400"
                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Unread ({realtimeAlerts.filter(a => !a.read).length})
          </button>
          <button
            onClick={() => setFilterType("danger")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterType === "danger"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Danger ({realtimeAlerts.filter(a => a.type === "danger").length})
          </button>
          <button
            onClick={() => setFilterType("warning")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterType === "warning"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Warnings ({realtimeAlerts.filter(a => a.type === "warning").length})
          </button>
          <button
            onClick={() => setFilterType("info")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterType === "info"
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Info ({realtimeAlerts.filter(a => a.type === "info").length})
          </button>
        </div>

        {/* Display Alert items */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">Scanning active alert logs...</span>
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 p-6">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2.5 animate-pulse" />
            <h4 className="text-sm font-bold text-white mb-1">System Healthy</h4>
            <p className="text-xs text-gray-400">No alerts fit the selected filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div
                key={alert._id || alert.id}
                className={`p-4 rounded-2xl border transition duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  alert.read 
                    ? "bg-white/[0.01] border-white/5 opacity-55" 
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Matching Icon Indicator */}
                  <div className={`p-2.5 rounded-xl border ${
                    alert.type === "danger" 
                      ? "bg-red-500/10 border-red-500/20 text-red-400" 
                      : alert.type === "warning" 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }`}>
                    {alert.type === "danger" ? <AlertCircle size={18} /> : alert.type === "warning" ? <AlertTriangle size={18} /> : <Info size={18} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-bold leading-normal">{alert.message}</span>
                      {!alert.read && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-600/30 text-indigo-400 font-extrabold uppercase tracking-wide border border-indigo-500/20">New</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block font-semibold">
                      Triggered at: {new Date(alert.time).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Mark Read button */}
                {!alert.read && (
                  <button
                    onClick={() => handleMarkRead(alert._id || alert.id)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase transition"
                  >
                    Dismiss Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
