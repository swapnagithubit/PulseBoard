import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Play, Pause, FastForward, Rewind, MonitorSmartphone, MousePointer, DollarSign, Clock, MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SessionReplay = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [replayState, setReplayState] = useState({ isPlaying: false, currentTime: 0, speed: 1 });
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  const replayTimer = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await axios.get("/api/analytics/sessions");
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySession = async (userId) => {
    try {
      const { data } = await axios.get(`/api/analytics/sessions/${userId}`);
      setSessionEvents(data);
      setSelectedSession(userId);
      setCurrentEventIndex(0);
      setReplayState({ isPlaying: true, currentTime: 0, speed: 1 });
    } catch (err) {
      console.error("Failed to fetch session details", err);
    }
  };

  useEffect(() => {
    if (replayState.isPlaying && sessionEvents.length > 0) {
      replayTimer.current = setInterval(() => {
        setCurrentEventIndex((prev) => {
          if (prev >= sessionEvents.length - 1) {
            setReplayState(s => ({ ...s, isPlaying: false }));
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / replayState.speed);
    } else {
      clearInterval(replayTimer.current);
    }
    return () => clearInterval(replayTimer.current);
  }, [replayState.isPlaying, replayState.speed, sessionEvents]);

  const closePlayer = () => {
    setSelectedSession(null);
    setSessionEvents([]);
    setReplayState({ isPlaying: false, currentTime: 0, speed: 1 });
    setCurrentEventIndex(0);
  };

  return (
    <div className="space-y-6 relative">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2 mb-2">
          <MonitorSmartphone className="text-pink-400" /> Session Replay (Beta)
        </h2>
        <p className="text-sm text-gray-400 mb-6">Visually reconstruct user journeys through chronological event timeline playback.</p>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading user sessions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Location & Device</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Pages Visited</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.userId} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono text-white text-xs">{session.userId.slice(0, 10)}...</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-blue-400" /> {session.country}
                        <MonitorSmartphone size={12} className="text-gray-500 ml-2" /> {session.device}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{session.eventCount}</span> triggers
                    </td>
                    <td className="px-4 py-3 text-xs">{session.pagesVisited.join(", ")}</td>
                    <td className="px-4 py-3">{Math.round(session.durationMs / 1000)}s</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handlePlaySession(session.userId)}
                        className="px-3 py-1.5 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/20 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <Play size={12} /> Play Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Player Modal */}
      <AnimatePresence>
        {selectedSession && sessionEvents.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="w-full max-w-5xl bg-[#0b101e] border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
              
              {/* Header Controls */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <h3 className="font-bold text-white">Live Replay</h3>
                  </div>
                  <span className="text-xs text-gray-500 font-mono border-l border-white/10 pl-4">{selectedSession}</span>
                </div>
                <button onClick={closePlayer} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              {/* Player Body (Mock Browser Screen) */}
              <div className="flex-1 relative bg-[#070a13] flex items-center justify-center p-8 overflow-hidden">
                <div className="w-full max-w-3xl aspect-[16/9] bg-white rounded-xl shadow-lg relative overflow-hidden flex flex-col border-4 border-gray-800">
                  
                  {/* Browser URL Bar */}
                  <div className="bg-gray-100 p-2 flex items-center gap-2 border-b border-gray-300">
                    <div className="flex gap-1.5 px-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="bg-white text-gray-600 text-xs px-3 py-1 rounded-md flex-1 font-mono flex items-center gap-2 shadow-sm border border-gray-200">
                      <span>🔒 pulseboard.app</span>
                      <span className="text-indigo-600 font-bold">{sessionEvents[currentEventIndex]?.page || "/"}</span>
                    </div>
                  </div>

                  {/* Mock Page Content based on Event */}
                  <div className="flex-1 relative bg-gray-50 p-8 flex flex-col">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={sessionEvents[currentEventIndex]?._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                      >
                        {sessionEvents[currentEventIndex]?.eventType === "purchase" && (
                          <>
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                              <DollarSign size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800">Checkout Complete!</h2>
                            <p className="text-gray-500">Order confirmed for <span className="font-bold text-emerald-600">${sessionEvents[currentEventIndex]?.amount}</span></p>
                          </>
                        )}
                        {sessionEvents[currentEventIndex]?.eventType === "click" && (
                          <>
                            <MousePointer size={48} className="text-indigo-300 mb-4" />
                            <h2 className="text-2xl font-black text-gray-800">Interacting with Page</h2>
                            <p className="text-gray-500">User is browsing <span className="font-bold">{sessionEvents[currentEventIndex]?.page}</span></p>
                          </>
                        )}
                        {sessionEvents[currentEventIndex]?.eventType === "signup" && (
                          <>
                            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                              <MonitorSmartphone size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800">Account Created</h2>
                            <p className="text-gray-500">Welcome new user from {sessionEvents[currentEventIndex]?.country}</p>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Animated Mouse Click Pulse Overlay */}
                    {sessionEvents[currentEventIndex]?.eventType === "click" && (
                      <motion.div 
                        key={`pulse-${sessionEvents[currentEventIndex]?._id}`}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute w-12 h-12 bg-indigo-500/30 rounded-full border border-indigo-500 pointer-events-none"
                        style={{
                          left: `${30 + Math.random() * 40}%`,
                          top: `${30 + Math.random() * 40}%`
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline Footer Controls */}
              <div className="p-4 bg-white/5 border-t border-white/10 flex flex-col gap-3">
                
                {/* Event Tracker Info */}
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>{new Date(sessionEvents[currentEventIndex]?.timestamp).toLocaleString()}</span>
                  <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">{sessionEvents[currentEventIndex]?.eventType.toUpperCase()}</span>
                  <span>Event {currentEventIndex + 1} / {sessionEvents.length}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-1.5 relative overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentEventIndex + 1) / sessionEvents.length) * 100}%` }}
                    transition={{ type: "spring", bounce: 0 }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 pt-2">
                  <button 
                    onClick={() => setReplayState(s => ({ ...s, speed: s.speed === 1 ? 0.5 : 1 }))}
                    className={`text-xs font-bold px-2 py-1 rounded transition ${replayState.speed === 0.5 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"}`}
                  >
                    0.5x
                  </button>
                  <button 
                    onClick={() => setCurrentEventIndex(Math.max(0, currentEventIndex - 1))}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <Rewind size={20} />
                  </button>
                  <button 
                    onClick={() => setReplayState(s => ({ ...s, isPlaying: !s.isPlaying }))}
                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg shadow-white/10"
                  >
                    {replayState.isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                  </button>
                  <button 
                    onClick={() => setCurrentEventIndex(Math.min(sessionEvents.length - 1, currentEventIndex + 1))}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <FastForward size={20} />
                  </button>
                  <button 
                    onClick={() => setReplayState(s => ({ ...s, speed: s.speed === 1 ? 2 : s.speed === 2 ? 4 : 1 }))}
                    className={`text-xs font-bold px-2 py-1 rounded transition ${replayState.speed > 1 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"}`}
                  >
                    {replayState.speed > 1 ? `${replayState.speed}x` : "1x"}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionReplay;
