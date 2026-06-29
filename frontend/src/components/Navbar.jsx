import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle,
  User,
  ChevronDown,
  Trash2
} from "lucide-react";
import axios from "axios";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AuthContext);
  const { isConnected, kafkaStatus, realtimeAlerts, setRealtimeAlerts } = useContext(SocketContext);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const notifRef = useRef();
  const profileRef = useRef();

  // Determine Page Title
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Analytics Dashboard";
      case "/explorer":
        return "Event Explorer";
      case "/alerts":
        return "System Alerts";
      case "/profile":
        return "My Profile";
      case "/settings":
        return "Settings";
      default:
        return "PulseBoard";
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial alerts (unreads or latest) to populate notifications
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get("/api/alerts");
        setRealtimeAlerts(data);
      } catch (err) {
        console.error("❌ Error fetching alerts:", err.message);
      }
    };
    fetchAlerts();
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      // Find unread alerts
      const unreads = realtimeAlerts.filter(a => !a.read);
      for (const alert of unreads) {
        await axios.put(`/api/alerts/${alert._id}/read`);
      }
      // Update local state
      setRealtimeAlerts(prev => prev.map(a => ({ ...a, read: true })));
    } catch (err) {
      console.error("❌ Failed to mark alerts as read:", err.message);
    }
  };

  const handleClearAlerts = async () => {
    if (user?.role !== "Admin") return;
    try {
      await axios.delete("/api/alerts");
      setRealtimeAlerts([]);
    } catch (err) {
      console.error("❌ Failed to clear alerts:", err.message);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const unreadCount = realtimeAlerts.filter((a) => !a.read).length;

  return (
    <header className="glass-nav h-16 fixed top-0 left-64 right-0 flex items-center justify-between px-8 z-20">
      {/* Page Title */}
      <h2 className="text-xl font-bold font-display text-white tracking-tight">
        {getPageTitle()}
      </h2>

      {/* Action Badges & Profile Options */}
      <div className="flex items-center space-x-6">
        {/* Connection Status Badger */}
        <div className="flex items-center space-x-4 border-r border-white/5 pr-6 text-xs font-semibold">
          {/* Socket status */}
          <div className="flex items-center space-x-1.5">
            {isConnected ? (
              <span className="flex items-center text-emerald-400 gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <Wifi size={13} /> Socket Active
              </span>
            ) : (
              <span className="flex items-center text-red-400 gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                <WifiOff size={13} /> Socket Offline
              </span>
            )}
          </div>

          {/* Kafka Engine status */}
          <div className="flex items-center space-x-1.5">
            {kafkaStatus === "Connected" ? (
              <span className="flex items-center text-emerald-400 gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={13} /> Kafka Connected
              </span>
            ) : (
              <span className="flex items-center text-red-400 gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 animate-pulse">
                <XCircle size={13} /> Kafka Disconnected
              </span>
            )}
          </div>
        </div>

        {/* Alerts Notification Drawer Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition duration-200"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-3 w-80 glass-panel rounded-2xl overflow-hidden shadow-2xl z-40">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">Alert Notifications</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-indigo-400 hover:underline hover:text-indigo-300 font-semibold"
                  >
                    Mark read
                  </button>
                  {user?.role === "Admin" && (
                    <button
                      onClick={handleClearAlerts}
                      className="text-red-400 hover:text-red-300"
                      title="Clear all alerts"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {realtimeAlerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">
                    No system alerts detected.
                  </div>
                ) : (
                  realtimeAlerts.map((alert) => (
                    <div 
                      key={alert._id || alert.id} 
                      className={`p-4 transition duration-150 ${
                        alert.read ? "opacity-60 bg-transparent" : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          alert.type === "danger" 
                            ? "bg-red-500" 
                            : alert.type === "warning" 
                            ? "bg-amber-500" 
                            : "bg-blue-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 font-medium leading-relaxed">
                            {alert.message}
                          </p>
                          <span className="text-[10px] text-gray-500 font-medium mt-1 block">
                            {new Date(alert.time).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Link
                to="/alerts"
                onClick={() => setNotifOpen(false)}
                className="block text-center p-3 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-white/5 border-t border-white/5 font-semibold transition"
              >
                View all alerts
              </Link>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/10 text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={14} className="text-gray-400 pr-1.5" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-48 glass-panel rounded-2xl overflow-hidden shadow-2xl z-40">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Logged in as</p>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">{user?.name}</h4>
              </div>
              <div className="p-1">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/5 hover:text-white transition"
                >
                  <User size={13} />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                >
                  <Trash2 size={13} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
