import { afterEach, describe, expect, it, vi } from "vitest";
import { reportConsole } from "../src/reporters/console.js";
import type { TestResult } from "../src/types.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportConsole", () => {
  it("shows full responses and tool calls in verbose mode", () => {
    const result: TestResult = {
      name: "verbose-console",
      passed: true,
      steps: [
        {
          stepIndex: 0,
          step: { user: "hello" },
          response: {
            content: "Line one\nLine two",
            toolCalls: [
              {
                id: "tc_1",
                name: "search",
                arguments: { query: "test" },
              },
            ],
            usage: {
              promptTokens: 10,
              completionTokens: 5,
              totalTokens: 15,
            },
            latencyMs: 100,
          },
          assertions: [],
          scores: [],
        },
      ],
      durationMs: 100,
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    reportConsole([result], { verbose: true });

    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Line one");
    expect(output).toContain("Line two");
    expect(output).toContain("search");
  });
});
