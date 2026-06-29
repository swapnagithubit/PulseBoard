const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  totalClicks: {
    type: Number,
    default: 0,
  },

  totalSignups: {
    type: Number,
    default: 0,
  },

  totalPurchases: {
    type: Number,
    default: 0,
  },

  totalRevenue: {
    type: Number,
    default: 0,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Analytics",
  analyticsSchema
);
