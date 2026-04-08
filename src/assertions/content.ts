import type { AssertionResult, ProviderResponse } from "../types.js";

export function assertContains(
  response: ProviderResponse,
  expected: string | string[]
): AssertionResult {
  const terms = Array.isArray(expected) ? expected : [expected];
  const lower = response.content.toLowerCase();
  const missing = terms.filter((t) => !lower.includes(t.toLowerCase()));
  return {
    type: "response_contains",
    passed: missing.length === 0,
    expected: terms,
    actual: response.content.slice(0, 200),
    message:
      missing.length === 0
        ? `Response contains all expected terms`
        : `Missing: [${missing.join(", ")}]`,
  };
}

export function assertContainsNone(
  response: ProviderResponse,
  forbidden: string | string[]
): AssertionResult {
  const terms = Array.isArray(forbidden) ? forbidden : [forbidden];
  const lower = response.content.toLowerCase();
  const found = terms.filter((t) => lower.includes(t.toLowerCase()));
  return {
    type: "contains_none",
    passed: found.length === 0,
    expected: `none of [${terms.join(", ")}]`,
    actual: found.length > 0 ? `found: [${found.join(", ")}]` : "none found",
    message:
      found.length === 0
        ? "Response contains none of the forbidden terms"
        : `Found forbidden terms: [${found.join(", ")}]`,
  };
}

export function assertMatches(
  response: ProviderResponse,
  pattern: string
): AssertionResult {
  const regex = new RegExp(pattern, "i");
  const matched = regex.test(response.content);
  return {
    type: "response_matches",
    passed: matched,
    expected: pattern,
    actual: response.content.slice(0, 200),
    message: matched
      ? `Response matches pattern /${pattern}/`
      : `Response does not match pattern /${pattern}/`,
  };
}

export function assertLength(
  response: ProviderResponse,
  constraints: { min?: number; max?: number }
): AssertionResult {
  const len = response.content.length;
  const passMin = constraints.min == null || len >= constraints.min;
  const passMax = constraints.max == null || len <= constraints.max;
  return {
    type: "response_length",
    passed: passMin && passMax,
    expected: constraints,
    actual: len,
    message:
      passMin && passMax
        ? `Response length ${len} within bounds`
        : `Response length ${len} out of bounds (${constraints.min ?? 0}–${constraints.max ?? "∞"})`,
  };
}

export function assertNoError(
  response: ProviderResponse
): AssertionResult {
  const errorPatterns = ["error:", "exception:", "failed:", "i cannot", "i can't"];
  const lower = response.content.toLowerCase();
  const found = errorPatterns.find((p) => lower.includes(p));
  return {
    type: "no_error",
    passed: !found,
    expected: "no error indicators",
    actual: found ?? "none",
    message: found
      ? `Response contains error indicator: "${found}"`
      : "No error indicators found",
  };
}
