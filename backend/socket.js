const Alert = require("./models/Alert");

let io;
let lastConsumerHeartbeat = 0;
let consumerConnected = false;

const initSocket = (server) => {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: "*", // allow access from frontend ports
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Send the current consumer connection status to the newly connected UI client
    socket.emit("consumer-status", consumerConnected ? "Connected" : "Disconnected");

    // Listen to consumer heartbeat ping
    socket.on("consumer-heartbeat", () => {
      lastConsumerHeartbeat = Date.now();
      if (!consumerConnected) {
        consumerConnected = true;
        io.emit("consumer-status", "Connected");
        console.log("✅ Kafka Consumer status: CONNECTED");
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

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  // Start background monitoring of consumer status
  setInterval(async () => {
    // If we haven't received a heartbeat in > 12 seconds and it was marked as connected, raise disconnect alert
    if (consumerConnected && Date.now() - lastConsumerHeartbeat > 12000) {
      consumerConnected = false;
      io.emit("consumer-status", "Disconnected");
      console.log("🚨 Kafka Consumer status: DISCONNECTED");

      try {
        const disconnectAlert = await Alert.create({
          type: "danger",
          message: "Kafka consumer disconnected: Streaming pipeline offline.",
          time: new Date(),
        });
        io.emit("new-alert", disconnectAlert);
      } catch (err) {
        console.error("❌ Failed to log consumer disconnect alert:", err.message);
      }
    }
  }, 5000);

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIO };