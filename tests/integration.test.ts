import { describe, it, expect } from "vitest";
import { loadTestFile, loadTestDirectory } from "../src/loader.js";
import { runTest, runTests } from "../src/runner.js";
import { reportJson } from "../src/reporters/json.js";
import { reportMarkdown } from "../src/reporters/markdown.js";
import type { ProviderResponse, Message, ToolDefinition } from "../src/types.js";
import { join } from "node:path";

function mockAgent(responses: ProviderResponse[]) {
  let i = 0;
  return async (_msgs: Message[], _tools?: ToolDefinition[]) =>
    responses[i++] ?? responses[responses.length - 1];
}

describe("integration: full pipeline", () => {
  it("loads example YAML and runs with mock provider", () => {
    const config = loadTestFile(
      join(import.meta.dirname, "../examples/basic/hello.yaml")
    );
    expect(config.name).toBe("basic-hello");
    expect(config.steps).toHaveLength(2);
  });

  it("loads example directory", () => {
    const configs = loadTestDirectory(
      join(import.meta.dirname, "../examples/basic")
    );
    expect(configs.length).toBeGreaterThan(0);
  });

  it("end-to-end: run test with custom mock, assert pass", async () => {
    const config = loadTestFile(
      join(import.meta.dirname, "../examples/basic/hello.yaml")
    );

    const result = await runTest(config, {
      customFn: mockAgent([
        {
          content:
            "TypeScript is a typed superset of JavaScript.",
          toolCalls: [],
          usage: { promptTokens: 20, completionTokens: 15, totalTokens: 35 },
          latencyMs: 800,
        },
      ]),
    });

    expect(result.passed).toBe(true);
    expect(result.name).toBe("basic-hello");
  });

  it("end-to-end: tool-use flow with mocks", async () => {
    const config = loadTestFile(
      join(import.meta.dirname, "../examples/tool-use/booking-cancel.yaml")
    );

    const result = await runTest(config, {
      customFn: mockAgent([
        {
          content: "",
          toolCalls: [
            {
              id: "tc_1",
              name: "cancel_booking",
              arguments: { booking_id: "B-1234" },
            },
          ],
          usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
          latencyMs: 300,
        },
        {
          content:
            "Done! Your booking has been cancelled. A $50 refund is on the way.",
          toolCalls: [],
          usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
          latencyMs: 200,
        },
        {
          content: '{"score": 0.9, "reasoning": "Correct tool flow"}',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          latencyMs: 50,
        },
        {
          content: '{"score": 0.8, "reasoning": "Relevant response"}',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          latencyMs: 50,
        },
        {
          content: '{"score": 1.0, "reasoning": "Safe response"}',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          latencyMs: 50,
        },
      ]),
    });

    expect(result.passed).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("reporters produce valid output", async () => {
    const config = loadTestFile(
      join(import.meta.dirname, "../examples/basic/hello.yaml")
    );
    const result = await runTest(config, {
      customFn: mockAgent([
        {
          content: "TypeScript is great.",
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          latencyMs: 100,
        },
      ]),
    });

    const json = reportJson([result]);
    expect(() => JSON.parse(json)).not.toThrow();

    const md = reportMarkdown([result]);
    expect(md).toContain("basic-hello");
    expect(md).toContain("Pass");
  });

  it("runTests handles multiple configs", async () => {
    const configs = loadTestDirectory(
      join(import.meta.dirname, "../examples/basic")
    );

    const results = await runTests(configs, {
      customFn: mockAgent([
        {
          content: "TypeScript is a typed superset of JavaScript.",
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          latencyMs: 200,
        },
      ]),
    });

    expect(results.length).toBe(configs.length);
  });
});
