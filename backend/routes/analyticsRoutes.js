const express = require("express");
const router = express.Router();
const { getAnalytics, getRawEvents, resetAnalytics, seedAnalyticsData, collectEvent } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getAnalytics);
router.get("/events", protect, getRawEvents);
router.post("/reset", protect, resetAnalytics);
router.post("/seed", protect, seedAnalyticsData);
router.post("/collect", collectEvent);

module.exports = router;