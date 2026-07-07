/**
 * @module analyticsContext
 * @description RAG (Retrieval-Augmented Generation) context fetcher.
 * Pulls live analytics data from MongoDB and formats it as structured context
 * for the LLM provider, grounding responses in real data instead of hallucinations.
 */

const Event = require("../models/Event");
const Analytics = require("../models/Analytics");
const Alert = require("../models/Alert");
const logger = require("../config/logger");

/**
 * @typedef {Object} AnalyticsContext
 * @property {Object} kpis - Core KPIs (revenue, purchases, clicks, signups)
 * @property {Object[]} revenueTrend - Last 24h revenue by hour
 * @property {Object[]} topCountries - Top 5 countries by event count
 * @property {Object[]} topPages - Top 5 pages by event count
 * @property {Object[]} eventTypes - Distribution of event types
 * @property {Object[]} recentAlerts - Last 5 alerts
 * @property {Object} deviceSplit - Desktop vs mobile split
 * @property {string} formattedSummary - Human-readable summary string
 */

/**
 * Fetches full analytics context from MongoDB.
 * @returns {Promise<AnalyticsContext>}
 */
const fetchAnalyticsContext = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [analyticsDoc, topCountries, topPages, eventTypes, recentAlerts, deviceSplit, revenueTrend, hourlyEvents, purchaseStats] = await Promise.all([
      Analytics.findOne().lean(),
      Event.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Event.aggregate([
        { $group: { _id: "$page", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Event.aggregate([
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Alert.find().sort({ time: -1 }).limit(5).lean(),
      Event.aggregate([
        { $group: { _id: "$device", count: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { eventType: "purchase", timestamp: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%H:00", date: "$timestamp" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Event.countDocuments({ timestamp: { $gte: oneHourAgo } }),
      Event.aggregate([
        { $match: { eventType: "purchase" } },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: "$amount" },
            maxAmount: { $max: "$amount" },
            totalCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const kpis = {
      totalRevenue: analyticsDoc?.totalRevenue || 0,
      totalPurchases: analyticsDoc?.totalPurchases || 0,
      totalClicks: analyticsDoc?.totalClicks || 0,
      totalSignups: analyticsDoc?.totalSignups || 0,
      eventsLastHour: hourlyEvents,
      avgPurchaseValue: purchaseStats[0]?.avgAmount?.toFixed(2) || 0,
      maxPurchaseValue: purchaseStats[0]?.maxAmount || 0,
    };

    const desktop = deviceSplit.find((d) => d._id === "desktop")?.count || 0;
    const mobile = deviceSplit.find((d) => d._id === "mobile")?.count || 0;
    const total = desktop + mobile || 1;

    const deviceInfo = {
      desktop: desktop,
      mobile: mobile,
      desktopPct: Math.round((desktop / total) * 100),
      mobilePct: Math.round((mobile / total) * 100),
    };

    // Format a human-readable summary for the LLM
    const formattedSummary = `
LIVE ANALYTICS CONTEXT (as of ${new Date().toISOString()}):

KPIs:
- Total Revenue: $${kpis.totalRevenue.toLocaleString()}
- Total Purchases: ${kpis.totalPurchases}
- Total Clicks: ${kpis.totalClicks}
- Total Signups: ${kpis.totalSignups}
- Events in last hour: ${kpis.eventsLastHour}
- Avg Purchase Value: $${kpis.avgPurchaseValue}
- Max Purchase Value: $${kpis.maxPurchaseValue}

Device Split:
- Desktop: ${deviceInfo.desktopPct}% (${deviceInfo.desktop} events)
- Mobile: ${deviceInfo.mobilePct}% (${deviceInfo.mobile} events)

Top Countries by Events:
${topCountries.map((c, i) => `  ${i + 1}. ${c._id}: ${c.count} events`).join("\n")}

Top Pages by Traffic:
${topPages.map((p, i) => `  ${i + 1}. ${p._id}: ${p.count} events`).join("\n")}

Event Type Distribution:
${eventTypes.map((e) => `  - ${e._id}: ${e.count}`).join("\n")}

Revenue Trend (last 24h by hour):
${revenueTrend.map((r) => `  ${r._id}: $${r.revenue} (${r.count} purchases)`).join("\n") || "  No purchase data in the last 24 hours."}

Recent Alerts:
${recentAlerts.map((a) => `  [${a.type.toUpperCase()}] ${a.message}`).join("\n") || "  No recent alerts."}
`.trim();

    return {
      kpis,
      revenueTrend,
      topCountries: topCountries.map((c) => ({ country: c._id, count: c.count })),
      topPages: topPages.map((p) => ({ page: p._id, count: p.count })),
      eventTypes: eventTypes.map((e) => ({ type: e._id, count: e.count })),
      recentAlerts,
      deviceSplit: deviceInfo,
      formattedSummary,
    };
  } catch (err) {
    logger.error("[AnalyticsContext] Failed to fetch context:", err.message);
    return {
      kpis: {},
      topCountries: [],
      topPages: [],
      eventTypes: [],
      recentAlerts: [],
      deviceSplit: {},
      revenueTrend: [],
      formattedSummary: "Analytics data temporarily unavailable.",
    };
  }
};

module.exports = { fetchAnalyticsContext };
