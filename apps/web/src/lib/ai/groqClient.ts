import "server-only";
import Groq from "groq-sdk";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Never checked from anywhere but here, and never derived from
 * NEXT_PUBLIC_*: the browser never talks to Groq directly, only through
 * server actions in this module's callers.
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function getAiModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

let cachedClient: Groq | null = null;

/**
 * Throws if called without GROQ_API_KEY set -- callers must check
 * isAiConfigured() first and return an honest "not configured" result
 * instead of letting this throw reach a user-facing error path.
 */
export function getGroqClient(): Groq {
  if (!isAiConfigured()) {
    throw new Error("GROQ_API_KEY is not set. See .env.example.");
  }
  cachedClient ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  return cachedClient;
}
