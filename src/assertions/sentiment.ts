import type { AssertionResult, ProviderResponse } from "../types.js";

const POSITIVE_TERMS = [
  "appreciate",
  "awesome",
  "excellent",
  "glad",
  "good",
  "great",
  "happy",
  "perfect",
  "pleased",
  "thanks",
  "thank you",
  "wonderful",
];

const NEGATIVE_TERMS = [
  "apologize",
  "apology",
  "bad",
  "disappointed",
  "error",
  "fail",
  "frustrating",
  "problem",
  "regret",
  "sorry",
  "terrible",
  "unfortunately",
];

function countTerms(content: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    return count + (content.includes(term) ? 1 : 0);
  }, 0);
}

export function detectSentiment(
  content: string
): "positive" | "negative" | "neutral" {
  const normalized = content.toLowerCase();
  const positiveScore = countTerms(normalized, POSITIVE_TERMS);
  const negativeScore = countTerms(normalized, NEGATIVE_TERMS);

  if (positiveScore === negativeScore) {
    return "neutral";
  }

  return positiveScore > negativeScore ? "positive" : "negative";
}

export function assertSentiment(
  response: ProviderResponse,
  expected: "positive" | "negative" | "neutral"
): AssertionResult {
  const actual = detectSentiment(response.content);

  return {
    type: "response_sentiment",
    passed: actual === expected,
    expected,
    actual,
    message:
      actual === expected
        ? `Response sentiment is ${expected}`
        : `Expected ${expected} sentiment, detected ${actual}`,
  };
}
