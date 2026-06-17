// Provider-agnostic AI interface. Swapping Gemini for Claude/OpenAI later means
// adding one file that implements AIProvider and switching AI_PROVIDER in .env.

export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIFile {
  mimeType: string;
  dataBase64: string;
}

export interface ChatOptions {
  system?: string;
  messages: ChatMessage[];
  /** Ask the model to return strict JSON. */
  json?: boolean;
  /** Attachments (images / PDFs) for vision-capable models. */
  files?: AIFile[];
  temperature?: number;
  /** Per-call model override, e.g. a vision model for document inspection. */
  model?: string;
}

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  chat(opts: ChatOptions): Promise<string>;
}

export class AINotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured.");
    this.name = "AINotConfiguredError";
  }
}
