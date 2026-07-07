/**
 * @module OllamaProvider
 * @description LLM provider adapter for Ollama (local models: llama3, mistral, etc.).
 * Requires a running Ollama server. No API key needed.
 */

class OllamaProvider {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3";
  }

  getName() { return `Ollama (${this.model})`; }

  async isAvailable() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  _buildMessages(messages, context) {
    const systemContent = `You are PulseBoard's AI Analytics Copilot. Answer using ONLY the analytics data provided. Be concise and use markdown.\n\n${context.formattedSummary}`;
    return [
      { role: "system", content: systemContent },
      ...messages.filter((m) => m.role !== "system"),
    ];
  }

  async chat(messages, context) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages: this._buildMessages(messages, context), stream: false }),
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data = await response.json();
    return data.message?.content || "";
  }

  async stream(messages, context, onToken) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages: this._buildMessages(messages, context), stream: true }),
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

    let fullText = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const token = parsed.message?.content || "";
          if (token) { onToken(token); fullText += token; }
          if (parsed.done) return fullText;
        } catch { /* skip */ }
      }
    }
    return fullText;
  }
}

module.exports = OllamaProvider;
