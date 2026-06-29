const Alert = require("../models/Alert");

const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ time: -1 }).limit(100);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAlertRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearAlerts = async (req, res) => {
  try {
    await Alert.deleteMany({});
    res.json({ message: "All alerts cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAlerts, markAlertRead, clearAlerts };