import React, { useState } from "react";
import axios from "axios";
import { FileText, Download, Wand2, CheckCircle2, AlertTriangle, TrendingUp, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AIReports = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  
  // Configuration options
  const [config, setConfig] = useState({
    timeframe: "7d",
    focus: "general",
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post("/api/ai/report", config);
      setReport(data.report);
    } catch (err) {
      console.error("Failed to generate report", err);
      alert("AI Provider currently unavailable or context generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    // We use the browser's native print to PDF functionality which yields perfect results
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Hide controls when printing */}
      <div className="print:hidden">
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="text-indigo-400" /> AI Executive Reports
            </h2>
            <p className="text-sm text-gray-400 mt-1">Generate comprehensive analytics summaries and strategic recommendations.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              <select value={config.timeframe} onChange={e => setConfig({...config, timeframe: e.target.value})} className="bg-transparent text-sm text-white focus:outline-none px-2 py-1">
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <div className="w-px h-4 bg-white/10"></div>
              <select value={config.focus} onChange={e => setConfig({...config, focus: e.target.value})} className="bg-transparent text-sm text-white focus:outline-none px-2 py-1">
                <option value="general">General Overview</option>
                <option value="revenue">Revenue & Sales</option>
                <option value="traffic">Traffic & Engagement</option>
                <option value="anomalies">Anomalies & Risks</option>
              </select>
            </div>
            
            <button
              onClick={generateReport}
              disabled={loading}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg flex items-center gap-2 ${
                loading ? "bg-indigo-600/50 text-white cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
              }`}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Generating...</>
              ) : (
                <><Wand2 size={16} /> Generate Report</>
              )}
            </button>
          </div>
        </div>
      </div>

      {!report && !loading && (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center print:hidden border border-dashed border-white/20">
          <FileText size={48} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Report Generated</h3>
          <p className="text-gray-400 max-w-md">Configure your parameters above and click generate to create an AI-powered executive summary of your platform's performance.</p>
        </div>
      )}

      {/* Rendered Report Area */}
      <AnimatePresence>
        {report && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white text-gray-900 p-8 md:p-12 rounded-2xl shadow-2xl mx-auto max-w-4xl print:p-0 print:shadow-none print:max-w-none print:text-black"
          >
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">PulseBoard Executive Report</h1>
                <p className="text-gray-500 font-medium">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="text-right print:hidden">
                <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-bold transition">
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>

            {/* Markdown formatting simulation for the report text */}
            <div className="prose prose-indigo max-w-none">
              {report.split('\n').map((paragraph, idx) => {
                if (paragraph.startsWith('###')) {
                  return <h3 key={idx} className="text-lg font-bold mt-6 mb-3 text-indigo-700">{paragraph.replace('### ', '')}</h3>
                } else if (paragraph.startsWith('##')) {
                  return <h2 key={idx} className="text-xl font-black mt-8 mb-4 border-b pb-2">{paragraph.replace('## ', '')}</h2>
                } else if (paragraph.startsWith('#')) {
                  return <h1 key={idx} className="text-2xl font-black mt-8 mb-4">{paragraph.replace('# ', '')}</h1>
                } else if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                  return <li key={idx} className="ml-4 mb-1 text-gray-700">{paragraph.substring(2)}</li>
                } else if (paragraph.trim() === '') {
                  return <br key={idx} />;
                } else {
                  // Bold text parsing
                  const parts = paragraph.split(/(\*\*.*?\*\*)/).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });
                  return <p key={idx} className="mb-4 text-gray-700 leading-relaxed">{parts}</p>
                }
              })}
            </div>
            
            <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-medium">
              <p>Generated by PulseBoard AI Analytics Engine</p>
              <p>Confidential Internal Report</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* CSS to hide non-report elements during printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .glass-sidebar, .navbar, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
        }
      `}} />
    </div>
  );
};

export default AIReports;
