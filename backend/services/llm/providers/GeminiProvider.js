/**
 * @module GeminiProvider
 * @description LLM provider adapter for Google Gemini (gemini-1.5-flash / gemini-pro).
 * Requires GEMINI_API_KEY in environment.
 */

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}`;
  }

  getName() { return `Gemini (${this.model})`; }
  isAvailable() { return !!this.apiKey; }

  _buildContents(messages, context) {
    const systemPrefix = `You are PulseBoard's AI Analytics Copilot. Answer using ONLY the provided analytics data. Be concise and use markdown.\n\n${context.formattedSummary}\n\n---\n`;
    const nonSystem = messages.filter((m) => m.role !== "system");
    return nonSystem.map((m, i) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: i === 0 && m.role === "user" ? systemPrefix + m.content : m.content }],
    }));
  }

  async chat(messages, context) {
    if (!this.isAvailable()) throw new Error("Gemini API key not configured");
    const response = await fetch(`${this.baseUrl}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: this._buildContents(messages, context) }),
    });
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "";
  }

  async stream(messages, context, onToken) {
    if (!this.isAvailable()) throw new Error("Gemini API key not configured");
    const response = await fetch(`${this.baseUrl}:streamGenerateContent?key=${this.apiKey}&alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: this._buildContents(messages, context) }),
    });
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    let fullText = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.replace("data: ", "").trim());
          const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (token) { onToken(token); fullText += token; }
        } catch { /* skip */ }
      }
    }
    return fullText;
  }
}

module.exports = GeminiProvider;
