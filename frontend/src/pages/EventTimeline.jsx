import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Clock, ShoppingCart, MousePointer, UserPlus, Filter, ChevronLeft, ChevronRight, Zap } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EVENT_CONFIG = {
  click: { icon: <MousePointer size={13} />, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", label: "Click" },
  purchase: { icon: <ShoppingCart size={13} />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Purchase" },
  signup: { icon: <UserPlus size={13} />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Signup" },
  add_to_cart: { icon: <ShoppingCart size={13} />, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", label: "Add to Cart" },
};

const getEventConfig = (type) => EVENT_CONFIG[type] || {
  icon: <Zap size={13} />,
  color: "text-blue-400",
  bg: "bg-blue-500/10 border-blue-500/20",
  label: type,
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

const EventRow = ({ event, isNew }) => {
  const cfg = getEventConfig(event.eventType);

  return (
    <div className={`flex items-center gap-4 py-3.5 px-4 border-b border-white/5 transition-all duration-500 hover:bg-white/[0.02] ${isNew ? "animate-pulse-once bg-indigo-500/5" : ""}`}>
      {/* Timeline line */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
          {cfg.icon}
        </div>
      </div>

      {/* Event type badge */}
      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color}`} style={{ minWidth: 90 }}>
        {cfg.label}
      </div>

      {/* Page */}
      <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg hidden md:block flex-shrink-0 max-w-[120px] truncate">
        {event.page}
      </code>

      {/* User */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 truncate font-mono">{event.userId}</p>
        <p className="text-[10px] text-gray-600 flex items-center gap-2 mt-0.5">
          <span className="capitalize">{event.device}</span>
          <span>·</span>
          <span>{event.country}</span>
        </p>
      </div>

      {/* Amount */}
      {event.amount > 0 ? (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-emerald-400 font-mono">${event.amount}</p>
          <p className="text-[10px] text-gray-600">revenue</p>
        </div>
      ) : (
        <div className="w-16 flex-shrink-0" />
      )}

      {/* Time */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-xs text-gray-500">{formatTimeAgo(event.timestamp)}</p>
        <p className="text-[10px] text-gray-700">{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
};

export default function EventTimeline() {
  const { token } = useContext(AuthContext);
  const { socket } = useSocket();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [newEventIds, setNewEventIds] = useState(new Set());

  const fetchTimeline = useCallback(async (page = 1, type = "") => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (type) params.eventType = type;
      const res = await axios.get(`${API_BASE}/api/analytics/timeline`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error("Timeline fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTimeline(currentPage, filter);
  }, [currentPage, filter]);

  // Listen for live events
  useEffect(() => {
    if (!socket) return;
    const handleEvent = (event) => {
      if (currentPage === 1 && (!filter || filter === event.eventType)) {
        setEvents((prev) => [event, ...prev.slice(0, 19)]);
        setTotal((prev) => prev + 1);
        const id = event._id || `live-${Date.now()}`;
        setNewEventIds((prev) => new Set([...prev, id]));
        setTimeout(() => setNewEventIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 2000);
      }
    };
    socket.on("new-event", handleEvent);
    return () => socket.off("new-event", handleEvent);
  }, [socket, currentPage, filter]);

  const handleFilterChange = (type) => {
    setFilter(type === filter ? "" : type);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Clock className="text-indigo-400" size={26} />
            Event Timeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {total.toLocaleString()} total events · Live updates via Socket.io
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-500" />
          {Object.entries(EVENT_CONFIG).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                filter === type
                  ? `${cfg.bg} ${cfg.color} scale-105`
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.06]"
              }`}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          ))}
          {filter && (
            <button
              onClick={() => handleFilterChange("")}
              className="px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-500 hover:text-white transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table header */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 bg-white/[0.02] border-b border-white/5 text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
          <div className="w-8 flex-shrink-0" />
          <div className="flex-shrink-0" style={{ minWidth: 90 }}>Type</div>
          <div className="hidden md:block flex-shrink-0 w-[120px]">Page</div>
          <div className="flex-1">User / Device</div>
          <div className="flex-shrink-0 w-16 text-right">Amount</div>
          <div className="hidden sm:block flex-shrink-0 w-20 text-right">Time</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock size={32} className="text-gray-700" />
            <p className="text-gray-600 text-sm">No events found</p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <EventRow
                key={event._id || event.userId + event.timestamp}
                event={event}
                isNew={newEventIds.has(event._id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-600">
              Page {currentPage} of {pages} · {total.toLocaleString()} events
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              {[...Array(Math.min(5, pages))].map((_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (page > pages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-medium transition-all ${
                      page === currentPage
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
                disabled={currentPage === pages}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
