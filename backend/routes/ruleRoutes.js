const express = require("express");
const router = express.Router();
const { getRules, createRule, toggleRule, deleteRule } = require("../controllers/ruleController");
const { protect } = require("../middleware/authMiddleware");

// All rules routes are protected by JWT auth middleware
router.route("/")
  .get(protect, getRules)
  .post(protect, createRule);

router.patch("/:id/toggle", protect, toggleRule);
router.delete("/:id", protect, deleteRule);

module.exports = router;
