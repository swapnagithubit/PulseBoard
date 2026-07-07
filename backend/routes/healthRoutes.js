const express = require("express");
const router = express.Router();
const { getServiceHealth, getKafkaMetrics } = require("../controllers/healthController");
const { protect } = require("../middleware/authMiddleware");

/** GET /api/health/services — All service statuses */
router.get("/services", protect, getServiceHealth);

/** GET /api/health/kafka — Kafka topic + consumer metrics */
router.get("/kafka", protect, getKafkaMetrics);

module.exports = router;
