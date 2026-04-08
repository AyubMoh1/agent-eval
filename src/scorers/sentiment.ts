import type { Provider } from "../providers/base.js";
import type { ScoreResult } from "../types.js";

export async function scoreSentiment(
  judge: Provider,
  response: string,
  expected: "positive" | "negative" | "neutral"
): Promise<ScoreResult> {
  const messages = [
    {
      role: "system" as const,
      content:
        'Classify the sentiment of the following text as positive, negative, or neutral. Respond with ONLY a JSON object: {"sentiment": "positive"|"negative"|"neutral", "confidence": <0.0-1.0>}',
    },
    { role: "user" as const, content: response },
  ];

  const result = await judge.chat(messages);

  try {
    const parsed = JSON.parse(result.content);
    const matches = parsed.sentiment === expected;
    return {
      dimension: "sentiment",
      score: matches ? parsed.confidence : 1 - parsed.confidence,
      weight: 0,
      reasoning: `Detected: ${parsed.sentiment} (expected: ${expected})`,
    };
  } catch {
    return {
      dimension: "sentiment",
      score: 0,
      weight: 0,
      reasoning: `Failed to parse sentiment: ${result.content.slice(0, 200)}`,
    };
  }
}
