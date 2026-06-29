import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Lock,
  Check,
  AlertTriangle
} from "lucide-react";

const Profile = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-400">
        User account not authenticated.
      </div>
    );
  }

  const isAdmin = user.role === "Admin";

  const adminPermissions = [
    "Read real-time metrics and historical logs",
    "Configure local warning thresholds and policies",
    "Mark or clear system incident notifications",
    "Perform database utility cleanups and resets",
    "Add new system users and adjust access levels"
  ];

  const viewerPermissions = [
    "Read real-time metrics and historical logs",
    "Export query metrics to CSV/PDF reports",
    "View active alerts and notification logs"
  ];

  const activePermissions = isAdmin ? adminPermissions : viewerPermissions;

  return (
    <div className="space-y-6">
      {/* Top Banner and Profile Info Card */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        {/* Colorful Gradient Header Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-[#070a13] flex items-center justify-center font-extrabold text-white text-3xl shadow-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="pt-14 pb-6 px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{user.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-1.5">
              <Mail size={13} className="text-gray-500" /> {user.email}
            </p>
          </div>

          <div className="flex items-center space-x-3.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isAdmin
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <Shield size={13} /> {user.role} Privilege
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User details attributes */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 h-fit">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
            Account Specifications
          </h3>
          
          <div className="space-y-4 text-xs">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-500 font-semibold">User Identification</span>
              <span className="text-gray-300 font-mono font-bold truncate max-w-44" title={user._id}>
                {user._id}
              </span>
            </div>

            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-500 font-semibold">Account Role</span>
              <span className="text-gray-300 font-bold">{user.role}</span>
            </div>

            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-500 font-semibold">Session Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Active
              </span>
            </div>
            
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-500 font-semibold">Joined Platform</span>
              <span className="text-gray-400 font-bold flex items-center gap-1">
                <Calendar size={12} /> June 2026
              </span>
            </div>
          </div>
        </div>

        {/* User permissions checklist */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3 flex items-center gap-2">
            <Lock size={14} className="text-indigo-400" /> Authorized Platform Capabilities
          </h3>

          <div className="space-y-3">
            {activePermissions.map((permission, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-gray-300"
              >
                <div className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/25 rounded-md flex items-center justify-center text-indigo-400 shrink-0">
                  <Check size={12} />
                </div>
                <span>{permission}</span>
              </div>
            ))}
          </div>

          {!isAdmin && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-medium flex items-start gap-2 leading-relaxed">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                Note: Wiping stats and database triggers is currently hidden because you are logged in as a Viewer. To explore write operations, login to an Admin account.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
