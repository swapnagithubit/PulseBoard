const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const alertRoutes = require("./routes/alertRoutes");
const { initSocket } = require("./socket");
const { seedUsers } = require("./controllers/authController");
const { seedAnalyticsData } = require("./controllers/analyticsController");
const { initKafkaProducer } = require("./config/kafka");
const Event = require("./models/Event");

dotenv.config();

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const startServer = async () => {
  try {
    await connectDB();
    await seedUsers();
    
    // Auto-seed database if it's empty
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      console.log("🗄️ Database empty, auto-seeding mock historical events...");
      await seedAnalyticsData();
    }

    // Try to connect backend Kafka producer
    await initKafkaProducer();

    const requestedPort = Number(process.env.PORT || 5000);
    const tryListen = (port, attempt = 1) => {
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && attempt < 10) {
          const nextPort = port + 1;
          console.warn(`⚠️ Port ${port} is already in use. Trying ${nextPort}...`);
          tryListen(nextPort, attempt + 1);
          return;
        }

        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
      });

      server.listen(port, () => console.log(`✅ Server running on port ${port}`));
    };

    tryListen(requestedPort);
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();