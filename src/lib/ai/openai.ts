import { AINotConfiguredError, type AIProvider, type ChatOptions } from "./types";

// OpenAI-compatible provider. Works with any service that exposes the
// /chat/completions API shape: Groq, OpenRouter, Mistral, DeepSeek, Together,
// a self-hosted gateway, or a regional proxy. Configure via env:
//
//   AI_PROVIDER="openai"
//   AI_BASE_URL="https://api.groq.com/openai/v1"   (no trailing /chat/completions)
//   AI_API_KEY="..."
//   AI_MODEL="llama-3.3-70b-versatile"
//
export function createOpenAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY || "";
  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  return {
    name: "openai",
    isConfigured() {
      return apiKey.trim().length > 0;
    },
    async chat(opts: ChatOptions): Promise<string> {
      if (!apiKey) throw new AINotConfiguredError();

      const messages: any[] = [];
      if (opts.system) messages.push({ role: "system", content: opts.system });

      opts.messages.forEach((m, i) => {
        const role = m.role === "model" ? "assistant" : "user";
        // Attach files to the last message: images as image_url, PDFs as
        // document_url (Mistral's document understanding format).
        const isLast = i === opts.messages.length - 1;
        const files = isLast && opts.files ? opts.files : [];
        const attachments = files
          .map((f) => {
            if (f.mimeType.startsWith("image/")) {
              return { type: "image_url", image_url: { url: `data:${f.mimeType};base64,${f.dataBase64}` } };
            }
            if (f.mimeType === "application/pdf") {
              return { type: "document_url", document_url: `data:application/pdf;base64,${f.dataBase64}` };
            }
            return null;
          })
          .filter(Boolean);
        if (attachments.length) {
          messages.push({ role, content: [{ type: "text", text: m.content }, ...attachments] });
        } else {
          messages.push({ role, content: m.content });
        }
      });

      const body: any = {
        model: opts.model || model,
        messages,
        temperature: opts.temperature ?? 0.4,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      };

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`AI API error ${res.status}: ${errText.slice(0, 500)}`);
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("Empty response from model.");
      return typeof text === "string" ? text : JSON.stringify(text);
    },
  };
}
