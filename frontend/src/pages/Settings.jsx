import React, { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { 
  Settings as SettingsIcon, 
  Trash2, 
  ShieldCheck, 
  Bell, 
  Database,
  Sliders,
  CheckCircle,
  XCircle
} from "lucide-react";

const Settings = () => {
  const { user } = useContext(AuthContext);
  const { setLiveEvents, setRealtimeAlerts } = useContext(SocketContext);
  
  // Local states for mock configuration values
  const [purchaseThreshold, setPurchaseThreshold] = useState(
    localStorage.getItem("threshold_purchase_amount") || "4000"
  );
  const [purchaseFrequency, setPurchaseFrequency] = useState(
    localStorage.getItem("threshold_purchase_freq") || "15"
  );
  const [activeUsersBaseline, setActiveUsersBaseline] = useState("30");

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [resettingDB, setResettingDB] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [seedingDB, setSeedingDB] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavingSettings(true);
    
    // Save to localStorage
    localStorage.setItem("threshold_purchase_amount", purchaseThreshold);
    localStorage.setItem("threshold_purchase_freq", purchaseFrequency);
    
    setTimeout(() => {
      setSavingSettings(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleResetDatabase = async () => {
    if (user?.role !== "Admin") {
      alert("Permission denied. Only Administrators can reset data logs.");
      return;
    }

    if (!window.confirm("CRITICAL WARNING: This will permanently wipe all raw event logs, analytics totals, and alert logs in the database. Are you sure you wish to proceed?")) {
      return;
    }

    setResettingDB(true);
    setResetSuccess(false);

    try {
      const { data } = await axios.post("/api/analytics/reset");
      // Clear socket states locally
      setLiveEvents([]);
      setRealtimeAlerts([]);
      
      setResetSuccess(true);
      alert(data.message || "Database reset completed successfully!");
    } catch (err) {
      console.error("❌ Reset request failed:", err.message);
      alert("Failed to reset database metrics. Check backend connection.");
    } finally {
      setResettingDB(false);
      setTimeout(() => setResetSuccess(false), 5000);
    }
  };

  const handleSeedDatabase = async () => {
    if (user?.role !== "Admin") {
      alert("Permission denied. Only Administrators can seed database.");
      return;
    }

    if (!window.confirm("WARNING: This will clear existing logs and seed 200 mock historical events spread over the last 24 hours. Proceed?")) {
      return;
    }

    setSeedingDB(true);
    setSeedSuccess(false);

    try {
      const { data } = await axios.post("/api/analytics/seed", {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setSeedSuccess(true);
      alert(data.message || "Database seeded successfully!");
      window.location.reload();
    } catch (err) {
      console.error("❌ Seeding request failed:", err.message);
      alert("Failed to seed database. Check backend connection.");
    } finally {
      setSeedingDB(false);
      setTimeout(() => setSeedSuccess(false), 5000);
    }
  };

  const isAdmin = user?.role === "Admin";

  return (
    <div className="space-y-6">
      {/* Settings Header Card */}
      <div className="glass-panel p-6 rounded-2xl flex items-center space-x-3.5">
        <div className="bg-indigo-600/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
          <SettingsIcon size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">System Settings</h3>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">
            Configure system rules, sliding values, and developer control targets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Thresholds Rules Form */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sliders size={16} className="text-indigo-400" /> Threshold Rules (Local Sync)
          </h4>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Purchase Spike Threshold Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="text-gray-300">Purchase Large-Amount Flag Alert</label>
                <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                  &gt; ${purchaseThreshold}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="5000"
                step="250"
                value={purchaseThreshold}
                onChange={(e) => setPurchaseThreshold(e.target.value)}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                Pushes a system warning alert if a single user checkout exceeds this amount.
              </p>
            </div>

            {/* Purchase Frequency Spike */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="text-gray-300">Purchase Frequency Alert (per min)</label>
                <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                  &gt; {purchaseFrequency} checkouts
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={purchaseFrequency}
                onChange={(e) => setPurchaseFrequency(e.target.value)}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                Raises an automated danger flag if consumer processes buy actions faster than this rate.
              </p>
            </div>

            {/* Traffic Baseline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="text-gray-300">Minimum Event Count for Revenue Drop Checking</label>
                <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                  {activeUsersBaseline} events
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={activeUsersBaseline}
                onChange={(e) => setActiveUsersBaseline(e.target.value)}
                disabled
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-not-allowed opacity-55 accent-indigo-500"
              />
              <p className="text-[10px] text-red-500/60 leading-relaxed font-medium">
                Locked: Hardcoded inside Kafka consumer evaluation rules.
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition uppercase shadow-lg shadow-indigo-500/15"
              >
                {savingSettings ? "Saving Settings..." : "Commit Thresholds"}
              </button>
              
              {saveSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> Rules stored locally
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Database Wipes Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-fit space-y-6">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Database size={16} className="text-red-400" /> Database Utilities
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              System actions to seed, reset, or purge aggregated records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
            {isAdmin ? (
              <ShieldCheck size={28} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={28} className="text-red-400 shrink-0" />
            )}
            <div>
              <h5 className="text-xs font-bold text-white">
                {isAdmin ? "Admin Authorization Active" : "Viewer Permission Level"}
              </h5>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                {isAdmin ? "You have write access to clear DB files." : "Database reset is restricted to Admin role."}
              </p>
            </div>
          </div>

          <button
            onClick={handleSeedDatabase}
            disabled={!isAdmin || seedingDB}
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition duration-150 flex items-center justify-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-950/20 disabled:text-indigo-800 disabled:border-indigo-950/25 disabled:cursor-not-allowed border border-transparent hover:shadow-lg hover:shadow-indigo-500/5 mb-3"
          >
            <Database size={14} />
            {seedingDB ? "Seeding database..." : "Seed Mock Analytics Data"}
          </button>

          <button
            onClick={handleResetDatabase}
            disabled={!isAdmin || resettingDB}
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition duration-150 flex items-center justify-center gap-2 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-950/20 disabled:text-red-800 disabled:border-red-950/25 disabled:cursor-not-allowed border border-transparent hover:shadow-lg hover:shadow-red-500/5"
          >
            <Trash2 size={14} />
            {resettingDB ? "Purging database..." : "Reset Analytics Database"}
          </button>
          
          {resetSuccess && (
            <span className="text-[10px] text-center text-emerald-400 font-bold block">
              ✅ Database wiped. Logs reset.
            </span>
          )}
          {seedSuccess && (
            <span className="text-[10px] text-center text-emerald-400 font-bold block mt-1">
              ✅ Database seeded. Reloading.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
