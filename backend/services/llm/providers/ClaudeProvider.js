/**
 * @module ClaudeProvider
 * @description LLM provider adapter for Anthropic Claude (claude-3-haiku / claude-3-5-sonnet).
 * Requires CLAUDE_API_KEY in environment.
 */

class ClaudeProvider {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.model = process.env.CLAUDE_MODEL || "claude-3-haiku-20240307";
    this.baseUrl = "https://api.anthropic.com/v1/messages";
  }

  getName() { return `Claude (${this.model})`; }
  isAvailable() { return !!this.apiKey; }

  _buildPayload(messages, context, stream = false) {
    const systemPrompt = `You are PulseBoard's AI Analytics Copilot. Answer questions using ONLY the provided analytics data. Be concise, data-driven, and actionable. Use markdown.\n\n${context.formattedSummary}`;
    return {
      model: this.model,
      max_tokens: 800,
      system: systemPrompt,
      stream,
      messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
    };
  }

  async chat(messages, context) {
    if (!this.isAvailable()) throw new Error("Claude API key not configured");
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(this._buildPayload(messages, context)),
    });
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
    const data = await response.json();
    return data.content[0]?.text || "";
  }

  async stream(messages, context, onToken) {
    if (!this.isAvailable()) throw new Error("Claude API key not configured");
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(this._buildPayload(messages, context, true)),
    });
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

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
          if (parsed.type === "content_block_delta") {
            const token = parsed.delta?.text || "";
            if (token) { onToken(token); fullText += token; }
          }
        } catch { /* skip */ }
      }
    }
    return fullText;
  }
}

module.exports = ClaudeProvider;
