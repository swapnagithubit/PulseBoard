const Analytics = require("../models/Analytics");
const Event = require("../models/Event");
const Alert = require("../models/Alert");
const { predict } = require("../services/predictiveAnalytics");
const rulesEngine = require("../services/rulesEngine");
const logger = require("../config/logger");

const getAnalytics = async (req, res) => {
  try {
    // 🔍 DEBUG: Log event count and sample
    const totalEventCount = await Event.countDocuments();
    const sampleEvent = await Event.findOne().lean();
    console.log(`📊 Total events in DB: ${totalEventCount}`);
    console.log(`📋 Sample event:`, sampleEvent);

    // Build date filters if provided
    let matchFilter = {};
    if (req.query.startDate || req.query.endDate) {
      matchFilter.timestamp = {};
      if (req.query.startDate) {
        matchFilter.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        matchFilter.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // 1. Core KPIs
    const analyticsAgg = await Analytics.findOne();
    const kpis = {
      totalClicks: analyticsAgg ? analyticsAgg.totalClicks : 0,
      totalSignups: analyticsAgg ? analyticsAgg.totalSignups : 0,
      totalPurchases: analyticsAgg ? analyticsAgg.totalPurchases : 0,
      totalRevenue: analyticsAgg ? analyticsAgg.totalRevenue : 0,
    };

    // Calculate Active Users
    const activeUsersResult = await Event.distinct("userId", matchFilter);
    kpis.activeUsers = activeUsersResult.length;

    // Calculate Events Per Minute (Count of events in last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    kpis.eventsPerMinute = await Event.countDocuments({
      timestamp: { $gte: oneMinuteAgo },
    });

    // 2. Charts Calculations - Use full dataset for better visualization

    // Events Trend - Last 24 hours grouped by minute (to ensure we have data)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eventsTrend = await Event.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%H:%M", date: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 100 },
    ]);

    console.log(`📈 Events trend - Total matched: ${await Event.countDocuments({ timestamp: { $gte: oneDayAgo } })}, Groups: ${eventsTrend.length}`);
    if (eventsTrend.length > 0) console.log(`   First few:`, eventsTrend.slice(0, 3));

    // Revenue Trend - Last 24 hours grouped by minute
    const revenueTrend = await Event.aggregate([
      {
        $match: {
          eventType: "purchase",
          timestamp: { $gte: oneDayAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%H:%M", date: "$timestamp" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 100 },
    ]);

    console.log(`💰 Revenue trend - Purchase count: ${await Event.countDocuments({ eventType: "purchase" })}, Groups: ${revenueTrend.length}`);
    if (revenueTrend.length > 0) console.log(`   First few:`, revenueTrend.slice(0, 3));

    // Device Distribution - All events
    const deviceDist = await Event.aggregate([
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`📱 Device dist:`, deviceDist);

    // Country Distribution - Top 5
    const countryDist = await Event.aggregate([
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    console.log(`🌍 Country dist:`, countryDist);

    // Page Distribution - Top 5
    const pageDist = await Event.aggregate([
      { $group: { _id: "$page", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    console.log(`📄 Page dist:`, pageDist);

    // Event Type Distribution
    const eventTypeDist = await Event.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`🎯 Event type dist:`, eventTypeDist);

    // Compute predictions
    const algo = req.query.algo || "ewma";
    const eventCounts = eventsTrend.map((t) => t.count);
    const revenueValues = revenueTrend.map((r) => r.revenue);
    const eventsPrediction = predict(eventCounts, algo);
    const revenuePrediction = predict(revenueValues, algo);

    // Compute Health Score (0-100)
    const trafficScore = Math.min(100, ((kpis.eventsPerMinute || 0) / 5) * 100);
    const revenueScore = Math.min(100, ((kpis.totalRevenue || 0) / 10000) * 100);
    const conversionRate = kpis.totalClicks > 0 ? (kpis.totalPurchases / kpis.totalClicks) * 100 : 0;
    const conversionScore = Math.min(100, (conversionRate / 5) * 100);
    const engagementScore = Math.min(100, eventCounts.length * 5);
    const healthScore = Math.round(
      0.25 * trafficScore + 0.30 * revenueScore + 0.25 * conversionScore + 0.20 * engagementScore
    );

    res.json({
      kpis,
      eventsTrend: eventsTrend.map((t) => ({ time: t._id, count: t.count })),
      revenueTrend: revenueTrend.map((r) => ({ time: r._id, revenue: r.revenue })),
      deviceDistribution: deviceDist.map((d) => ({ name: d._id, value: d.count })),
      countryDistribution: countryDist.map((c) => ({ country: c._id, count: c.count })),
      pageDistribution: pageDist.map((p) => ({ page: p._id, count: p.count })),
      eventTypeDistribution: eventTypeDist.map((e) => ({ name: e._id, value: e.count })),
      predictions: {
        events: eventsPrediction,
        revenue: revenuePrediction,
        algo,
      },
      healthScore,
    });
  } catch (error) {
    logger.error("Analytics Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const getRawEvents = async (req, res) => {
  try {
    let query = {};

    // Search query matches userId, page, or country
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { userId: searchRegex },
        { page: searchRegex },
        { country: searchRegex },
      ];
    }

    // Dropdown filters
    if (req.query.eventType) {
      query.eventType = req.query.eventType;
    }
    if (req.query.device) {
      query.device = req.query.device;
    }
    if (req.query.country) {
      query.country = req.query.country;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || "timestamp";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const events = await Event.find(query).sort(sort).skip(skip).limit(limit);
    const total = await Event.countDocuments(query);

    res.json({
      events,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetAnalytics = async (req, res) => {
  try {
    await Analytics.findOneAndUpdate(
      {},
      {
        totalClicks: 0,
        totalSignups: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        updatedAt: new Date(),
      },
      { upsert: true }
    );
    await Event.deleteMany({});
    await Alert.deleteMany({});
    res.json({ message: "Analytics databases reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const seedAnalyticsData = async (req, res) => {
  try {
    if (req && req.user && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Only administrators can seed data" });
    }

    await Event.deleteMany({});
    await Analytics.deleteMany({});
    await Alert.deleteMany({});

    const events = [];
    const eventTypes = ["click", "signup", "purchase", "add_to_cart"];
    const pages = ["/", "/products", "/cart", "/checkout", "/profile"];
    const countries = [
      { code: "US", name: "United States" },
      { code: "GB", name: "United Kingdom" },
      { code: "DE", name: "Germany" },
      { code: "CA", name: "Canada" },
      { code: "IN", name: "India" },
      { code: "FR", name: "France" },
      { code: "AU", name: "Australia" },
      { code: "JP", name: "Japan" },
      { code: "BR", name: "Brazil" }
    ];
    const devices = ["desktop", "mobile"];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    let clickCount = 0;
    let signupCount = 0;
    let purchaseCount = 0;
    let totalRevenue = 0;

    for (let i = 0; i < 200; i++) {
      const timestamp = new Date(now - Math.random() * oneDay);
      const rand = Math.random();
      let eventType = "click";
      if (rand > 0.90) {
        eventType = "purchase";
      } else if (rand > 0.75) {
        eventType = "signup";
      } else if (rand > 0.50) {
        eventType = "add_to_cart";
      }

      let page = "/";
      if (eventType === "purchase") {
        page = "/checkout";
      } else if (eventType === "add_to_cart") {
        page = Math.random() > 0.5 ? "/cart" : "/products";
      } else if (eventType === "signup") {
        page = "/profile";
      } else {
        page = pages[Math.floor(Math.random() * pages.length)];
      }

      const countryObj = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const userId = "usr_" + Math.random().toString(36).substring(2, 10);
      
      let amount = 0;
      if (eventType === "purchase") {
        amount = Math.floor(Math.random() * 800) + 50;
        purchaseCount++;
        totalRevenue += amount;
      } else if (eventType === "click") {
        clickCount++;
      } else if (eventType === "signup") {
        signupCount++;
      }

      events.push({
        userId,
        eventType,
        page,
        device,
        country: countryObj.name,
        amount,
        timestamp
      });
    }

    await Event.insertMany(events);

    await Analytics.create({
      totalClicks: clickCount,
      totalSignups: signupCount,
      totalPurchases: purchaseCount,
      totalRevenue: totalRevenue,
      updatedAt: new Date()
    });

    await Alert.create([
      {
        type: "warning",
        message: `High value purchase of $850 by user ${events[0].userId.slice(0, 8)}...`,
        time: new Date(now - 2 * 60 * 60 * 1000)
      },
      {
        type: "danger",
        message: "Purchase spike detected: 18 purchases in the last 60 seconds!",
        time: new Date(now - 10 * 60 * 1000)
      }
    ]);

    console.log(`✅ Database successfully seeded with 200 events. Clicks: ${clickCount}, Signups: ${signupCount}, Purchases: ${purchaseCount}, Revenue: $${totalRevenue}`);

    if (res) {
      return res.status(200).json({
        message: "Database seeded successfully",
        eventsCount: 200,
        kpis: {
          totalClicks: clickCount,
          totalSignups: signupCount,
          totalPurchases: purchaseCount,
          totalRevenue: totalRevenue
        }
      });
    }
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
    if (res) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const collectEvent = async (req, res) => {
  try {
    const { eventType, page, amount, userId, country, device } = req.body;

    if (!eventType) {
      return res.status(400).json({ message: "eventType is required" });
    }

    const finalUserId = userId || "usr_anon_" + Math.random().toString(36).substring(2, 10);
    const finalPage = page || "/";
    const finalAmount = Number(amount) || 0;

    const userAgent = req.headers["user-agent"] || "";
    const finalDevice = device || (/mobile|android|iphone|ipad|phone/i.test(userAgent) ? "mobile" : "desktop");

    let finalCountry = country;
    if (!finalCountry || finalCountry === "Detected") {
      const lang = req.headers["accept-language"] || "";
      if (lang.includes("en-US")) finalCountry = "United States";
      else if (lang.includes("en-GB")) finalCountry = "United Kingdom";
      else if (lang.includes("de")) finalCountry = "Germany";
      else if (lang.includes("fr")) finalCountry = "France";
      else if (lang.includes("in") || lang.includes("hi")) finalCountry = "India";
      else if (lang.includes("ca")) finalCountry = "Canada";
      else if (lang.includes("jp") || lang.includes("ja")) finalCountry = "Japan";
      else {
        const fallbackCountries = ["United States", "United Kingdom", "Germany", "Canada", "India", "France"];
        finalCountry = fallbackCountries[Math.floor(Math.random() * fallbackCountries.length)];
      }
    }

    const eventData = {
      userId: finalUserId,
      eventType,
      page: finalPage,
      device: finalDevice,
      country: finalCountry,
      amount: finalAmount,
      timestamp: new Date().toISOString()
    };

    const { getProducer } = require("../config/kafka");
    const producer = getProducer();
    if (producer) {
      try {
        await producer.send({
          topic: "website-events",
          messages: [{ value: JSON.stringify(eventData) }],
        });
        console.log("📨 External event sent to Kafka topic:", eventData);
        return res.status(200).json({ success: true, via: "kafka", event: eventData });
      } catch (err) {
        console.error("❌ Kafka publishing failed, processing directly:", err.message);
      }
    }

    const savedEvent = await Event.create(eventData);

    const { getIO } = require("../socket");
    const io = getIO();
    io.emit("new-event", savedEvent);

    let analytics = await Analytics.findOne();
    if (!analytics) {
      analytics = await Analytics.create({});
    }

    if (eventType === "click") {
      analytics.totalClicks += 1;
    } else if (eventType === "signup") {
      analytics.totalSignups += 1;
    } else if (eventType === "purchase") {
      analytics.totalPurchases += 1;
      analytics.totalRevenue += finalAmount;
    }
    analytics.updatedAt = new Date();
    await analytics.save();

    io.emit("analytics-update", {
      totalClicks: analytics.totalClicks,
      totalSignups: analytics.totalSignups,
      totalPurchases: analytics.totalPurchases,
      totalRevenue: analytics.totalRevenue,
      updatedAt: analytics.updatedAt
    });

    // Hook dynamic rule engine first
    await rulesEngine.evaluateEvent(savedEvent, io);
    
    // Then run legacy hardcoded local alerts
    await checkLocalAlertRules(savedEvent, io);

    console.log("📝 Ingested event processed directly (fallback):", savedEvent);
    res.status(200).json({ success: true, via: "direct", event: savedEvent });
  } catch (error) {
    console.error("❌ Collection Ingestion Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const checkLocalAlertRules = async (event, io) => {
  try {
    if (event.eventType === "purchase" && event.amount > 4000) {
      const alert = await Alert.create({
        type: "warning",
        message: `High value purchase of $${event.amount} by user ${event.userId.slice(0, 8)}...`,
        time: new Date(),
      });
      io.emit("new-alert", alert);
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const purchaseCount = await Event.countDocuments({
      eventType: "purchase",
      timestamp: { $gte: oneMinuteAgo },
    });

    if (purchaseCount > 15) {
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
        io.emit("new-alert", alert);
      }
    }
  } catch (err) {
    console.error("❌ Local alert checks failed:", err.message);
  }
};

/**
 * GET /api/analytics/timeline
 * Returns a chronological paginated feed of events for the Event Timeline page.
 */
const getEventTimeline = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const eventType = req.query.eventType || null;
    const query = eventType ? { eventType } : {};

    const [events, total] = await Promise.all([
      Event.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(query),
    ]);

    res.json({
      events,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("Timeline Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/analytics/sessions
 * Returns a list of all user sessions grouped by userId with summary metrics.
 */
const getSessions = async (req, res) => {
  try {
    const sessions = await Event.aggregate([
      {
        $group: {
          _id: "$userId",
          eventCount: { $sum: 1 },
          startTime: { $min: "$timestamp" },
          endTime: { $max: "$timestamp" },
          country: { $first: "$country" },
          device: { $first: "$device" },
          pagesVisited: { $addToSet: "$page" },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $project: {
          userId: "$_id",
          _id: 0,
          eventCount: 1,
          startTime: 1,
          endTime: 1,
          durationMs: { $subtract: ["$endTime", "$startTime"] },
          country: 1,
          device: 1,
          pagesVisited: 1,
          totalAmount: 1
        }
      },
      { $sort: { endTime: -1 } },
      { $limit: 100 } // Limit to last 100 sessions for performance
    ]);

    res.json(sessions);
  } catch (error) {
    logger.error("Session Aggregation Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/analytics/sessions/:userId
 * Returns a chronological list of events for a specific user to drive the Session Replay player.
 */
const getSessionDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.find({ userId }).sort({ timestamp: 1 }).lean();
    
    if (!events || events.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json(events);
  } catch (error) {
    logger.error("Session Detail Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAnalytics, getRawEvents, resetAnalytics, seedAnalyticsData, collectEvent, getEventTimeline, getSessions, getSessionDetails };