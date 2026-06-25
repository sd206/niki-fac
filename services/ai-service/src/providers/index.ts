export interface AIProvider {
  name: string;
  generateResponse(
    systemPrompt: string,
    userQuery: string,
    context: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<string>;
}

let cachedProvider: AIProvider | null = null;

export async function getProvider(): Promise<AIProvider> {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 0) {
    const { GeminiProvider } = await import("./gemini.js");
    cachedProvider = new GeminiProvider(apiKey);
  } else {
    const { StubProvider } = await import("./stub.js");
    cachedProvider = new StubProvider();
  }
  return cachedProvider;
}
