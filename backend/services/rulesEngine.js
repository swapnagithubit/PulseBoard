/**
 * @module services/rulesEngine
 * @description Dynamic alerting rules evaluation engine.
 * Tests incoming events against all active user-configured rules.
 */

const Rule = require("../models/Rule");
const Alert = require("../models/Alert");
const logger = require("../config/logger");

/**
 * Evaluates an incoming event against all active rules.
 * Generates and broadcasts alerts if rules match.
 *
 * @param {Object} event - The Mongoose Event document
 * @param {import('socket.io').Server} io - Socket.io instance
 * @returns {Promise<void>}
 */
const evaluateEvent = async (event, io) => {
  try {
    const activeRules = await Rule.find({ isActive: true }).lean();

    if (activeRules.length === 0) return;

    for (const rule of activeRules) {
      // 1. Match event type
      if (rule.eventType !== "any" && rule.eventType !== event.eventType) {
        continue;
      }

      // 2. Extract and sanitize field value
      const eventVal = event[rule.field];
      if (eventVal === undefined) {
        continue; // field doesn't exist on event
      }

      // 3. Test operator logic
      let isMatch = false;
      const ruleValStr = String(rule.value);

      if (rule.operator === "equals") {
        isMatch = String(eventVal).toLowerCase() === ruleValStr.toLowerCase();
      } else if (rule.operator === "not_equals") {
        isMatch = String(eventVal).toLowerCase() !== ruleValStr.toLowerCase();
      } else if (rule.operator === "contains") {
        isMatch = String(eventVal).toLowerCase().includes(ruleValStr.toLowerCase());
      } else if (rule.operator === "greater_than" || rule.operator === "less_than") {
        const numEventVal = Number(eventVal);
        const numRuleVal = Number(rule.value);

        if (!isNaN(numEventVal) && !isNaN(numRuleVal)) {
          isMatch = rule.operator === "greater_than"
            ? numEventVal > numRuleVal
            : numEventVal < numRuleVal;
        }
      }

      // 4. Trigger alert on match
      if (isMatch) {
        logger.info(`[RulesEngine] Match found for rule "${rule.name}" on event: ${event._id}`);

        const alertMessage = `Rule Alert [${rule.name}]: Event type '${event.eventType}' matched condition '${rule.field} ${rule.operator} ${rule.value}' (value: ${eventVal}) from user ${event.userId.slice(0, 8)}...`;

        const alert = await Alert.create({
          type: rule.severity,
          source: "rule", // Differentiate from 'ai' and 'system'
          message: alertMessage,
          time: new Date(),
        });

        // Broadcast real-time update
        io.emit("new-alert", alert);
      }
    }
  } catch (err) {
    logger.error("[RulesEngine] Evaluation error:", err.message);
  }
};

module.exports = { evaluateEvent };
