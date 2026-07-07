/**
 * @module models/Rule
 * @description Mongoose schema for user-defined alerting rules.
 * Allows alerting based on event fields matching specific operator criteria.
 */

const mongoose = require("mongoose");

const ruleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      default: "any", // match any event type or a specific one (e.g. purchase)
    },
    field: {
      type: String,
      required: true, // e.g. "amount", "country", "device", "page"
    },
    operator: {
      type: String,
      required: true,
      enum: ["equals", "not_equals", "greater_than", "less_than", "contains"],
    },
    value: {
      type: String,
      required: true, // stored as string, casted dynamically during evaluation
    },
    severity: {
      type: String,
      enum: ["info", "warning", "danger"],
      default: "info",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Rule", ruleSchema);
