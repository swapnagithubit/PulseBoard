import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Power, Trash2, ShieldAlert, Activity, DollarSign, Filter, ActivitySquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RulesEngine = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Rule Form State
  const [newRule, setNewRule] = useState({
    name: "",
    eventType: "any",
    field: "amount",
    operator: "greater_than",
    value: "",
    severity: "warning",
  });

  const fetchRules = async () => {
    try {
      const { data } = await axios.get("/api/rules");
      setRules(data);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id) => {
    try {
      await axios.patch(`/api/rules/${id}/toggle`);
      setRules(rules.map(r => r._id === id ? { ...r, isActive: !r.isActive } : r));
    } catch (err) {
      console.error("Failed to toggle rule", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/rules/${id}`);
      setRules(rules.filter(r => r._id !== id));
    } catch (err) {
      console.error("Failed to delete rule", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/rules", newRule);
      setRules([data, ...rules]);
      setShowModal(false);
      setNewRule({
        name: "",
        eventType: "any",
        field: "amount",
        operator: "greater_than",
        value: "",
        severity: "warning",
      });
    } catch (err) {
      console.error("Failed to create rule", err);
      alert("Error creating rule. Ensure all fields are filled.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ActivitySquare className="text-indigo-400" /> Event Rules Engine
          </h2>
          <p className="text-sm text-gray-400 mt-1">Configure threshold monitors to automatically evaluate incoming telemetry and trigger AI alerts.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <Plus size={16} /> Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-32 flex items-center justify-center text-gray-500">
            Loading active rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="col-span-full glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
            <Filter size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Rules Configured</h3>
            <p className="text-sm text-gray-400">Create a rule to start evaluating events automatically.</p>
          </div>
        ) : (
          rules.map(rule => (
            <motion.div
              key={rule._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel p-6 rounded-2xl transition duration-300 relative overflow-hidden ${
                !rule.isActive ? "opacity-60 grayscale-[0.5]" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">{rule.name}</h3>
                  <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    rule.severity === "danger" ? "bg-red-500/20 text-red-400" :
                    rule.severity === "warning" ? "bg-amber-500/20 text-amber-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {rule.severity} Alert
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(rule._id)} className={`p-2 rounded-lg transition ${rule.isActive ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-gray-700/50 text-gray-500 hover:text-white"}`}>
                    <Power size={16} />
                  </button>
                  <button onClick={() => handleDelete(rule._id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="font-bold text-indigo-400 w-16">Event:</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-xs font-mono">{rule.eventType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="font-bold text-indigo-400 w-16">IF:</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-xs font-mono">{rule.field}</span>
                  <span className="text-pink-400 font-bold">{rule.operator.replace("_", " ")}</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-xs font-mono font-bold text-emerald-400">{rule.value}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b101e] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Create Alert Rule</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Rule Name</label>
                  <input required type="text" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="e.g. High Value Purchase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Event Type</label>
                    <select value={newRule.eventType} onChange={e => setNewRule({...newRule, eventType: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="any">Any Event</option>
                      <option value="purchase">Purchase</option>
                      <option value="click">Click</option>
                      <option value="signup">Signup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Target Field</label>
                    <select value={newRule.field} onChange={e => setNewRule({...newRule, field: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="amount">Amount ($)</option>
                      <option value="country">Country</option>
                      <option value="device">Device</option>
                      <option value="page">Page Path</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Operator</label>
                    <select value={newRule.operator} onChange={e => setNewRule({...newRule, operator: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="greater_than">Greater Than (&gt;)</option>
                      <option value="less_than">Less Than (&lt;)</option>
                      <option value="equals">Equals (==)</option>
                      <option value="not_equals">Not Equals (!=)</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Threshold Value</label>
                    <input required type="text" value={newRule.value} onChange={e => setNewRule({...newRule, value: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="e.g. 500 or US" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Alert Severity</label>
                  <select value={newRule.severity} onChange={e => setNewRule({...newRule, severity: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Yellow)</option>
                    <option value="danger">Danger (Red)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition text-sm font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition">Save Rule</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RulesEngine;
