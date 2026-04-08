import type {
  AssertionConfig,
  AssertionResult,
  ProviderResponse,
} from "../types.js";
import {
  assertToolCalled,
  assertToolNotCalled,
  assertToolArgs,
  assertMinToolCalls,
  assertMaxToolCalls,
} from "./tool-call.js";
import {
  assertContains,
  assertContainsNone,
  assertMatches,
  assertLength,
  assertNoError,
} from "./content.js";
import {
  assertLatencyUnder,
  assertTokensUnder,
  assertCostUnder,
} from "./cost.js";

export function runAssertions(
  config: AssertionConfig,
  response: ProviderResponse,
  model?: string
): AssertionResult[] {
  const results: AssertionResult[] = [];

  if (config.tool_called != null)
    results.push(assertToolCalled(response, config.tool_called));
  if (config.tool_not_called != null)
    results.push(assertToolNotCalled(response, config.tool_not_called));
  if (config.tool_args != null)
    results.push(assertToolArgs(response, config.tool_args));
  if (config.min_tool_calls != null)
    results.push(assertMinToolCalls(response, config.min_tool_calls));
  if (config.max_tool_calls != null)
    results.push(assertMaxToolCalls(response, config.max_tool_calls));

  if (config.response_contains != null)
    results.push(assertContains(response, config.response_contains));
  if (config.contains_none != null)
    results.push(assertContainsNone(response, config.contains_none));
  if (config.response_matches != null)
    results.push(assertMatches(response, config.response_matches));
  if (config.response_length != null)
    results.push(assertLength(response, config.response_length));
  if (config.no_error === true) results.push(assertNoError(response));

  if (config.latency_under != null)
    results.push(assertLatencyUnder(response, config.latency_under));
  if (config.tokens_under != null)
    results.push(assertTokensUnder(response, config.tokens_under));
  if (config.cost_under != null)
    results.push(assertCostUnder(response, config.cost_under, model));

  return results;
}
