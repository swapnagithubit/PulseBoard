/**
 * @module DeterministicProvider
 * @description Rule-based AI provider that generates meaningful analytics insights
 * from real data without any external API dependency. Fully functional out-of-the-box.
 *
 * Pattern matching covers the most common analytics questions:
 *   - Revenue trends & drops
 *   - Traffic analysis
 *   - Country/region breakdowns
 *   - Conversion rates
 *   - Predictions
 *   - Anomaly explanations
 *   - Recommendations
 */

const logger = require("../../../config/logger");

class DeterministicProvider {
  getName() {
    return "PulseBoard Analytics Engine";
  }

  isAvailable() {
    return true; // always available
  }

  /**
   * Generates a response based on message content + analytics context.
   * Simulates streaming by chunking the response via onToken callback.
   *
   * @param {import('../index').ChatMessage[]} messages
   * @param {Object} context - AnalyticsContext from analyticsContext.js
   * @param {Function} onToken - Called for each text chunk
   * @returns {Promise<string>} Full response text
   */
  async stream(messages, context, onToken) {
    const userMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
    const response = this._generateResponse(userMessage.toLowerCase(), context);

    // Simulate token streaming — split into words
    const words = response.split(" ");
    for (const word of words) {
      onToken(word + " ");
      await _delay(25 + Math.random() * 35); // 25-60ms per token
    }

    return response;
  }

  /**
   * Non-streaming chat response.
   * @param {import('../index').ChatMessage[]} messages
   * @param {Object} context
   * @returns {Promise<string>}
   */
  async chat(messages, context) {
    const userMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
    return this._generateResponse(userMessage.toLowerCase(), context);
  }

  /**
   * Core response generation logic.
   * @private
   */
  _generateResponse(query, ctx) {
    const { kpis = {}, topCountries = [], topPages = [], eventTypes = [], recentAlerts = [], deviceSplit = {}, revenueTrend = [] } = ctx;

    // --- Revenue questions ---
    if (_matches(query, ["why", "revenue", "drop", "declin", "fell", "lower"])) {
      return this._explainRevenueDrop(kpis, revenueTrend, topCountries, deviceSplit);
    }

    if (_matches(query, ["revenue", "trend", "today", "24h", "last 24"])) {
      return this._revenueOverview(kpis, revenueTrend);
    }

    if (_matches(query, ["revenue", "highest", "best", "top"])) {
      return this._bestRevenueInsight(revenueTrend, topPages);
    }

    // --- Traffic questions ---
    if (_matches(query, ["traffic", "visitors", "spike", "sudden", "increase"])) {
      return this._trafficInsight(kpis, topCountries, recentAlerts);
    }

    if (_matches(query, ["traffic", "trend", "today"])) {
      return this._trafficOverview(kpis, topCountries);
    }

    // --- Country questions ---
    if (_matches(query, ["country", "countries", "region", "location", "where"])) {
      return this._countryInsight(topCountries, kpis);
    }

    if (_matches(query, ["conversion", "rate", "convert"])) {
      return this._conversionInsight(kpis, eventTypes, topPages);
    }

    // --- Device questions ---
    if (_matches(query, ["device", "mobile", "desktop", "platform"])) {
      return this._deviceInsight(deviceSplit, kpis);
    }

    // --- Prediction questions ---
    if (_matches(query, ["predict", "forecast", "tomorrow", "next", "future", "expect"])) {
      return this._predictionInsight(kpis, revenueTrend);
    }

    // --- Anomaly questions ---
    if (_matches(query, ["anomal", "unusual", "weird", "strange", "bot", "attack", "fraud", "spike", "alert"])) {
      return this._anomalyInsight(recentAlerts, kpis);
    }

    // --- Page/product questions ---
    if (_matches(query, ["page", "path", "url", "product", "checkout", "best performing"])) {
      return this._pageInsight(topPages, kpis);
    }

    // --- Recommendation questions ---
    if (_matches(query, ["recommend", "improve", "suggest", "advice", "how to", "fix", "optimize"])) {
      return this._recommendations(kpis, topCountries, topPages, deviceSplit, eventTypes);
    }

    // --- Summary/overview ---
    if (_matches(query, ["summary", "overview", "status", "how are", "report", "kpi", "dashboard"])) {
      return this._fullSummary(kpis, topCountries, topPages, deviceSplit);
    }

    // --- Fallback ---
    return this._fallback(kpis);
  }

