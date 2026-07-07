const express = require("express");
const router = express.Router();
const { getAnalytics, getRawEvents, resetAnalytics, seedAnalyticsData, collectEvent, getEventTimeline, getSessions, getSessionDetails } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getAnalytics);
router.get("/events", protect, getRawEvents);
router.get("/timeline", protect, getEventTimeline);
router.post("/reset", protect, resetAnalytics);
router.post("/seed", protect, seedAnalyticsData);
router.post("/collect", collectEvent);

// Session Replay Routes
router.get("/sessions", protect, getSessions);
router.get("/sessions/:userId", protect, getSessionDetails);

module.exports = router;