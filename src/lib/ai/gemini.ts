import { AINotConfiguredError, type AIProvider, type ChatOptions } from "./types";

// Google Gemini provider (free tier via Google AI Studio).
// Docs: https://ai.google.dev/api/generate-content
export function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  return {
    name: "gemini",
    isConfigured() {
      return apiKey.trim().length > 0;
    },
    async chat(opts: ChatOptions): Promise<string> {
      if (!apiKey) throw new AINotConfiguredError();

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents = opts.messages.map((m, i) => {
        const parts: any[] = [{ text: m.content }];
        // Attach files to the last user message.
        if (i === opts.messages.length - 1 && opts.files?.length) {
          for (const f of opts.files) {
            parts.push({ inline_data: { mime_type: f.mimeType, data: f.dataBase64 } });
          }
        }
        return { role: m.role, parts };
      });

      const body: any = {
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      };
      if (opts.system) {
        body.systemInstruction = { parts: [{ text: opts.system }] };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
      }

      const json = await res.json();
      const text =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
      if (!text) {
        const blocked = json?.promptFeedback?.blockReason;
        throw new Error(blocked ? `Response blocked: ${blocked}` : "Empty response from model.");
      }
      return text;
    },
  };
}
