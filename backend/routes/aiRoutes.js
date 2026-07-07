const express = require("express");
const router = express.Router();
const { handleChat, getInsights, generateReport, getStatus } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

/** POST /api/ai/chat — Initiate AI chat (response via Socket.io) */
router.post("/chat", protect, handleChat);

/** GET /api/ai/insights — Auto-generated dashboard insights */
router.get("/insights", protect, getInsights);

/** POST /api/ai/report — Generate full analytics report */
router.post("/report", protect, generateReport);

/** GET /api/ai/status — LLM provider status */
router.get("/status", protect, getStatus);

module.exports = router;
