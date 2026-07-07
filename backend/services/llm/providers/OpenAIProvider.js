/**
 * @module OpenAIProvider
 * @description LLM provider adapter for OpenAI (GPT-4o-mini / GPT-4o).
 * Requires OPENAI_API_KEY in environment.
 */

const logger = require("../../../config/logger");

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
  }

  getName() { return `OpenAI (${this.model})`; }
  isAvailable() { return !!this.apiKey; }

  _buildMessages(messages, context) {
    const systemPrompt = `You are PulseBoard's AI Analytics Copilot. Answer questions using ONLY the provided analytics data. Be concise, data-driven, and actionable. Use markdown formatting.\n\n${context.formattedSummary}`;
    return [
      { role: "system", content: systemPrompt },
      ...messages.filter((m) => m.role !== "system"),
    ];
  }

  async chat(messages, context) {
    if (!this.isAvailable()) throw new Error("OpenAI API key not configured");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages: this._buildMessages(messages, context), max_tokens: 800 }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  async stream(messages, context, onToken) {
    if (!this.isAvailable()) throw new Error("OpenAI API key not configured");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages: this._buildMessages(messages, context), max_tokens: 800, stream: true }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    let fullText = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        const json = line.replace("data: ", "").trim();
        if (json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json);
          const token = parsed.choices[0]?.delta?.content || "";
          if (token) { onToken(token); fullText += token; }
        } catch { /* skip malformed chunks */ }
      }
    }

    return fullText;
  }
}

module.exports = OpenAIProvider;
