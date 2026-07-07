/**
 * @module aiController
 * @description AI Analytics Copilot controller.
 * Handles chat (via Socket.io), insights generation, and report generation.
 *
 * Routes:
 *   POST /api/ai/chat    — Initiates a chat (response comes via Socket.io)
 *   GET  /api/ai/insights — Auto-generated dashboard insights
 *   POST /api/ai/report  — Full analytics report generation
 *   GET  /api/ai/status  — Current LLM provider status
 */

const { getProvider, getProviderStatus } = require("../services/llm");
const { fetchAnalyticsContext } = require("../services/analyticsContext");
const { getHistory, addMessage } = require("../services/chatMemory");
const { predict } = require("../services/predictiveAnalytics");
const logger = require("../config/logger");

/**
 * POST /api/ai/chat
 * Accepts a user message and streams the AI response via Socket.io.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    // Acknowledge immediately — response comes via Socket.io
    res.json({ success: true, message: "Processing your question..." });

    // Run AI response asynchronously (non-blocking)
    _streamChatResponse(message.trim(), sessionId).catch((err) => {
      logger.error("[AI Chat] Stream error:", err.message);
    });
  } catch (err) {
    logger.error("[AI Chat] Handler error:", err.message);
    res.status(500).json({ success: false, message: "AI service temporarily unavailable" });
  }
};

/**
 * Fetches context, builds messages, and streams response via Socket.io.
 * @param {string} message
 * @param {string} sessionId
 */
const _streamChatResponse = async (message, sessionId) => {
  const { getIO } = require("../socket");
  const io = getIO();
  const socket = _findSocket(io, sessionId);

  const emit = (event, data) => {
    if (socket) socket.emit(event, data);
    else io.emit(event, data); // broadcast fallback
  };

  emit("chat:start", { sessionId });

  try {
    const [context, history] = await Promise.all([
      fetchAnalyticsContext(),
      Promise.resolve(getHistory(sessionId)),
    ]);

    // Add user message to history
    addMessage(sessionId, { role: "user", content: message });

    // Build messages array for LLM
    const messages = [...history, { role: "user", content: message }];

    const provider = getProvider();
    let fullResponse = "";

    await provider.stream(messages, context, (token) => {
      fullResponse += token;
      emit("chat:token", { token, sessionId });
    });

    // Store assistant response in memory
    addMessage(sessionId, { role: "assistant", content: fullResponse });

    emit("chat:end", {
      sessionId,
      fullResponse,
      provider: provider.getName(),
    });

    logger.info(`[AI Chat] Session ${sessionId.slice(0, 8)}... — ${message.slice(0, 50)}`);
  } catch (err) {
    logger.error("[AI Chat] Stream failed:", err.message);
    emit("chat:end", {
      sessionId,
      fullResponse: `⚠️ AI service error: ${err.message}. Please try again.`,
      provider: "Error",
    });
  }
};

/**
 * GET /api/ai/insights
 * Returns automatically generated dashboard insights based on live data.
 */
const getInsights = async (req, res) => {
  try {
    const context = await fetchAnalyticsContext();
    const { kpis, topCountries, topPages, deviceSplit, recentAlerts, revenueTrend } = context;

    const insights = [];

    // Revenue insight
    if (kpis.totalRevenue > 0) {
      const recentRevs = revenueTrend.slice(-6).map((r) => r.revenue || 0);
      const prediction = predict(recentRevs, "ewma");
      const avgRevenue = revenueTrend.length > 0
        ? revenueTrend.reduce((a, r) => a + r.revenue, 0) / revenueTrend.length
        : 0;
      const latestRevenue = recentRevs[recentRevs.length - 1] || 0;
      const pct = avgRevenue > 0 ? Math.round(((latestRevenue - avgRevenue) / avgRevenue) * 100) : 0;

      insights.push({
        id: "revenue",
        icon: "💰",
        title: "Revenue Trend",
        description: pct >= 0
          ? `Revenue is ${pct}% above your recent average. Momentum is ${prediction.algorithm === "EWMA" ? "tracking upward" : "stable"}.`
          : `Revenue is ${Math.abs(pct)}% below your recent average. Consider reviewing recent conversion paths.`,
        type: pct >= 0 ? "positive" : "warning",
        metric: `$${kpis.totalRevenue?.toLocaleString()}`,
        badge: pct >= 0 ? `+${pct}%` : `${pct}%`,
      });
    }

    // Top country insight
    if (topCountries.length > 0) {
      const top = topCountries[0];
      insights.push({
        id: "country",
        icon: "🌍",
        title: "Top Market",
        description: `${top.country} is driving your highest traffic volume with ${top.count} events. ${topCountries.length > 1 ? `Second is ${topCountries[1].country} with ${topCountries[1].count}.` : ""}`,
        type: "info",
        metric: top.country,
        badge: `${top.count} events`,
      });
    }

    // Conversion insight
    if (kpis.totalClicks > 0 && kpis.totalPurchases >= 0) {
      const convRate = ((kpis.totalPurchases / kpis.totalClicks) * 100).toFixed(1);
      const isGood = parseFloat(convRate) >= 2.5;
      insights.push({
        id: "conversion",
        icon: "🎯",
        title: "Conversion Rate",
        description: isGood
          ? `${convRate}% conversion rate is above the industry benchmark of 2.5%. Keep optimizing your checkout flow.`
          : `${convRate}% conversion rate is below the 2.5% benchmark. Review cart abandonment and checkout UX.`,
        type: isGood ? "positive" : "warning",
        metric: `${convRate}%`,
        badge: isGood ? "Above benchmark" : "Below benchmark",
      });
    }

    // Device insight
    if (deviceSplit.mobilePct > 0) {
      insights.push({
        id: "device",
        icon: deviceSplit.mobilePct > 50 ? "📱" : "🖥️",
        title: "Device Mix",
        description: `${deviceSplit.mobilePct}% mobile / ${deviceSplit.desktopPct}% desktop. ${deviceSplit.mobilePct > 60 ? "Mobile-first optimization is critical for your audience." : "Balanced device mix — optimize both experiences."}`,
        type: "info",
        metric: `${deviceSplit.mobilePct}% mobile`,
        badge: deviceSplit.mobilePct > 50 ? "Mobile-dominant" : "Desktop-dominant",
      });
    }

    // AI anomaly insight
    const aiAlerts = recentAlerts.filter((a) => a.source === "ai");
    if (aiAlerts.length > 0) {
      insights.push({
        id: "anomaly",
        icon: "🧠",
        title: "AI Anomaly Detected",
        description: aiAlerts[0].message,
        type: "danger",
        metric: `${aiAlerts.length} alert${aiAlerts.length > 1 ? "s" : ""}`,
        badge: "AI Detected",
      });
    }

    // Recommendation
    const topPage = topPages[0];
    if (topPage) {
      insights.push({
        id: "recommendation",
        icon: "💡",
        title: "Top Recommendation",
        description: topPage.page?.includes("checkout")
          ? `Checkout is your top page — minimize friction and ensure fast load to maximize conversions.`
          : `Optimize ${topPage.page} (your most visited page) with clear CTAs and fast load times.`,
        type: "tip",
        metric: topPage.page,
        badge: `${topPage.count} visits`,
      });
    }

    res.json({ success: true, insights, generatedAt: new Date().toISOString(), provider: getProvider().getName() });
  } catch (err) {
    logger.error("[AI Insights] Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to generate insights" });
  }
};

