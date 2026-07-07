/**
 * @module errorHandler
 * @description Global Express error handling middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 */

const logger = require("../config/logger");

/**
 * Global error handler — must be registered last in Express middleware chain.
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  logger.error(`[${req.method}] ${req.originalUrl} → ${status}: ${message}`, {
    stack: err.stack,
    body: req.body,
  });

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Creates an HTTP error with a status code.
 * @param {number} status
 * @param {string} message
 * @returns {Error}
 */
const createError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

module.exports = { errorHandler, createError };
