import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  FileSpreadsheet, 
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";

const EventExplorer = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Search & Filtering States
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [device, setDevice] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sorting States
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  // Fetch events based on current query parameters
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        eventType,
        device,
        country,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      };
      
      const { data } = await axios.get("/api/analytics/events", { params });
      setEvents(data.events);
      setTotalEvents(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("❌ Failed to fetch explorer events:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, limit, eventType, device, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleResetFilters = () => {
    setSearch("");
    setEventType("");
    setDevice("");
    setCountry("");
    setStartDate("");
    setEndDate("");
    setSortBy("timestamp");
    setSortOrder("desc");
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Helper: fetch all records matching queries (without pagination limit) to export
  const fetchAllForExport = async () => {
    try {
      const params = {
        limit: 500, // Export limit cap
        search,
        eventType,
        device,
        country,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      };
      const { data } = await axios.get("/api/analytics/events", { params });
      return data.events;
    } catch (err) {
      console.error("❌ Export query failed:", err.message);
      return [];
    }
  };

  const handleExportCSV = async () => {
    const exportData = await fetchAllForExport();
    if (exportData.length === 0) {
      alert("No data available to export");
      return;
    }

    const headers = ["User ID", "Event Type", "Page", "Device", "Country", "Amount", "Timestamp"];
    const rows = exportData.map(e => [
      e.userId,
      e.eventType,
      e.page,
      e.device,
      e.country,
      e.amount || 0,
      new Date(e.timestamp).toISOString()
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pulseboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    const exportData = await fetchAllForExport();
    if (exportData.length === 0) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text("PulseBoard Real-Time Event Logs", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Filters: Event=${eventType || "All"} Device=${device || "All"} Query="${search || "None"}"`, 14, 32);

    const tableColumn = ["User ID", "Type", "Page", "Device", "Country", "Amount", "Timestamp"];
    const tableRows = exportData.map(e => [
      e.userId.slice(0, 10) + "...",
      e.eventType.toUpperCase(),
      e.page,
      e.device.toLowerCase(),
      e.country,
      e.eventType === "purchase" ? `$${e.amount}` : "-",
      new Date(e.timestamp).toLocaleString()
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // matching Indigo-600
    });

    doc.save(`pulseboard_report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Export Header Panel */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <Filter size={16} className="text-indigo-400" /> Filter & Search Engine
        </h3>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, Page, Country..."
              className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
            />
          </div>

          {/* Event type filter */}
          <div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-white/10 px-3.5 py-2.5 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Event Types</option>
              <option value="click">Click</option>
              <option value="signup">Signup</option>
              <option value="purchase">Purchase</option>
              <option value="add_to_cart">Add to Cart</option>
            </select>
          </div>

          {/* Device filter */}
          <div>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-white/10 px-3.5 py-2.5 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* Country text selector */}
          <div>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Filter by Country"
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
            />
          </div>

          {/* Date Pickers */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Buttons panel */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-end space-x-3">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition"
            >
              Query Events
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm transition flex items-center gap-1.5"
              title="Reset query options"
            >
              <RefreshCw size={14} /> Clear
            </button>
          </div>
        </form>
      </div>

      {/* Table & Actions Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Historical Logs ({totalEvents})</h4>
            <p className="text-[11px] text-gray-500 font-medium">Click columns header to sort logs</p>
          </div>

          {/* Exports actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition"
            >
              <FileText size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* Data View */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">Fetching matching event rows...</span>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-xs">
              No matching records found in the system.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[9px] font-bold">
                  <th className="pb-3.5 pl-2">User ID</th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white" 
                    onClick={() => toggleSort("eventType")}
                  >
                    <span className="flex items-center gap-1">Event <ArrowUpDown size={11} /></span>
                  </th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white" 
                    onClick={() => toggleSort("page")}
                  >
                    <span className="flex items-center gap-1">Page <ArrowUpDown size={11} /></span>
                  </th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white" 
                    onClick={() => toggleSort("device")}
                  >
                    <span className="flex items-center gap-1">Device <ArrowUpDown size={11} /></span>
                  </th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white" 
                    onClick={() => toggleSort("country")}
                  >
                    <span className="flex items-center gap-1">Country <ArrowUpDown size={11} /></span>
                  </th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white text-right" 
                    onClick={() => toggleSort("amount")}
                  >
                    <span className="flex items-center gap-1 justify-end">Amount <ArrowUpDown size={11} /></span>
                  </th>
                  <th 
                    className="pb-3.5 cursor-pointer hover:text-white text-right pr-2" 
                    onClick={() => toggleSort("timestamp")}
                  >
                    <span className="flex items-center gap-1 justify-end">Timestamp <ArrowUpDown size={11} /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-white/5 transition duration-150">
                    <td className="py-3 pl-2 text-indigo-400 font-bold font-mono">
                      {evt.userId.slice(0, 12)}...
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        evt.eventType === "purchase"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
                          : evt.eventType === "signup"
                          ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/10"
                          : evt.eventType === "add_to_cart"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/10"
                          : "bg-gray-500/15 text-gray-400 border border-gray-500/10"
                      }`}>
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{evt.page}</td>
                    <td className="py-3 text-gray-400 capitalize">{evt.device}</td>
                    <td className="py-3 text-gray-300">{evt.country}</td>
                    <td className="py-3 text-right text-white font-bold">
                      {evt.eventType === "purchase" ? `$${evt.amount}` : "-"}
                    </td>
                    <td className="py-3 text-right text-gray-500 pr-2">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-4 mt-4 gap-4">
            <span className="text-[11px] text-gray-500 font-medium">
              Showing page <strong className="text-white font-bold">{page}</strong> of <strong className="text-white font-bold">{totalPages}</strong> ({totalEvents} total logs)
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 hover:bg-white/10 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white disabled:opacity-50 hover:bg-white/10 transition"
              >
                <ChevronRight size={16} />
              </button>

              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[#0a0f1d] border border-white/10 px-2 py-1 text-xs rounded-lg text-gray-300 focus:outline-none"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventExplorer;
