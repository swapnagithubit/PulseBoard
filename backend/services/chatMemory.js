/**
 * @module chatMemory
 * @description In-memory conversation history store for the AI copilot.
 * Keyed by sessionId (Socket.io socket ID), stores the last N turns.
 * Auto-expires sessions after inactivity.
 */

const logger = require("../config/logger");

/** Maximum messages to retain per session */
const MAX_HISTORY = 12;

/** Session expiry in milliseconds (30 minutes) */
const SESSION_TTL = 30 * 60 * 1000;

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatSession
 * @property {ChatMessage[]} messages
 * @property {number} lastActivity
 */

/** @type {Map<string, ChatSession>} */
const sessions = new Map();

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) logger.info(`[ChatMemory] Cleaned ${cleaned} expired sessions`);
}, 10 * 60 * 1000);

/**
 * Retrieves the message history for a session.
 * @param {string} sessionId
 * @returns {ChatMessage[]}
 */
const getHistory = (sessionId) => {
  return sessions.get(sessionId)?.messages || [];
};

/**
 * Appends a message to a session's history.
 * @param {string} sessionId
 * @param {ChatMessage} message
 */
const addMessage = (sessionId, message) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], lastActivity: Date.now() });
  }
  const session = sessions.get(sessionId);
  session.messages.push(message);
  session.lastActivity = Date.now();

  // Trim to max history (keep system prompt if present)
  const systemMessages = session.messages.filter((m) => m.role === "system");
  const nonSystemMessages = session.messages.filter((m) => m.role !== "system");
  if (nonSystemMessages.length > MAX_HISTORY) {
    session.messages = [
      ...systemMessages,
      ...nonSystemMessages.slice(-MAX_HISTORY),
    ];
  }
};

/**
 * Clears a session's message history.
 * @param {string} sessionId
 */
const clearSession = (sessionId) => {
  sessions.delete(sessionId);
  logger.info(`[ChatMemory] Session ${sessionId} cleared`);
};

/**
 * Returns the number of active sessions.
 * @returns {number}
 */
const getActiveSessionCount = () => sessions.size;

module.exports = { getHistory, addMessage, clearSession, getActiveSessionCount };
