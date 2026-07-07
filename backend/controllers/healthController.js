/**
 * @module healthController
 * @description Service health and Kafka metrics controller.
 *
 * Routes:
 *   GET /api/health/services — Status of all services (Kafka, MongoDB, Consumer, Backend)
 *   GET /api/health/kafka    — Detailed Kafka topic + consumer lag metrics
 */

const mongoose = require("mongoose");
const { getProvider } = require("../services/llm");
const logger = require("../config/logger");

// Track Kafka producer metrics in-memory
let kafkaMetrics = {
  connected: false,
  topicName: "website-events",
  partitionCount: 1,
  messagesProduced: 0,
  lastProducedAt: null,
  consumerLag: 0,
  messagesPerSec: 0,
  lastUpdated: null,
};

/** Used by kafka config to update metrics */
const updateKafkaMetrics = (update) => {
  kafkaMetrics = { ...kafkaMetrics, ...update, lastUpdated: new Date() };
};

/**
 * GET /api/health/services
 * Returns live status of all platform services.
 */
const getServiceHealth = async (req, res) => {
  try {
    const startTime = process.hrtime.bigint();

    // MongoDB check
    const mongoStatus = mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";
    const mongoPing = mongoStatus === "healthy" ? await _pingMongo() : null;

    // Kafka check — via the producer config module
    let kafkaStatus = "unknown";
    let kafkaDetails = {};
    try {
      const { getProducer } = require("../config/kafka");
      const producer = getProducer();
      kafkaStatus = producer ? "healthy" : "disconnected";
      kafkaDetails = { connected: !!producer, topic: kafkaMetrics.topicName };
    } catch {
      kafkaStatus = "unhealthy";
    }

    // Consumer check — from socket.js heartbeat state
    let consumerStatus = "unknown";
    try {
      const socketModule = require("../socket");
      consumerStatus = socketModule.isConsumerConnected?.() ? "healthy" : "disconnected";
    } catch {
      consumerStatus = "unknown";
    }

    // Backend (self) metrics
    const uptimeSeconds = Math.floor(process.uptime());
    const memUsage = process.memoryUsage();
    const backendDetails = {
      uptime: _formatUptime(uptimeSeconds),
      uptimeSeconds,
      memoryMB: Math.round(memUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    };

    const endTime = process.hrtime.bigint();
    const responseTimeMs = Number(endTime - startTime) / 1_000_000;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      responseTimeMs: Math.round(responseTimeMs),
      services: {
        mongodb: {
          status: mongoStatus,
          pingMs: mongoPing,
          database: mongoose.connection.name || "pulseboard",
        },
        kafka: {
          status: kafkaStatus,
          ...kafkaDetails,
          metrics: kafkaMetrics,
        },
        consumer: {
          status: consumerStatus,
        },
        backend: {
          status: "healthy",
          ...backendDetails,
        },
        ai: {
          status: "healthy",
          provider: getProvider().getName(),
        },
      },
    });
  } catch (err) {
    logger.error("[Health] Service health check failed:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/health/kafka
 * Returns detailed Kafka topic and consumer metrics.
 */
const getKafkaMetrics = async (req, res) => {
  try {
    let topicMetrics = null;

    try {
      const { getAdminClient } = require("../config/kafka");
      const admin = getAdminClient?.();

      if (admin) {
        const topicOffsets = await admin.fetchTopicOffsets("website-events");
        const consumerOffsets = await admin.fetchOffsets({
          groupId: "pulseboard-consumer",
          topics: ["website-events"],
        });

        const latestOffset = topicOffsets[0]?.high || 0;
        const committedOffset = consumerOffsets?.topics?.[0]?.partitions?.[0]?.offset || 0;
        const lag = Math.max(0, latestOffset - committedOffset);

        topicMetrics = {
          topicName: "website-events",
          partitionCount: topicOffsets.length,
          latestOffset: parseInt(latestOffset),
          committedOffset: parseInt(committedOffset),
          consumerLag: lag,
        };

        updateKafkaMetrics({ consumerLag: lag, connected: true });
      }
    } catch (kafkaErr) {
      logger.warn("[Health] Kafka admin metrics unavailable:", kafkaErr.message);
    }

    res.json({
      success: true,
      kafka: {
        ...kafkaMetrics,
        topicDetails: topicMetrics,
      },
    });
  } catch (err) {
    logger.error("[Health] Kafka metrics failed:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @private */
const _pingMongo = async () => {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    return Date.now() - start;
  } catch {
    return null;
  }
};

/** @private */
const _formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
};

module.exports = { getServiceHealth, getKafkaMetrics, updateKafkaMetrics };
