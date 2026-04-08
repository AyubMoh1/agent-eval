import { describe, it, expect } from "vitest";
import { CustomProvider } from "../src/providers/custom.js";
import type { ProviderResponse } from "../src/types.js";

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
