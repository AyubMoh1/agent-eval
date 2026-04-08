import type { AssertionResult, ProviderResponse } from "../types.js";

export function assertToolCalled(
  response: ProviderResponse,
  toolName: string
): AssertionResult {
  const found = response.toolCalls.some((tc) => tc.name === toolName);
  return {
    type: "tool_called",
    passed: found,
    expected: toolName,
    actual: response.toolCalls.map((tc) => tc.name),
    message: found
      ? `Tool '${toolName}' was called`
      : `Expected tool '${toolName}' to be called, got: [${response.toolCalls.map((tc) => tc.name).join(", ")}]`,
  };
}

export function assertToolNotCalled(
  response: ProviderResponse,
  toolName: string
): AssertionResult {
  const found = response.toolCalls.some((tc) => tc.name === toolName);
  return {
    type: "tool_not_called",
    passed: !found,
    expected: `not ${toolName}`,
    actual: response.toolCalls.map((tc) => tc.name),
    message: !found
      ? `Tool '${toolName}' was not called`
      : `Expected tool '${toolName}' NOT to be called, but it was`,
  };
}

export function assertToolArgs(
  response: ProviderResponse,
  expectedArgs: Record<string, unknown>
): AssertionResult {
  const match = response.toolCalls.find((tc) => {
    return Object.entries(expectedArgs).every(
      ([key, value]) => JSON.stringify(tc.arguments[key]) === JSON.stringify(value)
    );
  });
  return {
    type: "tool_args",
    passed: !!match,
    expected: expectedArgs,
    actual: response.toolCalls.map((tc) => tc.arguments),
    message: match
      ? "Tool arguments match"
      : `No tool call matched expected args: ${JSON.stringify(expectedArgs)}`,
  };
}

export function assertMinToolCalls(
  response: ProviderResponse,
  min: number
): AssertionResult {
  const count = response.toolCalls.length;
  return {
    type: "min_tool_calls",
    passed: count >= min,
    expected: `>= ${min}`,
    actual: count,
    message:
      count >= min
        ? `${count} tool calls (>= ${min})`
        : `Expected >= ${min} tool calls, got ${count}`,
  };
}

export function assertMaxToolCalls(
  response: ProviderResponse,
  max: number
): AssertionResult {
  const count = response.toolCalls.length;
  return {
    type: "max_tool_calls",
    passed: count <= max,
    expected: `<= ${max}`,
    actual: count,
    message:
      count <= max
        ? `${count} tool calls (<= ${max})`
        : `Expected <= ${max} tool calls, got ${count}`,
  };
}
