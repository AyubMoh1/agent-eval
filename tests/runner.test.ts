import { describe, it, expect } from "vitest";
import { runTest, runTests } from "../src/runner.js";
import type { TestConfig, ProviderResponse, Message, ToolDefinition } from "../src/types.js";

function mockProvider(responses: ProviderResponse[]) {
  let callIndex = 0;
  return async (_messages: Message[], _tools?: ToolDefinition[]) => {
    return responses[callIndex++] ?? responses[responses.length - 1];
  };
}

const baseConfig: TestConfig = {
  name: "test-basic",
  agent: {
    provider: "custom",
    model: "mock",
    system_prompt: "You are helpful.",
  },
  steps: [],
};

describe("runTest", () => {
  it("runs a simple user → assert flow", async () => {
    const config: TestConfig = {
      ...baseConfig,
      steps: [
        { user: "Hello" },
        { assert: { response_contains: "hi" } },
      ],
    };

    const result = await runTest(config, {
      customFn: mockProvider([
        {
          content: "Hi there!",
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          latencyMs: 100,
        },
      ]),
    });

    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].response?.content).toBe("Hi there!");
    expect(result.steps[1].assertions[0].passed).toBe(true);
  });

  it("fails when assertion does not match", async () => {
    const config: TestConfig = {
      ...baseConfig,
      steps: [
        { user: "Hello" },
        { assert: { response_contains: "goodbye" } },
      ],
    };

    const result = await runTest(config, {
      customFn: mockProvider([
        {
          content: "Hi there!",
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          latencyMs: 100,
        },
      ]),
    });

    expect(result.passed).toBe(false);
    expect(result.steps[1].assertions[0].passed).toBe(false);
  });

  it("handles tool calls with mock responses", async () => {
    const config: TestConfig = {
      ...baseConfig,
      agent: {
        ...baseConfig.agent,
        tools: [
          { name: "cancel_booking", description: "Cancel", parameters: { booking_id: "string" } },
        ],
      },
      steps: [
        { user: "Cancel booking B-1234" },
        { assert: { tool_called: "cancel_booking" } },
        {
          mock_tool_response: {
            cancel_booking: { success: true, refund: 50 },
          },
        },
        { assert: { response_contains: ["cancelled", "refund"] } },
      ],
    };

    const result = await runTest(config, {
      customFn: mockProvider([
        {
          content: "",
          toolCalls: [
            { id: "tc_1", name: "cancel_booking", arguments: { booking_id: "B-1234" } },
          ],
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
          latencyMs: 200,
        },
        {
          content: "Your booking has been cancelled. You'll receive a $50 refund.",
          toolCalls: [],
          usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
          latencyMs: 150,
        },
      ]),
    });

    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(4);
    expect(result.steps[1].assertions[0].passed).toBe(true);
    expect(result.steps[3].assertions[0].passed).toBe(true);
  });

  it("preserves assistant tool-call state for follow-up turns", async () => {
    const providerCalls: Message[][] = [];
    let callIndex = 0;

    const config: TestConfig = {
      ...baseConfig,
      agent: {
        ...baseConfig.agent,
        tools: [
          { name: "cancel_booking", description: "Cancel", parameters: { booking_id: "string" } },
        ],
      },
      steps: [
        { user: "Cancel booking B-1234" },
        {
          mock_tool_response: {
            cancel_booking: { success: true, refund: 50 },
          },
        },
      ],
    };

    await runTest(config, {
      customFn: async (messages) => {
        providerCalls.push(JSON.parse(JSON.stringify(messages)));

        const responses: ProviderResponse[] = [
          {
            content: "",
            toolCalls: [
              { id: "tc_1", name: "cancel_booking", arguments: { booking_id: "B-1234" } },
            ],
            usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
            latencyMs: 200,
          },
          {
            content: "Your booking has been cancelled. You'll receive a $50 refund.",
            toolCalls: [],
            usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
            latencyMs: 150,
          },
        ];

        return responses[callIndex++] ?? responses[responses.length - 1];
      },
    });

    expect(providerCalls).toHaveLength(2);
    expect(providerCalls[1][2]).toEqual({
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "tc_1", name: "cancel_booking", arguments: { booking_id: "B-1234" } },
      ],
    });
    expect(providerCalls[1][3]).toEqual({
      role: "tool",
      content: JSON.stringify({ success: true, refund: 50 }),
      tool_call_id: "tc_1",
    });
  });

  it("returns error when assert before any response", async () => {
    const config: TestConfig = {
      ...baseConfig,
      steps: [{ assert: { response_contains: "hi" } }],
    };

    const result = await runTest(config, {
      customFn: mockProvider([]),
    });

    expect(result.passed).toBe(false);
    expect(result.error).toContain("no prior response");
  });
});

describe("runTests", () => {
  it("runs multiple tests sequentially", async () => {
    const configs: TestConfig[] = [
      {
        ...baseConfig,
        name: "test-1",
        steps: [{ user: "Hi" }, { assert: { response_contains: "hello" } }],
      },
      {
        ...baseConfig,
        name: "test-2",
        steps: [{ user: "Bye" }, { assert: { response_contains: "hello" } }],
      },
    ];

    const results = await runTests(configs, {
      customFn: mockProvider([
        {
          content: "Hello!",
          toolCalls: [],
          usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
          latencyMs: 50,
        },
      ]),
    });

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
  });

  it("runs tests with concurrency", async () => {
    const configs: TestConfig[] = Array.from({ length: 4 }, (_, i) => ({
      ...baseConfig,
      name: `test-${i}`,
      steps: [{ user: "Hi" }, { assert: { response_contains: "ok" } }],
    }));

    const results = await runTests(configs, {
      concurrency: 2,
      customFn: mockProvider([
        {
          content: "ok",
          toolCalls: [],
          usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7 },
          latencyMs: 30,
        },
      ]),
    });

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
