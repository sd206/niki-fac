import type { AIProvider } from "./index.js";

export class StubProvider implements AIProvider {
  name = "stub";

  async generateResponse(
    _systemPrompt: string,
    userQuery: string,
    context: string,
    _history: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<string> {
    const lines = context.split("\n").filter(Boolean);
    const sections = new Set<string>();
    for (const line of lines) {
      if (line.startsWith("[")) {
        const end = line.indexOf("]");
        if (end > 0) sections.add(line.slice(1, end));
      }
    }

    const sectionList = Array.from(sections).join(", ");
    const contextLines = lines.slice(0, 12).join("\n");

    return `I found ${lines.length} relevant data points across these areas: ${sectionList || "none"}.

Based on your family's data:

${contextLines}

This is a stub response (no GEMINI_API_KEY configured). To get full AI-powered answers, set the GEMINI_API_KEY environment variable. Your question was: "${userQuery}"`;
  }
}
