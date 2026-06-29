const express = require("express");
const router = express.Router();
const { getAlerts, markAlertRead, clearAlerts } = require("../controllers/alertController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getAlerts);
router.put("/:id/read", protect, markAlertRead);
router.delete("/", protect, adminOnly, clearAlerts);

module.exports = router;