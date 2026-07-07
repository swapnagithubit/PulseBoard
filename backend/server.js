const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const alertRoutes = require("./routes/alertRoutes");
const aiRoutes = require("./routes/aiRoutes");
const healthRoutes = require("./routes/healthRoutes");
const ruleRoutes = require("./routes/ruleRoutes");
const { initSocket } = require("./socket");
const { seedUsers } = require("./controllers/authController");
const { seedAnalyticsData } = require("./controllers/analyticsController");
const { initKafkaProducer } = require("./config/kafka");
const { startAnomalyDetector } = require("./services/anomalyDetector");
const { errorHandler } = require("./middleware/errorHandler");
const { getProvider } = require("./services/llm");
const logger = require("./config/logger");
const Event = require("./models/Event");

dotenv.config();

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/rules", ruleRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Global error handler (must be last middleware)
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    await seedUsers();

    // Auto-seed database if it's empty
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      logger.info("🗄️ Database empty, auto-seeding mock historical events...");
      await seedAnalyticsData();
    }

    // Initialize LLM provider (logs which one is active)
    const provider = getProvider();
    logger.info(`🤖 AI Provider: ${provider.getName()}`);

    // Try to connect backend Kafka producer
    await initKafkaProducer();

    // Start AI anomaly detection background service
    const { getIO } = require("./socket");
    startAnomalyDetector(getIO());

    const requestedPort = Number(process.env.PORT || 5000);
    const tryListen = (port, attempt = 1) => {
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && attempt < 10) {
          const nextPort = port + 1;
          logger.warn(`Port ${port} is in use. Trying ${nextPort}...`);
          tryListen(nextPort, attempt + 1);
          return;
        }
        logger.error("Failed to start server:", error.message);
        process.exit(1);
      });

      server.listen(port, () => logger.info(`✅ PulseBoard server running on port ${port}`));
    };

    tryListen(requestedPort);
  } catch (error) {
    logger.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();