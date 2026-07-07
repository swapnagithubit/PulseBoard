import React, { useState, useEffect, useRef, useContext } from "react";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { Bot, Send, Mic, Trash2, ChevronDown, Sparkles, Brain, Cpu, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SUGGESTIONS = [
  "Why did revenue decrease today?",
  "Which country has the highest traffic?",
  "What's the conversion rate?",
  "Predict tomorrow's revenue",
  "Give me business recommendations",
  "Show device breakdown analysis",
  "Summarize today's performance",
  "Explain any anomalies detected",
];

const EventTypeBadge = ({ type }) => {
  const colors = {
    positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-red-400 bg-red-500/10 border-red-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  return null;
};

// Simple markdown renderer — bold, headers, bullets, code
const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} className="text-white font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} className="text-white font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.slice(2);
      return <li key={i} className="ml-4 text-gray-300 text-sm leading-relaxed list-none flex gap-2"><span className="text-indigo-400 mt-0.5">•</span><span>{renderInline(content)}</span></li>;
    }
    if (line.startsWith("|")) return <div key={i} className="text-sm text-gray-400 font-mono text-xs my-0.5">{line}</div>;
    if (line === "---") return <hr key={i} className="border-white/10 my-3" />;
    if (line === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-gray-300 text-sm leading-relaxed">{renderInline(line)}</p>;
  });
};

const renderInline = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-white/10 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
    <span className="text-xs text-gray-500 ml-1">AI is thinking...</span>
  </div>
);

export default function AICopilot() {
  const { socket } = useSocket();
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your **PulseBoard AI Analytics Copilot**. I have access to your live dashboard data — revenue, traffic, conversions, anomalies, and more.\n\nAsk me anything about your analytics!",
      provider: "PulseBoard Analytics Engine",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [providerInfo, setProviderInfo] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (socket) setSessionId(socket.id || "session-" + Date.now());
  }, [socket]);

  // Fetch AI provider status
  useEffect(() => {
    axios.get(`${API_BASE}/api/ai/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setProviderInfo(res.data))
      .catch(() => {});
  }, [token]);

  // Socket.io event listeners for streaming
  useEffect(() => {
    if (!socket) return;

    const handleStart = () => {
      setIsStreaming(true);
      setStreamingContent("");
    };

    const handleToken = ({ token }) => {
      setStreamingContent((prev) => prev + token);
    };

    const handleEnd = ({ fullResponse, provider }) => {
      setIsStreaming(false);
      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullResponse, provider, timestamp: new Date() },
      ]);
    };

    socket.on("chat:start", handleStart);
    socket.on("chat:token", handleToken);
    socket.on("chat:end", handleEnd);

    return () => {
      socket.off("chat:start", handleStart);
      socket.off("chat:token", handleToken);
      socket.off("chat:end", handleEnd);
    };
  }, [socket]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, timestamp: new Date() }]);

    if (socket && sessionId) {
      socket.emit("chat:start", { message: msg, sessionId });
    } else {
      // Fallback: HTTP endpoint
      setIsStreaming(true);
      try {
        const res = await axios.post(`${API_BASE}/api/ai/chat`, { message: msg, sessionId: sessionId || "fallback" }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "⚠️ AI service unavailable. Please try again.",
          timestamp: new Date(),
        }]);
      } finally {
        setIsStreaming(false);
      }
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared. Ask me anything about your analytics! 🤖", provider: "PulseBoard Analytics Engine", timestamp: new Date() }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Brain size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#070a13] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Analytics Copilot</h1>
            <p className="text-sm text-gray-500">Powered by real-time dashboard data via RAG</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {providerInfo && (
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2">
              <Cpu size={14} className="text-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium">{providerInfo.activeProvider}</span>
            </div>
          )}
          <button onClick={clearChat} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 border border-white/5 hover:border-red-500/20 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all hover:scale-105"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
              msg.role === "user" ? "bg-indigo-600" : "bg-gradient-to-br from-purple-500 to-pink-500"
            }`}>
              {msg.role === "user" ? "U" : <Sparkles size={14} className="text-white" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-indigo-600/90 text-white ml-auto"
                : "bg-white/[0.04] border border-white/10"
            }`}>
              {msg.role === "user" ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
              )}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-gray-600">
                  {msg.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.provider && (
                  <span className="text-[10px] text-indigo-400/60">{msg.provider}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={14} className="text-white animate-spin" />
            </div>
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/[0.04] border border-indigo-500/30">
              {streamingContent ? (
                <div className="space-y-0.5">
                  {renderMarkdown(streamingContent)}
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                </div>
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about revenue, traffic, conversions, anomalies..."
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
            disabled={isStreaming}
          />
          {input && (
            <span className="text-[10px] text-gray-600">Press Enter ↵</span>
          )}
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isStreaming}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-30 hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Provider switcher info */}
      <p className="text-center text-[11px] text-gray-700 mt-3">
        Set <code className="text-indigo-600">LLM_PROVIDER=openai|claude|gemini|ollama</code> in backend <code className="text-indigo-600">.env</code> to switch AI providers
      </p>
    </div>
  );
}
