import type { AIProvider } from "./index.js";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    systemPrompt: string,
    userQuery: string,
    context: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<string> {
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const historyParts = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const fullPrompt = `${systemPrompt}\n\nFamily Context:\n${context}\n\nUser Question: ${userQuery}`;

    const body = {
      contents: [
        ...historyParts,
        { role: "user", parts: [{ text: fullPrompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I could not generate a response.";
  }
}