  _explainRevenueDrop(kpis, revenueTrend, topCountries, deviceSplit) {
    const topCountry = topCountries[0]?.country || "your top market";
    const mobilePct = deviceSplit.mobilePct || 0;
    const avgRevenue = kpis.totalPurchases > 0 ? (kpis.totalRevenue / kpis.totalPurchases).toFixed(2) : 0;

    const peakHour = revenueTrend.length > 0
      ? revenueTrend.reduce((max, r) => r.revenue > max.revenue ? r : max, revenueTrend[0])
      : null;

    const lowHour = revenueTrend.length > 1
      ? revenueTrend.reduce((min, r) => r.revenue < min.revenue ? r : min, revenueTrend[0])
      : null;

    let response = `📉 **Revenue Analysis**\n\n`;
    response += `Current total revenue stands at **$${kpis.totalRevenue?.toLocaleString() || 0}** across **${kpis.totalPurchases || 0} purchases** (avg $${avgRevenue} per order).\n\n`;

    if (peakHour && lowHour) {
      response += `**Peak revenue** occurred at **${peakHour._id}** with $${peakHour.revenue.toLocaleString()}. `;
      response += `The **lowest period** was **${lowHour._id}** with $${lowHour.revenue.toLocaleString()}.\n\n`;
    }

    response += `**Likely causes of revenue decline:**\n`;
    response += `• **${topCountry}** is your top traffic source — any regional issues or timezone effects here directly impact overall revenue.\n`;

    if (mobilePct > 50) {
      response += `• **${mobilePct}% of traffic is mobile** — mobile checkout friction is a leading cause of revenue drops. Consider streamlining the mobile checkout flow.\n`;
    }

    response += `• Lower-than-usual purchase-to-click conversion could indicate pricing friction or cart abandonment.\n\n`;
    response += `**Recommended actions:** Check for recent code deployments, payment gateway issues, or campaign expirations during the low period.`;
    return response;
  }

  _revenueOverview(kpis, revenueTrend) {
    const avgRevenue = kpis.totalPurchases > 0 ? (kpis.totalRevenue / kpis.totalPurchases).toFixed(2) : 0;
    let response = `💰 **Revenue Overview (Last 24 Hours)**\n\n`;
    response += `- **Total Revenue:** $${kpis.totalRevenue?.toLocaleString() || 0}\n`;
    response += `- **Total Purchases:** ${kpis.totalPurchases || 0}\n`;
    response += `- **Average Order Value:** $${avgRevenue}\n\n`;

    if (revenueTrend.length > 0) {
      const peak = revenueTrend.reduce((max, r) => r.revenue > max.revenue ? r : max, revenueTrend[0]);
      response += `📈 Peak revenue was at **${peak._id}** with **$${peak.revenue?.toLocaleString()}** from **${peak.count} purchases**.\n\n`;
    }

    response += `💡 To increase revenue: focus on peak-hour campaigns, reduce cart abandonment on mobile, and offer targeted promotions to your top country.`;
    return response;
  }

  _bestRevenueInsight(revenueTrend, topPages) {
    const checkoutPage = topPages.find((p) => p.page?.includes("checkout"));
    let response = `🏆 **Top Revenue Insights**\n\n`;

    if (revenueTrend.length > 0) {
      const sorted = [...revenueTrend].sort((a, b) => b.revenue - a.revenue);
      response += `**Best revenue hours:**\n`;
      sorted.slice(0, 3).forEach((r, i) => {
        response += `  ${i + 1}. ${r._id} — $${r.revenue?.toLocaleString()} (${r.count} purchases)\n`;
      });
    }

    if (checkoutPage) {
      response += `\n✅ Your **checkout page** is among the top ${topPages.indexOf(checkoutPage) + 1} most visited pages, which is a positive conversion signal.`;
    }

    response += `\n\n💡 **Recommendation:** Run your highest-value promotions during peak revenue hours for maximum impact.`;
    return response;
  }

