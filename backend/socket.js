const Alert = require("./models/Alert");
const logger = require("./config/logger");

let io;
let lastConsumerHeartbeat = 0;
let consumerConnected = false;

const initSocket = (server) => {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    // Send the current consumer connection status to the newly connected UI client
    socket.emit("consumer-status", consumerConnected ? "Connected" : "Disconnected");

    // Listen to consumer heartbeat ping
    socket.on("consumer-heartbeat", () => {
      lastConsumerHeartbeat = Date.now();
      if (!consumerConnected) {
        consumerConnected = true;
        io.emit("consumer-status", "Connected");
        logger.info("✅ Kafka Consumer status: CONNECTED");
      }
    });

    // Listen to data channels from Consumer client and relay them to UI clients
    socket.on("analytics-update", (data) => {
      io.emit("analytics-update", data);
    });

    socket.on("new-event", (event) => {
      io.emit("new-event", event);
    });

    socket.on("new-alert", (alert) => {
      io.emit("new-alert", alert);
    });

    // ─── AI Copilot Chat ────────────────────────────────────────────────────
    // Client sends chat:start → server processes and streams back via chat:token / chat:end
    socket.on("chat:start", async ({ message, sessionId }) => {
      if (!message || !sessionId) return;

      logger.info(`[AI Chat] Socket ${socket.id} — "${message.slice(0, 60)}"`);

      try {
        const { fetchAnalyticsContext } = require("./services/analyticsContext");
        const { getHistory, addMessage } = require("./services/chatMemory");
        const { getProvider } = require("./services/llm");

        const [context, history] = await Promise.all([
          fetchAnalyticsContext(),
          Promise.resolve(getHistory(sessionId)),
        ]);

        addMessage(sessionId, { role: "user", content: message });
        const messages = [...history, { role: "user", content: message }];

        const provider = getProvider();
        let fullResponse = "";

        socket.emit("chat:start", { sessionId });

        await provider.stream(messages, context, (token) => {
          fullResponse += token;
          socket.emit("chat:token", { token, sessionId });
        });

        addMessage(sessionId, { role: "assistant", content: fullResponse });

        socket.emit("chat:end", {
          sessionId,
          fullResponse,
          provider: provider.getName(),
        });
      } catch (err) {
        logger.error("[AI Chat Socket] Error:", err.message);
        socket.emit("chat:end", {
          sessionId,
          fullResponse: `⚠️ AI service error: ${err.message}`,
          provider: "Error",
        });
      }
    });

    socket.on("disconnect", () => {
      logger.info(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Start background monitoring of consumer status
  setInterval(async () => {
    if (consumerConnected && Date.now() - lastConsumerHeartbeat > 12000) {
      consumerConnected = false;
      io.emit("consumer-status", "Disconnected");
      logger.warn("🚨 Kafka Consumer status: DISCONNECTED");

      try {
        const disconnectAlert = await Alert.create({
          type: "danger",
          source: "system",
          message: "Kafka consumer disconnected: Streaming pipeline offline.",
          time: new Date(),
        });
        io.emit("new-alert", disconnectAlert);
      } catch (err) {
        logger.error("Failed to log consumer disconnect alert:", err.message);
      }
    }
  }, 5000);

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

/** Returns whether the Kafka consumer is currently connected */
const isConsumerConnected = () => consumerConnected;

module.exports = { initSocket, getIO, isConsumerConnected };