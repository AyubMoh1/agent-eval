import type { Provider } from "../providers/base.js";
import type { ScoreResult } from "../types.js";

export async function scoreGrounding(
  judge: Provider,
  response: string,
  toolResults: string[]
): Promise<ScoreResult> {
  const context = toolResults.join("\n---\n");
  const messages = [
    {
      role: "system" as const,
      content:
        'Evaluate whether the assistant response is grounded in the provided tool results. Score 0.0 if the response fabricates information not in the tool results, 1.0 if fully grounded. Respond with ONLY a JSON object: {"score": <0.0-1.0>, "reasoning": "<brief explanation>"}',
    },
    {
      role: "user" as const,
      content: `Tool results:\n${context}\n\nAssistant response:\n${response}`,
    },
  ];

  const result = await judge.chat(messages);

  try {
    const parsed = JSON.parse(result.content);
    return {
      dimension: "grounding",
      score: Math.max(0, Math.min(1, parsed.score)),
      weight: 0,
      reasoning: parsed.reasoning,
    };
  } catch {
    return {
      dimension: "grounding",
      score: 0,
      weight: 0,
      reasoning: `Failed to parse grounding: ${result.content.slice(0, 200)}`,
    };
  }
}
