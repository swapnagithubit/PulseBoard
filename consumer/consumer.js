const { Kafka } = require("kafkajs");
const dotenv = require("dotenv");
const { io } = require("socket.io-client");
const connectDB = require("./config/db");
const Analytics = require("./models/Analytics");
const Event = require("./models/Event");
const Alert = require("./models/Alert");

dotenv.config();

connectDB();

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("✅ Connected to backend socket");
  // Immediately register presence
  socket.emit("consumer-heartbeat");
});

socket.on("connect_error", (err) => {
  console.log("⚠️ Socket connection error:", err.message);
});

// Send heartbeat every 5 seconds to let the server know consumer is active
setInterval(() => {
  if (socket.connected) {
    socket.emit("consumer-heartbeat");
  }
}, 5000);

const kafka = new Kafka({
  clientId: "pulseboard-consumer",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({
  groupId: "analytics-group-2",
});

async function checkAlertRules(event) {
  try {
    // Rule 1: Large Purchase Alert (Purchase amount > 4000)
    if (event.eventType === "purchase" && event.amount > 4000) {
      const alert = await Alert.create({
        type: "warning",
        message: `High value purchase of $${event.amount} by user ${event.userId.slice(0, 8)}...`,
        time: new Date(),
      });
      socket.emit("new-alert", alert);
      console.log("🚨 Alert Triggered: High Value Purchase");
    }

    // Rule 2: Purchase Spike (More than 15 purchases in the last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const purchaseCount = await Event.countDocuments({
      eventType: "purchase",
      timestamp: { $gte: oneMinuteAgo },
    });

    if (purchaseCount > 15) {
      // Throttle alerts: check if we triggered this alert in the last 30 seconds
      const recentSpikeAlert = await Alert.findOne({
        message: /Purchase spike detected/,
        time: { $gte: new Date(Date.now() - 30 * 1000) },
      });

      if (!recentSpikeAlert) {
        const alert = await Alert.create({
          type: "danger",
          message: `Purchase spike detected: ${purchaseCount} purchases in the last 60 seconds!`,
          time: new Date(),
        });
        socket.emit("new-alert", alert);
        console.log("🚨 Alert Triggered: Purchase Spike");
      }
    }

    // Rule 3: Revenue Drop (Low revenue in last 3 minutes despite high user events activity)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const recentEvents = await Event.countDocuments({
      timestamp: { $gte: threeMinutesAgo },
    });

    if (recentEvents > 30) {
      const recentPurchases = await Event.find({
        eventType: "purchase",
        timestamp: { $gte: threeMinutesAgo },
      });
      const recentRevenue = recentPurchases.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Trigger if total revenue in last 3 minutes falls below $1,500 despite high activity
      if (recentRevenue < 1500) {
        const recentDropAlert = await Alert.findOne({
          message: /Significant revenue drop/,
          time: { $gte: new Date(Date.now() - 60 * 1000) },
        });

        if (!recentDropAlert) {
          const alert = await Alert.create({
            type: "danger",
            message: `Significant revenue drop: Only $${recentRevenue} generated in the last 3 minutes despite ${recentEvents} user events.`,
            time: new Date(),
          });
          socket.emit("new-alert", alert);
          console.log("🚨 Alert Triggered: Revenue Drop");
        }
      }
    }
  } catch (error) {
    console.error("❌ Error checking alert rules:", error.message);
  }
}

async function updateAnalytics(event) {
  try {
    // 1. Save raw event to Event collection
    const savedEvent = await Event.create({
      userId: event.userId,
      eventType: event.eventType,
      page: event.page,
      device: event.device,
      country: event.country,
      amount: event.amount || 0,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    });

    // Send new raw event to backend socket (for live dashboard event ticker)
    socket.emit("new-event", savedEvent);

    // 2. Update Aggregates
    let analytics = await Analytics.findOne();
    if (!analytics) {
      analytics = await Analytics.create({});
    }

    if (event.eventType === "click") {
      analytics.totalClicks += 1;
    } else if (event.eventType === "signup") {
      analytics.totalSignups += 1;
    } else if (event.eventType === "purchase") {
      analytics.totalPurchases += 1;
      analytics.totalRevenue += event.amount || 0;
    }

    analytics.updatedAt = new Date();
    await analytics.save();

    // 3. Emit live aggregated update to backend socket
    socket.emit("analytics-update", {
      totalClicks: analytics.totalClicks,
      totalSignups: analytics.totalSignups,
      totalPurchases: analytics.totalPurchases,
      totalRevenue: analytics.totalRevenue,
      updatedAt: analytics.updatedAt,
    });

    console.log("Analytics Updated:", {
      clicks: analytics.totalClicks,
      signups: analytics.totalSignups,
      purchases: analytics.totalPurchases,
      revenue: analytics.totalRevenue,
    });

    // 4. Run Alert Threshold Evaluator
    await checkAlertRules(savedEvent);
  } catch (error) {
    console.error("❌ Error updating analytics:", error.message);
  }
}

async function runConsumer() {
  console.log("Connecting Consumer...");
  await consumer.connect();
  console.log("Consumer Connected!");

  await consumer.subscribe({
    topic: "website-events",
    fromBeginning: true,
  });
  console.log("Subscribed to website-events");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log("Received Event:", event);
        await updateAnalytics(event);
      } catch (err) {
        console.error("❌ Error parsing or updating message:", err.message);
      }
    },
  });
}

runConsumer().catch(console.error);