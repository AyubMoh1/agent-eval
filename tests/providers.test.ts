import { describe, it, expect } from "vitest";
import { CustomProvider } from "../src/providers/custom.js";
import { buildAnthropicMessagesRequest } from "../src/providers/anthropic.js";
import { buildOllamaChatRequest } from "../src/providers/ollama.js";
import { buildOpenAIChatRequest } from "../src/providers/openai.js";
import type { Message, ProviderResponse } from "../src/types.js";

const mockResponse: ProviderResponse = {
  content: "Hello! How can I help?",
  toolCalls: [
    { id: "tc_1", name: "search", arguments: { query: "test" } },
  ],
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  latencyMs: 100,
};

describe("CustomProvider", () => {
  it("calls the custom function with messages and tools", async () => {
    let receivedMessages: any;
    let receivedTools: any;

    const provider = new CustomProvider(async (messages, tools) => {
      receivedMessages = messages;
      receivedTools = tools;
      return mockResponse;
    });

    const messages = [
      { role: "system" as const, content: "You are helpful." },
      { role: "user" as const, content: "Hello" },
    ];
    const tools = [
      { name: "search", description: "Search", parameters: { query: "string" } },
    ];

    const result = await provider.chat(messages, tools);

    expect(receivedMessages).toEqual(messages);
    expect(receivedTools).toEqual(tools);
    expect(result.content).toBe("Hello! How can I help?");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("search");
    expect(result.usage.totalTokens).toBe(30);
  });

  it("works without tools", async () => {
    const provider = new CustomProvider(async () => ({
      content: "response",
      toolCalls: [],
      usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
      latencyMs: 50,
    }));

    const result = await provider.chat([
      { role: "user", content: "Hi" },
    ]);

    expect(result.content).toBe("response");
    expect(result.toolCalls).toHaveLength(0);
  });
});

describe("provider request builders", () => {
  const messages: Message[] = [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello" },
  ];
  const tools = [
    { name: "search", description: "Search", parameters: { query: "string" } },
  ];

  it("includes temperature in the OpenAI request", () => {
    const request = buildOpenAIChatRequest("gpt-4o", 0.2, messages, tools);

    expect(request.temperature).toBe(0.2);
    expect(request.model).toBe("gpt-4o");
  });

  it("includes temperature in the Anthropic request", () => {
    const request = buildAnthropicMessagesRequest(
      "claude-sonnet-4-20250514",
      0.3,
      messages,
      tools
    );

    expect(request.temperature).toBe(0.3);
    expect(request.model).toBe("claude-sonnet-4-20250514");
  });

  it("includes temperature in the Ollama request", () => {
    const request = buildOllamaChatRequest("llama3", 0.1, messages, tools);

    expect(request.temperature).toBe(0.1);
    expect(request.model).toBe("llama3");
  });

  it("omits temperature when it is undefined", () => {
    const request = buildOpenAIChatRequest("gpt-4o", undefined, messages);

    expect(request).not.toHaveProperty("temperature");
  });
});
