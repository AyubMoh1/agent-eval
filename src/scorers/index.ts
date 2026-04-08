import type { Provider } from "../providers/base.js";
import type {
  ProviderResponse,
  ScoreResult,
  ScoringConfig,
  ScoringDimension,
} from "../types.js";
import { judgeDimension } from "./llm-judge.js";
import { scoreSentiment } from "./sentiment.js";
import { scoreGrounding } from "./grounding.js";
import { runCustomScorer } from "./custom.js";

export async function runScoring(
  config: ScoringConfig,
  judge: Provider,
  userMessage: string,
  response: ProviderResponse,
  toolResults: string[]
): Promise<{ scores: ScoreResult[]; aggregate: number }> {
  const scores: ScoreResult[] = [];

  for (const [dim, weight] of Object.entries(config.dimensions)) {
    const dimension = dim as ScoringDimension;
    let result: ScoreResult;

    switch (dimension) {
      case "sentiment":
        result = await scoreSentiment(judge, response.content, "positive");
        break;
      case "grounding":
        result = await scoreGrounding(judge, response.content, toolResults);
        break;
      case "custom":
        if (config.custom_scorer) {
          result = await runCustomScorer(config.custom_scorer, response);
        } else {
          result = { dimension, score: 0, weight: weight!, reasoning: "No custom scorer path" };
        }
        break;
      case "latency":
        result = {
          dimension,
          score: response.latencyMs < 2000 ? 1 : Math.max(0, 1 - (response.latencyMs - 2000) / 8000),
          weight: weight!,
          reasoning: `${Math.round(response.latencyMs)}ms`,
        };
        break;
      default:
        result = await judgeDimension(judge, dimension, userMessage, response.content);
        break;
    }

    result.weight = weight!;
    scores.push(result);
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const aggregate =
    totalWeight > 0
      ? scores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight
      : 0;

  return { scores, aggregate };
}