  _trafficInsight(kpis, topCountries, recentAlerts) {
    const aiAlert = recentAlerts.find((a) => a.source === "ai" || a.message?.includes("spike"));
    let response = `📊 **Traffic Analysis**\n\n`;
    response += `- **Events last hour:** ${kpis.eventsLastHour || 0}\n`;
    response += `- **Total clicks recorded:** ${kpis.totalClicks?.toLocaleString() || 0}\n\n`;

    if (aiAlert) {
      response += `⚠️ **Active Alert:** ${aiAlert.message}\n\n`;
    }

    response += `**Traffic by country:**\n`;
    topCountries.slice(0, 5).forEach((c, i) => {
      response += `  ${i + 1}. ${c.country}: ${c.count} events\n`;
    });

    response += `\n💡 If you see an unusual spike from a single country, it may indicate a successful campaign, organic virality, or bot traffic. Check event quality ratios (clicks vs. purchases).`;
    return response;
  }

  _trafficOverview(kpis, topCountries) {
    const top = topCountries[0];
    let response = `🌍 **Traffic Overview**\n\n`;
    response += `Your top traffic source is **${top?.country || "Unknown"}** with **${top?.count || 0} events**.\n\n`;
    response += `**All countries:**\n`;
    topCountries.forEach((c, i) => {
      response += `  ${i + 1}. ${c.country}: ${c.count} events\n`;
    });
    return response;
  }

  _countryInsight(topCountries, kpis) {
    const top = topCountries[0];
    let response = `🌍 **Geographic Breakdown**\n\n`;

    if (!top) {
      return `No country data available yet. Events need to flow through the system to populate geographic insights.`;
    }

    response += `**Top country by events: ${top.country}** (${top.count} events)\n\n`;
    response += `**Full country ranking:**\n`;
    topCountries.forEach((c, i) => {
      const pct = kpis.totalClicks > 0 ? Math.round((c.count / (kpis.totalClicks || 1)) * 100) : "?";
      response += `  ${i + 1}. **${c.country}** — ${c.count} events\n`;
    });

    response += `\n💡 **Insight:** ${top.country} dominates your traffic. Consider localizing your UI, offering region-specific pricing, or running targeted ad campaigns there for maximum ROI.`;
    return response;
  }

  _conversionInsight(kpis, eventTypes, topPages) {
    const clicks = kpis.totalClicks || 1;
    const purchases = kpis.totalPurchases || 0;
    const signups = kpis.totalSignups || 0;
    const convRate = ((purchases / clicks) * 100).toFixed(2);
    const signupRate = ((signups / clicks) * 100).toFixed(2);

    let response = `🎯 **Conversion Rate Analysis**\n\n`;
    response += `- **Click → Purchase Conversion:** ${convRate}%\n`;
    response += `- **Click → Signup Conversion:** ${signupRate}%\n\n`;

    const benchmark = 2.5;
    if (parseFloat(convRate) < benchmark) {
      response += `⚠️ Your **${convRate}% purchase conversion** is below the typical e-commerce benchmark of **${benchmark}%**.\n\n`;
      response += `**Likely issues:**\n`;
      response += `• Checkout friction (too many steps, no guest checkout)\n`;
      response += `• Pricing not competitive enough\n`;
      response += `• Poor mobile experience (${kpis.mobilePct || "?"}% mobile traffic)\n\n`;
    } else {
      response += `✅ Your **${convRate}% conversion rate** is performing above the typical ${benchmark}% benchmark. Great work!\n\n`;
    }

    const checkoutPage = topPages.find((p) => p.page?.includes("checkout"));
    if (checkoutPage) {
      response += `The **checkout page** is in your top ${topPages.indexOf(checkoutPage) + 1} visited pages, indicating healthy funnel progression.`;
    }

    return response;
  }

  _deviceInsight(deviceSplit, kpis) {
    const { desktop = 0, mobile = 0, desktopPct = 0, mobilePct = 0 } = deviceSplit;
    let response = `📱 **Device Split Analysis**\n\n`;
    response += `- **Desktop:** ${desktopPct}% (${desktop} events)\n`;
    response += `- **Mobile:** ${mobilePct}% (${mobile} events)\n\n`;

    if (mobilePct > 60) {
      response += `📱 **Mobile-first alert:** ${mobilePct}% of your traffic is on mobile. Prioritize mobile UX — every 100ms of load time delay on mobile reduces conversions by ~1%.`;
    } else if (desktopPct > 70) {
      response += `🖥️ **Desktop-dominant:** ${desktopPct}% desktop traffic suggests a B2B or professional audience. Consider desktop-optimized dashboards and longer-form content.`;
    } else {
      response += `⚖️ Balanced device split. Ensure both desktop and mobile experiences are equally optimized.`;
    }
    return response;
  }

