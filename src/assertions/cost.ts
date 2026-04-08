import type { AssertionResult, ProviderResponse } from "../types.js";

export function assertLatencyUnder(
  response: ProviderResponse,
  maxMs: number
): AssertionResult {
  const passed = response.latencyMs < maxMs;
  return {
    type: "latency_under",
    passed,
    expected: `< ${maxMs}ms`,
    actual: `${Math.round(response.latencyMs)}ms`,
    message: passed
      ? `Latency ${Math.round(response.latencyMs)}ms < ${maxMs}ms`
      : `Latency ${Math.round(response.latencyMs)}ms exceeded ${maxMs}ms`,
  };
}

export function assertTokensUnder(
  response: ProviderResponse,
  maxTokens: number
): AssertionResult {
  const total = response.usage.totalTokens;
  const passed = total < maxTokens;
  return {
    type: "tokens_under",
    passed,
    expected: `< ${maxTokens} tokens`,
    actual: `${total} tokens`,
    message: passed
      ? `${total} tokens < ${maxTokens}`
      : `${total} tokens exceeded ${maxTokens}`,
  };
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4-turbo": { input: 10 / 1_000_000, output: 30 / 1_000_000 },
  "claude-sonnet-4-20250514": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  "claude-haiku-4-5-20251001": { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};

export function estimateCost(
  model: string,
  usage: ProviderResponse["usage"]
): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  return (
    usage.promptTokens * pricing.input +
    usage.completionTokens * pricing.output
  );
}

export function assertCostUnder(
  response: ProviderResponse,
  maxCost: number,
  model?: string
): AssertionResult {
  const cost = model ? estimateCost(model, response.usage) : null;
  if (cost == null) {
    return {
      type: "cost_under",
      passed: true,
      expected: `< $${maxCost}`,
      actual: "unknown (no pricing data)",
      message: "Cost check skipped: no pricing data for model",
    };
  }
  const passed = cost < maxCost;
  return {
    type: "cost_under",
    passed,
    expected: `< $${maxCost}`,
    actual: `$${cost.toFixed(6)}`,
    message: passed
      ? `Cost $${cost.toFixed(6)} < $${maxCost}`
      : `Cost $${cost.toFixed(6)} exceeded $${maxCost}`,
  };
}
