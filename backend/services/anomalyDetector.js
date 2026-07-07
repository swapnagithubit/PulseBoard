/**
 * @module anomalyDetector
 * @description Z-score based anomaly detection service.
 * Runs as a background process on server startup, emitting Socket.io alerts
 * when statistical anomalies are detected in event traffic or revenue.
 */

const Event = require("../models/Event");
const Alert = require("../models/Alert");
const logger = require("../config/logger");

/** Z-score threshold above which an anomaly is flagged */
const Z_THRESHOLD = 2.5;

/** Detection interval in milliseconds */
const DETECTION_INTERVAL_MS = 30_000;

/** How many minutes of history to use for baseline */
const BASELINE_WINDOW_MINUTES = 60;

/**
 * Computes mean and standard deviation of an array.
 * @param {number[]} values
 * @returns {{ mean: number, stdDev: number }}
 */
const computeStats = (values) => {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
};

/**
 * Computes z-score for a given value against the baseline.
 * @param {number} value
 * @param {number} mean
 * @param {number} stdDev
 * @returns {number}
 */
const zScore = (value, mean, stdDev) => {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

/**
 * Fetches 5-minute bucket event counts for the past N minutes.
 * @param {number} windowMinutes
 * @returns {Promise<number[]>}
 */
const getEventBuckets = async (windowMinutes) => {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const buckets = await Event.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          $floor: {
            $divide: [
              { $subtract: ["$timestamp", new Date(0)] },
              5 * 60 * 1000, // 5-minute buckets
            ],
          },
        },
        count: { $sum: 1 },
        countries: { $addToSet: "$country" },
        topCountry: { $first: "$country" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return buckets;
};

/**
 * Fetches 5-minute revenue buckets for the past N minutes.
 * @param {number} windowMinutes
 * @returns {Promise<{_id: number, revenue: number}[]>}
 */
const getRevenueBuckets = async (windowMinutes) => {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const buckets = await Event.aggregate([
    { $match: { timestamp: { $gte: since }, eventType: "purchase" } },
    {
      $group: {
        _id: {
          $floor: {
            $divide: [
              { $subtract: ["$timestamp", new Date(0)] },
              5 * 60 * 1000,
            ],
          },
        },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return buckets;
};

/**
 * Runs one cycle of anomaly detection and emits alerts if anomalies found.
 * @param {import('socket.io').Server} io
 */
const runDetectionCycle = async (io) => {
  try {
    const buckets = await getEventBuckets(BASELINE_WINDOW_MINUTES);
    if (buckets.length < 3) return; // need minimum data

    const counts = buckets.map((b) => b.count);
    const { mean, stdDev } = computeStats(counts.slice(0, -1)); // baseline = all except latest

    const latest = buckets[buckets.length - 1];
    const latestCount = latest?.count || 0;
    const z = zScore(latestCount, mean, stdDev);

    if (Math.abs(z) >= Z_THRESHOLD && latestCount > 0) {
      const pctChange = mean > 0 ? Math.round(((latestCount - mean) / mean) * 100) : 100;
      const direction = z > 0 ? "spike" : "drop";
      const confidence = Math.min(99, Math.round(Math.min(Math.abs(z) / Z_THRESHOLD, 3) * 33 + 60));

      // Avoid duplicate alerts within 2 minutes
      const recentDuplicate = await Alert.findOne({
        source: "ai",
        message: /AI detected abnormal traffic/,
        time: { $gte: new Date(Date.now() - 2 * 60_000) },
      });

      if (!recentDuplicate) {
        const topCountry = latest.topCountry || "Unknown";
        const alert = await Alert.create({
          type: z > 0 ? "warning" : "info",
          source: "ai",
          message: `⚠ AI detected abnormal traffic ${direction}. Confidence: ${confidence}%. Traffic ${direction === "spike" ? "increased" : "decreased"} ${Math.abs(pctChange)}% in the last 5 minutes${topCountry !== "Unknown" ? ` (top country: ${topCountry})` : ""}.`,
          time: new Date(),
        });
        io.emit("new-alert", alert);
        logger.info(`[AnomalyDetector] ${direction.toUpperCase()} detected z=${z.toFixed(2)}, confidence=${confidence}%`);
      }
    }

    // Revenue anomaly check
    const revBuckets = await getRevenueBuckets(BASELINE_WINDOW_MINUTES);
    if (revBuckets.length >= 3) {
      const revValues = revBuckets.map((b) => b.revenue);
      const { mean: revMean, stdDev: revStdDev } = computeStats(revValues.slice(0, -1));
      const latestRev = revValues[revValues.length - 1] || 0;
      const revZ = zScore(latestRev, revMean, revStdDev);

      if (Math.abs(revZ) >= Z_THRESHOLD && latestRev > 0) {
        const pctChange = revMean > 0 ? Math.round(((latestRev - revMean) / revMean) * 100) : 100;
        const confidence = Math.min(97, Math.round(Math.min(Math.abs(revZ) / Z_THRESHOLD, 3) * 30 + 60));

        const recentRevDuplicate = await Alert.findOne({
          source: "ai",
          message: /AI detected revenue anomaly/,
          time: { $gte: new Date(Date.now() - 2 * 60_000) },
        });

        if (!recentRevDuplicate) {
          const direction = revZ > 0 ? "spike" : "drop";
          const alert = await Alert.create({
            type: revZ > 0 ? "info" : "danger",
            source: "ai",
            message: `⚠ AI detected revenue anomaly. Confidence: ${confidence}%. Revenue ${direction === "spike" ? "surged" : "dropped"} ${Math.abs(pctChange)}% vs recent baseline ($${revMean.toFixed(0)} avg → $${latestRev.toFixed(0)}).`,
            time: new Date(),
          });
          io.emit("new-alert", alert);
          logger.info(`[AnomalyDetector] Revenue ${direction} detected z=${revZ.toFixed(2)}`);
        }
      }
    }
  } catch (err) {
    logger.error("[AnomalyDetector] Detection cycle failed:", err.message);
  }
};

/**
 * Starts the anomaly detection background service.
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @returns {NodeJS.Timeout} Interval handle (for cleanup)
 */
const startAnomalyDetector = (io) => {
  logger.info(`[AnomalyDetector] Started — running every ${DETECTION_INTERVAL_MS / 1000}s with Z-threshold ${Z_THRESHOLD}`);
  // Run immediately on start
  runDetectionCycle(io);
  return setInterval(() => runDetectionCycle(io), DETECTION_INTERVAL_MS);
};

module.exports = { startAnomalyDetector, runDetectionCycle, computeStats, zScore };
