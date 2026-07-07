import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Compass, 
  AlertTriangle, 
  Settings, 
  User, 
  LogOut,
  TrendingUp,
  Terminal,
  Brain,
  Globe,
  Cpu,
  Clock,
  MonitorSmartphone,
  ActivitySquare,
  FileText
} from "lucide-react";

const Sidebar = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Event Explorer", path: "/explorer", icon: Compass },
    { name: "Event Timeline", path: "/timeline", icon: Clock },
    { name: "AI Copilot", path: "/ai", icon: Brain },
    { name: "World Map", path: "/worldmap", icon: Globe },
    { name: "Architecture", path: "/architecture", icon: Cpu },
    { name: "Alerts", path: "/alerts", icon: AlertTriangle },
    { name: "Session Replay", path: "/sessions", icon: MonitorSmartphone },
    { name: "Alert Rules", path: "/rules", icon: ActivitySquare },
    { name: "AI Reports", path: "/reports", icon: FileText },
    { name: "Integration", path: "/integration", icon: Terminal },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 glass-sidebar min-h-screen flex flex-col justify-between p-6 fixed left-0 top-0 z-30">
      <div className="flex flex-col flex-1">
        {/* Logo Section */}
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white flex items-center justify-center">
            <TrendingUp size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-wide font-display bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              PulseBoard
            </h1>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block -mt-1">
              AI Analytics Platform
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium text-sm transition duration-200 ${
                  isActive
                    ? "bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/5 font-semibold"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={17} />
              <span>{item.name}</span>
              {item.name === "AI Copilot" && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  AI
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Section & Logout */}
      <div className="pt-6 border-t border-white/5 flex flex-col space-y-4">
        {user && (
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/10">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white truncate">{user.name}</h4>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                user.role === "Admin"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              }`}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 text-sm font-medium transition duration-200"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
