/**
 * @module predictiveAnalytics
 * @description Time-series prediction service supporting three algorithms:
 *   - Moving Average (MA)
 *   - Exponential Weighted Moving Average (EWMA)
 *   - Simple Linear Regression (LR)
 *
 * Each algorithm returns a prediction with explainability metadata.
 */

/**
 * @typedef {Object} PredictionResult
 * @property {number} predicted - Predicted value for the next period
 * @property {number} confidence - Confidence 0–100 (based on data quality)
 * @property {string} algorithm - Name of the algorithm used
 * @property {number} dataPoints - Number of data points used
 * @property {string} reason - Human-readable explanation
 * @property {number[]} forecastLine - Array of predicted values for visualization
 */

/**
 * Computes a Simple Moving Average prediction.
 * @param {number[]} values - Historical values (oldest → newest)
 * @param {number} [window=5] - Window size
 * @returns {PredictionResult}
 */
const movingAverage = (values, window = 5) => {
  if (!values || values.length === 0) return _empty("Moving Average");

  const slice = values.slice(-Math.min(window, values.length));
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / slice.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? stdDev / avg : 1; // coefficient of variation

  const confidence = Math.max(10, Math.min(95, Math.round((1 - cv) * 100)));

  const forecastLine = [...values, avg];

  return {
    predicted: Math.round(avg * 100) / 100,
    confidence,
    algorithm: "Moving Average",
    dataPoints: slice.length,
    reason: `Based on the last ${slice.length} data points with average of ${avg.toFixed(1)} and std deviation ${stdDev.toFixed(1)}.`,
    forecastLine,
  };
};

/**
 * Computes an Exponential Weighted Moving Average (EWMA) prediction.
 * @param {number[]} values - Historical values (oldest → newest)
 * @param {number} [alpha=0.3] - Smoothing factor (0=slow, 1=fast)
 * @returns {PredictionResult}
 */
const ewma = (values, alpha = 0.3) => {
  if (!values || values.length === 0) return _empty("EWMA");

  let smoothed = values[0];
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }

  const last = values[values.length - 1];
  const trend = smoothed - values[Math.max(0, values.length - 2)];
  const predicted = smoothed + trend * 0.5;

  // Confidence based on data size and consistency
  const variance = values.reduce((a, b) => a + Math.pow(b - smoothed, 2), 0) / values.length;
  const cv = smoothed > 0 ? Math.sqrt(variance) / smoothed : 1;
  const confidence = Math.max(10, Math.min(92, Math.round((1 - Math.min(cv, 1)) * 100)));

  const direction = trend > 0 ? "upward" : trend < 0 ? "downward" : "stable";
  const forecastLine = [...values, Math.round(predicted * 100) / 100];

  return {
    predicted: Math.round(predicted * 100) / 100,
    confidence,
    algorithm: "EWMA",
    dataPoints: values.length,
    reason: `EWMA (α=${alpha}) smoothed to ${smoothed.toFixed(1)} with ${direction} trend. Recent momentum applied.`,
    forecastLine,
  };
};

/**
 * Computes a Simple Linear Regression prediction (next period).
 * @param {number[]} values - Historical values (oldest → newest)
 * @returns {PredictionResult}
 */
const linearRegression = (values) => {
  if (!values || values.length < 2) return _empty("Linear Regression");

  const n = values.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  const ssXY = xs.reduce((acc, x, i) => acc + (x - xMean) * (values[i] - yMean), 0);
  const ssXX = xs.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;

  const predicted = slope * n + intercept;

  // R² for confidence
  const ssRes = values.reduce((acc, y, i) => acc + Math.pow(y - (slope * i + intercept), 2), 0);
  const ssTot = values.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const confidence = Math.max(10, Math.min(95, Math.round(Math.max(0, r2) * 100)));

  const direction = slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "flat";
  const forecastLine = [...xs.map(x => slope * x + intercept), predicted];

  return {
    predicted: Math.round(Math.max(0, predicted) * 100) / 100,
    confidence,
    algorithm: "Linear Regression",
    dataPoints: n,
    reason: `Linear trend is ${direction} (slope=${slope.toFixed(2)}, R²=${(r2 * 100).toFixed(0)}%). Extrapolated to next period.`,
    forecastLine,
  };
};

/**
 * Runs prediction using the specified algorithm.
 * @param {number[]} values
 * @param {'ma'|'ewma'|'lr'} [algo='ewma']
 * @param {Object} [options]
 * @param {number} [options.window] - MA window
 * @param {number} [options.alpha] - EWMA smoothing factor
 * @returns {PredictionResult}
 */
const predict = (values, algo = "ewma", options = {}) => {
  const cleanValues = (values || []).map(Number).filter(v => !isNaN(v));
  switch (algo.toLowerCase()) {
    case "ma":
      return movingAverage(cleanValues, options.window || 5);
    case "lr":
      return linearRegression(cleanValues);
    case "ewma":
    default:
      return ewma(cleanValues, options.alpha || 0.3);
  }
};

/** @private */
const _empty = (algorithm) => ({
  predicted: 0,
  confidence: 0,
  algorithm,
  dataPoints: 0,
  reason: "Insufficient data for prediction.",
  forecastLine: [],
});

module.exports = { predict, movingAverage, ewma, linearRegression };
