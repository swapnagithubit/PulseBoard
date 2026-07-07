/**
 * @module llm/index
 * @description LLM Provider Factory.
 *
 * Selects the appropriate provider based on the LLM_PROVIDER environment variable.
 * Priority order when LLM_PROVIDER is not set:
 *   1. OpenAI (if OPENAI_API_KEY present)
 *   2. Claude (if CLAUDE_API_KEY present)
 *   3. Gemini (if GEMINI_API_KEY present)
 *   4. Ollama (if server reachable)
 *   5. Deterministic (always available fallback)
 *
 * Usage:
 *   const { getProvider } = require('./services/llm');
 *   const provider = getProvider();
 *   await provider.stream(messages, context, onToken);
 *
 * To switch providers, set in .env:
 *   LLM_PROVIDER=openai    → OpenAI
 *   LLM_PROVIDER=claude    → Anthropic Claude
 *   LLM_PROVIDER=gemini    → Google Gemini
 *   LLM_PROVIDER=ollama    → Local Ollama
 *   LLM_PROVIDER=deterministic → Built-in (default)
 */

const DeterministicProvider = require("./providers/DeterministicProvider");
const OpenAIProvider = require("./providers/OpenAIProvider");
const ClaudeProvider = require("./providers/ClaudeProvider");
const GeminiProvider = require("./providers/GeminiProvider");
const OllamaProvider = require("./providers/OllamaProvider");
const logger = require("../../config/logger");

/** @type {Map<string, Object>} Singleton provider instances */
const _instances = new Map();

/**
 * Returns the configured LLM provider singleton.
 * @returns {DeterministicProvider|OpenAIProvider|ClaudeProvider|GeminiProvider|OllamaProvider}
 */
const getProvider = () => {
  const requested = (process.env.LLM_PROVIDER || "auto").toLowerCase();

  if (_instances.has(requested)) return _instances.get(requested);

  let provider;

  if (requested === "openai") {
    provider = new OpenAIProvider();
  } else if (requested === "claude") {
    provider = new ClaudeProvider();
  } else if (requested === "gemini") {
    provider = new GeminiProvider();
  } else if (requested === "ollama") {
    provider = new OllamaProvider();
  } else if (requested === "deterministic") {
    provider = new DeterministicProvider();
  } else {
    // Auto-detect based on available API keys
    if (process.env.OPENAI_API_KEY) {
      provider = new OpenAIProvider();
      logger.info("[LLM Factory] Auto-selected: OpenAI");
    } else if (process.env.CLAUDE_API_KEY) {
      provider = new ClaudeProvider();
      logger.info("[LLM Factory] Auto-selected: Claude");
    } else if (process.env.GEMINI_API_KEY) {
      provider = new GeminiProvider();
      logger.info("[LLM Factory] Auto-selected: Gemini");
    } else {
      provider = new DeterministicProvider();
      logger.info("[LLM Factory] Auto-selected: Deterministic (no API keys found)");
    }
  }

  _instances.set(requested, provider);
  logger.info(`[LLM Factory] Provider initialized: ${provider.getName()}`);
  return provider;
};

/**
 * Returns a list of all configured providers and their availability.
 * @returns {Object[]}
 */
const getProviderStatus = () => [
  { name: "Deterministic", key: "deterministic", available: true, description: "Built-in rule-based engine" },
  { name: "OpenAI", key: "openai", available: !!process.env.OPENAI_API_KEY, description: process.env.OPENAI_MODEL || "gpt-4o-mini" },
  { name: "Claude", key: "claude", available: !!process.env.CLAUDE_API_KEY, description: process.env.CLAUDE_MODEL || "claude-3-haiku" },
  { name: "Gemini", key: "gemini", available: !!process.env.GEMINI_API_KEY, description: process.env.GEMINI_MODEL || "gemini-1.5-flash" },
  { name: "Ollama", key: "ollama", available: false, description: process.env.OLLAMA_MODEL || "llama3 (local)" },
];

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 */

module.exports = { getProvider, getProviderStatus };
