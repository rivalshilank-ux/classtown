import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAiModel, getGroqClient, isAiConfigured } from "./groqClient";

const originalKey = process.env.GROQ_API_KEY;
const originalModel = process.env.GROQ_MODEL;

describe("isAiConfigured / getAiModel / getGroqClient", () => {
  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalKey;
    }
    if (originalModel === undefined) {
      delete process.env.GROQ_MODEL;
    } else {
      process.env.GROQ_MODEL = originalModel;
    }
  });

  it("reports not configured when GROQ_API_KEY is unset", () => {
    expect(isAiConfigured()).toBe(false);
  });

  it("reports configured once GROQ_API_KEY is set", () => {
    process.env.GROQ_API_KEY = "test-key";
    expect(isAiConfigured()).toBe(true);
  });

  it("throws from getGroqClient() when not configured, rather than constructing a broken client", () => {
    expect(() => getGroqClient()).toThrow(/GROQ_API_KEY/);
  });

  it("defaults the model when GROQ_MODEL is unset", () => {
    expect(getAiModel()).toBe("llama-3.3-70b-versatile");
  });

  it("honors an explicit GROQ_MODEL", () => {
    process.env.GROQ_MODEL = "custom-model";
    expect(getAiModel()).toBe("custom-model");
  });
});