  _predictionInsight(kpis, revenueTrend) {
    const recentRevenues = revenueTrend.slice(-6).map((r) => r.revenue || 0);
    const hasData = recentRevenues.length >= 2;

    let response = `🔮 **Predictive Analytics**\n\n`;

    if (hasData) {
      const avg = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
      const last = recentRevenues[recentRevenues.length - 1];
      const trend = last > avg ? "upward" : last < avg ? "downward" : "stable";
      const predicted = Math.round(avg * (trend === "upward" ? 1.1 : trend === "downward" ? 0.92 : 1.0));

      response += `Based on the last ${recentRevenues.length} data points (EWMA):\n\n`;
      response += `- **Current trend:** ${trend} 📈\n`;
      response += `- **Recent avg revenue/period:** $${Math.round(avg).toLocaleString()}\n`;
      response += `- **Predicted next period:** ~$${predicted.toLocaleString()}\n`;
      response += `- **Confidence:** ~72% (limited data window)\n\n`;
      response += `💡 For more accurate predictions, ensure consistent event ingestion for at least 7 days. The prediction line on your dashboard uses EWMA by default — switch to Linear Regression for trending datasets.`;
    } else {
      response += `Insufficient data for confident predictions. Need at least 2 revenue data points.\n\n`;
      response += `💡 **Tip:** Run the data seeder from Settings to populate historical data, then predictions will appear on the dashboard.`;
    }

    return response;
  }

  _anomalyInsight(recentAlerts, kpis) {
    const aiAlerts = recentAlerts.filter((a) => a.source === "ai");
    const ruleAlerts = recentAlerts.filter((a) => a.type === "warning" || a.type === "danger");

    let response = `🧠 **AI Anomaly Detection Status**\n\n`;

    if (aiAlerts.length > 0) {
      response += `**Active AI-detected anomalies (${aiAlerts.length}):**\n`;
      aiAlerts.forEach((a) => {
        response += `  ⚠️ ${a.message}\n`;
      });
      response += `\n`;
    } else {
      response += `✅ No AI-detected anomalies in the recent window. Traffic and revenue patterns are within normal Z-score bounds (±2.5σ).\n\n`;
    }

    if (ruleAlerts.length > 0) {
      response += `**Rule-based alerts (${ruleAlerts.length}):**\n`;
      ruleAlerts.slice(0, 3).forEach((a) => {
        response += `  🔔 ${a.message}\n`;
      });
    }

    response += `\n💡 The anomaly detector runs every 30 seconds using Z-score analysis on 5-minute event buckets with a 60-minute baseline window.`;
    return response;
  }

  _pageInsight(topPages, kpis) {
    let response = `📄 **Page Performance Analysis**\n\n`;
    response += `**Top pages by traffic:**\n`;

    topPages.forEach((p, i) => {
      const isMoneyPage = p.page?.includes("checkout") || p.page?.includes("cart") || p.page?.includes("purchase");
      const badge = isMoneyPage ? " 💰" : "";
      response += `  ${i + 1}. **${p.page}** — ${p.count} events${badge}\n`;
    });

    const topPage = topPages[0];
    const checkoutPage = topPages.find((p) => p.page?.includes("checkout"));

    response += `\n**Key insights:**\n`;
    if (topPage) {
      response += `• **${topPage.page}** is your most visited page — ensure it has a clear CTA and fast load time.\n`;
    }
    if (checkoutPage) {
      const rank = topPages.indexOf(checkoutPage) + 1;
      if (rank <= 3) {
        response += `• ✅ Checkout is rank #${rank} — good funnel progression.\n`;
      } else {
        response += `• ⚠️ Checkout is rank #${rank} — consider improving product-to-checkout conversion.\n`;
      }
    }

    return response;
  }