/**
 * POST /api/ai/report
 * Generates a full analytics report as markdown text.
 */
const generateReport = async (req, res) => {
  try {
    const context = await fetchAnalyticsContext();
    const { kpis, topCountries, topPages, deviceSplit, revenueTrend, recentAlerts } = context;

    const avgOrder = kpis.totalPurchases > 0 ? (kpis.totalRevenue / kpis.totalPurchases).toFixed(2) : 0;
    const convRate = kpis.totalClicks > 0 ? ((kpis.totalPurchases / kpis.totalClicks) * 100).toFixed(1) : 0;
    const recentRevs = revenueTrend.slice(-6).map((r) => r.revenue || 0);
    const prediction = predict(recentRevs, "ewma");

    const report = `# PulseBoard Analytics Report
Generated: ${new Date().toLocaleString()}

## Executive Summary
Your platform recorded **$${kpis.totalRevenue?.toLocaleString() || 0}** in total revenue across **${kpis.totalPurchases || 0} purchases** with an average order value of **$${avgOrder}**.

## Key Performance Indicators
| Metric | Value |
|---|---|
| Total Revenue | $${kpis.totalRevenue?.toLocaleString() || 0} |
| Total Purchases | ${kpis.totalPurchases || 0} |
| Total Clicks | ${kpis.totalClicks?.toLocaleString() || 0} |
| Total Signups | ${kpis.totalSignups?.toLocaleString() || 0} |
| Avg Order Value | $${avgOrder} |
| Conversion Rate | ${convRate}% |
| Events Last Hour | ${kpis.eventsLastHour || 0} |

## Geographic Performance
${topCountries.map((c, i) => `${i + 1}. **${c.country}**: ${c.count} events`).join("\n")}

## Top Pages
${topPages.map((p, i) => `${i + 1}. \`${p.page}\`: ${p.count} visits`).join("\n")}

## Device Distribution
- Desktop: ${deviceSplit.desktopPct || 0}% (${deviceSplit.desktop || 0} events)
- Mobile: ${deviceSplit.mobilePct || 0}% (${deviceSplit.mobile || 0} events)

## Predictive Forecast
- **Algorithm**: ${prediction.algorithm}
- **Predicted next period revenue**: $${prediction.predicted.toLocaleString()}
- **Confidence**: ${prediction.confidence}%
- **Reason**: ${prediction.reason}

## Recent Alerts
${recentAlerts.length > 0 ? recentAlerts.map((a) => `- [${a.type.toUpperCase()}] ${a.message}`).join("\n") : "No recent alerts."}

## AI Recommendations
1. ${topCountries[0]?.country ? `Double down on ${topCountries[0].country} — your top traffic source.` : "Build targeted geographic campaigns."}
2. ${parseFloat(convRate) < 2.5 ? `Improve conversion rate (${convRate}% is below 2.5% benchmark) — simplify checkout.` : "Maintain strong conversion rate with A/B testing."}
3. ${deviceSplit.mobilePct > 50 ? `Optimize mobile experience — ${deviceSplit.mobilePct}% of traffic is mobile.` : "Enhance desktop experience for your power users."}
4. Set up event rules to get notified of high-value purchases and traffic spikes.
5. Schedule promotions during your peak revenue hours for maximum impact.

---
*Report generated by PulseBoard AI Analytics Engine*
`;

    res.json({ success: true, report, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error("[AI Report] Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
};

/**
 * GET /api/ai/status
 * Returns current provider status and availability.
 */
const getStatus = (req, res) => {
  const providers = getProviderStatus();
  const active = getProvider().getName();
  res.json({ success: true, activeProvider: active, providers });
};

/**
 * Finds a Socket.io socket by sessionId.
 * @param {import('socket.io').Server} io
 * @param {string} sessionId
 * @returns {import('socket.io').Socket|null}
 */
const _findSocket = (io, sessionId) => {
  const socket = io.sockets.sockets.get(sessionId);
  return socket || null;
};

module.exports = { handleChat, getInsights, generateReport, getStatus };
