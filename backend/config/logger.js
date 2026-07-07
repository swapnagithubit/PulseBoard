/**
 * @module logger
 * @description Centralized application logger using Winston.
 * Outputs colorized logs to console and structured JSON to files.
 */

const { createLogger, format, transports } = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = format;

/** @type {import('winston').Logform.Format} */
const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true })
  ),
  transports: [
    // Colorized console output
    new transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

module.exports = logger;