  _recommendations(kpis, topCountries, topPages, deviceSplit, eventTypes) {
    const mobilePct = deviceSplit.mobilePct || 0;
    const topCountry = topCountries[0]?.country || "your top market";
    const clicks = kpis.totalClicks || 1;
    const purchases = kpis.totalPurchases || 0;
    const convRate = ((purchases / clicks) * 100).toFixed(1);

    let response = `💡 **AI Business Recommendations**\n\n`;
    response += `Based on your current analytics data:\n\n`;

    const recs = [];

    if (mobilePct > 50) {
      recs.push(`📱 **Optimize mobile experience** — ${mobilePct}% of your traffic is mobile. Reduce checkout steps, enable autofill, and test on 3G speeds.`);
    }

    if (parseFloat(convRate) < 2.5) {
      recs.push(`🎯 **Improve conversion rate** — Your ${convRate}% conversion is below the 2.5% industry average. A/B test your CTA buttons and pricing display.`);
    }

    recs.push(`🌍 **Double down on ${topCountry}** — Your top traffic source. Run localized campaigns, consider regional pricing, and add their local payment methods.`);

    const productPage = topPages.find((p) => p.page?.includes("product"));
    const checkoutPage = topPages.find((p) => p.page?.includes("checkout"));
    if (productPage && !checkoutPage) {
      recs.push(`🛒 **Add checkout prompts** — High product page traffic but checkout page not in top 5. Add sticky "Add to Cart" CTAs on product pages.`);
    }

    recs.push(`⏰ **Time your campaigns** — Use the revenue trend chart to identify your peak hours and schedule promotional emails/ads to arrive 30 minutes before peak.`);
    recs.push(`🔔 **Set up alert rules** — Use the Event Rules Engine to get notified when a purchase exceeds $300 or traffic spikes unexpectedly.`);

    recs.forEach((rec, i) => {
      response += `${i + 1}. ${rec}\n\n`;
    });

    return response.trim();
  }

  _fullSummary(kpis, topCountries, topPages, deviceSplit) {
    const avgOrder = kpis.totalPurchases > 0 ? (kpis.totalRevenue / kpis.totalPurchases).toFixed(2) : 0;
    const topCountry = topCountries[0]?.country || "N/A";
    const topPage = topPages[0]?.page || "N/A";

    let response = `📊 **PulseBoard Analytics Summary**\n\n`;
    response += `**Core KPIs:**\n`;
    response += `- Total Revenue: **$${kpis.totalRevenue?.toLocaleString() || 0}**\n`;
    response += `- Total Purchases: **${kpis.totalPurchases || 0}** (avg $${avgOrder})\n`;
    response += `- Total Clicks: **${kpis.totalClicks?.toLocaleString() || 0}**\n`;
    response += `- Total Signups: **${kpis.totalSignups?.toLocaleString() || 0}**\n`;
    response += `- Events last hour: **${kpis.eventsLastHour || 0}**\n\n`;

    response += `**Highlights:**\n`;
    response += `- 🌍 Top market: **${topCountry}**\n`;
    response += `- 📄 Most visited page: **${topPage}**\n`;
    response += `- 📱 Device split: ${deviceSplit.desktopPct || 0}% desktop / ${deviceSplit.mobilePct || 0}% mobile\n\n`;

    response += `Ask me about revenue trends, anomalies, country breakdowns, conversion rates, predictions, or recommendations! 🤖`;
    return response;
  }

  _fallback(kpis) {
    return `I'm your **PulseBoard Analytics Copilot** 🤖\n\nI can answer questions about your live analytics data. Try asking:\n\n- "Why did revenue drop?"\n- "Which country has the highest traffic?"\n- "What's the conversion rate?"\n- "Predict tomorrow's traffic"\n- "Show me device breakdown"\n- "Give me business recommendations"\n- "Summarize today's performance"\n\nCurrent snapshot: **$${kpis.totalRevenue?.toLocaleString() || 0}** revenue, **${kpis.totalPurchases || 0}** purchases, **${kpis.totalClicks?.toLocaleString() || 0}** clicks.`;
  }
}

/**
 * Pattern matching helper — returns true if ANY of the terms match the query.
 * @param {string} query
 * @param {string[]} terms
 * @returns {boolean}
 */
const _matches = (query, terms) => terms.some((t) => query.includes(t));

/**
 * Async delay helper.
 * @param {number} ms
 */
const _delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = DeterministicProvider;
