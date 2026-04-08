import { describe, it, expect } from "vitest";
import { runAssertions } from "../src/assertions/index.js";
import type { ProviderResponse } from "../src/types.js";

function makeResponse(overrides: Partial<ProviderResponse> = {}): ProviderResponse {
  return {
    content: "I've cancelled your booking B-1234. You'll receive a $50 refund.",
    toolCalls: [
      { id: "tc_1", name: "cancel_booking", arguments: { booking_id: "B-1234" } },
    ],
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    latencyMs: 500,
    ...overrides,
  };
}

describe("tool-call assertions", () => {
  it("tool_called passes when tool was called", () => {
    const results = runAssertions({ tool_called: "cancel_booking" }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("tool_called fails when tool was not called", () => {
    const results = runAssertions({ tool_called: "search" }, makeResponse());
    expect(results[0].passed).toBe(false);
  });

  it("tool_not_called passes", () => {
    const results = runAssertions({ tool_not_called: "search" }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("tool_args matches", () => {
    const results = runAssertions(
      { tool_args: { booking_id: "B-1234" } },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("tool_args fails on mismatch", () => {
    const results = runAssertions(
      { tool_args: { booking_id: "B-9999" } },
      makeResponse()
    );
    expect(results[0].passed).toBe(false);
  });

  it("min_tool_calls passes", () => {
    const results = runAssertions({ min_tool_calls: 1 }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("max_tool_calls fails when exceeded", () => {
    const response = makeResponse({
      toolCalls: [
        { id: "1", name: "a", arguments: {} },
        { id: "2", name: "b", arguments: {} },
        { id: "3", name: "c", arguments: {} },
      ],
    });
    const results = runAssertions({ max_tool_calls: 2 }, response);
    expect(results[0].passed).toBe(false);
  });
});

describe("content assertions", () => {
  it("response_contains with string", () => {
    const results = runAssertions(
      { response_contains: "cancelled" },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("response_contains with array", () => {
    const results = runAssertions(
      { response_contains: ["cancelled", "refund"] },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("response_contains fails on missing term", () => {
    const results = runAssertions(
      { response_contains: ["cancelled", "error"] },
      makeResponse()
    );
    expect(results[0].passed).toBe(false);
  });

  it("contains_none passes", () => {
    const results = runAssertions(
      { contains_none: ["error", "failed"] },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("contains_none fails when found", () => {
    const results = runAssertions(
      { contains_none: ["cancelled"] },
      makeResponse()
    );
    expect(results[0].passed).toBe(false);
  });

  it("response_matches with regex", () => {
    const results = runAssertions(
      { response_matches: "\\$\\d+" },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("response_length passes in bounds", () => {
    const results = runAssertions(
      { response_length: { min: 10, max: 200 } },
      makeResponse()
    );
    expect(results[0].passed).toBe(true);
  });

  it("response_length fails out of bounds", () => {
    const results = runAssertions(
      { response_length: { max: 5 } },
      makeResponse()
    );
    expect(results[0].passed).toBe(false);
  });

  it("no_error passes on clean response", () => {
    const results = runAssertions({ no_error: true }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("no_error fails on error response", () => {
    const results = runAssertions(
      { no_error: true },
      makeResponse({ content: "Error: something went wrong" })
    );
    expect(results[0].passed).toBe(false);
  });
});

describe("cost assertions", () => {
  it("latency_under passes", () => {
    const results = runAssertions({ latency_under: 1000 }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("latency_under fails", () => {
    const results = runAssertions({ latency_under: 100 }, makeResponse());
    expect(results[0].passed).toBe(false);
  });

  it("tokens_under passes", () => {
    const results = runAssertions({ tokens_under: 200 }, makeResponse());
    expect(results[0].passed).toBe(true);
  });

  it("tokens_under fails", () => {
    const results = runAssertions({ tokens_under: 100 }, makeResponse());
    expect(results[0].passed).toBe(false);
  });

  it("cost_under with known model", () => {
    const results = runAssertions(
      { cost_under: 1 },
      makeResponse(),
      "gpt-4o"
    );
    expect(results[0].passed).toBe(true);
  });
});

describe("multiple assertions", () => {
  it("runs all assertions in a single config", () => {
    const results = runAssertions(
      {
        tool_called: "cancel_booking",
        response_contains: "refund",
        latency_under: 1000,
        no_error: true,
      },
      makeResponse()
    );
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
