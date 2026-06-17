import "server-only";
import type { AIProvider } from "./types";
import { createGeminiProvider } from "./gemini";
import { createOpenAIProvider } from "./openai";

let cached: AIProvider | null = null;

export function getAI(): AIProvider {
  if (cached) return cached;
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  switch (provider) {
    // OpenAI-compatible: Groq, OpenRouter, Mistral, DeepSeek, or any gateway
    // that speaks /chat/completions. Configure AI_BASE_URL / AI_API_KEY / AI_MODEL.
    case "openai":
    case "groq":
    case "openrouter":
      cached = createOpenAIProvider();
      break;
    case "gemini":
    default:
      cached = createGeminiProvider();
  }
  return cached;
}

export function aiConfigured(): boolean {
  return getAI().isConfigured();
}

// Safely extract JSON from a model response that may be wrapped in prose/markdown.
export function parseJsonLoose<T = any>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // strip ```json fences or find the first {...} / [...] block
    const fenced = text.replace(/```(?:json)?/gi, "").trim();
    try {
      return JSON.parse(fenced) as T;
    } catch {
      const match = fenced.match(/[{[][\s\S]*[}\]]/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

export type { AIProvider } from "./types";
