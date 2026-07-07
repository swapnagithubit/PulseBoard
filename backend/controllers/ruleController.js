/**
 * @module controllers/ruleController
 * @description Controller for alert rules management (CRUD + toggle).
 */

const Rule = require("../models/Rule");
const logger = require("../config/logger");

/**
 * GET /api/rules
 * Fetch all alert rules.
 */
const getRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    logger.error("[RuleController] Fetch failed:", err.message);
    res.status(500).json({ message: "Failed to fetch rules" });
  }
};

/**
 * POST /api/rules
 * Create a new alert rule.
 */
const createRule = async (req, res) => {
  try {
    const { name, eventType, field, operator, value, severity } = req.body;

    if (!name || !eventType || !field || !operator || value === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const rule = await Rule.create({
      name,
      eventType,
      field,
      operator,
      value: String(value),
      severity: severity || "info",
    });

    logger.info(`[RuleController] Rule created: ${rule.name}`);
    res.status(201).json(rule);
  } catch (err) {
    logger.error("[RuleController] Create failed:", err.message);
    res.status(500).json({ message: "Failed to create rule" });
  }
};

/**
 * PATCH /api/rules/:id/toggle
 * Enable or disable a rule.
 */
const toggleRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    logger.info(`[RuleController] Rule "${rule.name}" toggled to isActive=${rule.isActive}`);
    res.json(rule);
  } catch (err) {
    logger.error("[RuleController] Toggle failed:", err.message);
    res.status(500).json({ message: "Failed to toggle rule state" });
  }
};

/**
 * DELETE /api/rules/:id
 * Delete an alert rule.
 */
const deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }

    await rule.deleteOne();
    logger.info(`[RuleController] Rule deleted: ${rule.name}`);
    res.json({ message: "Rule deleted successfully" });
  } catch (err) {
    logger.error("[RuleController] Delete failed:", err.message);
    res.status(500).json({ message: "Failed to delete rule" });
  }
};

module.exports = { getRules, createRule, toggleRule, deleteRule };
