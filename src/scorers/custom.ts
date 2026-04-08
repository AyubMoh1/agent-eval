import { resolve } from "node:path";
import type { ScoreResult, ProviderResponse } from "../types.js";

export type CustomScorerFn = (
  response: ProviderResponse
) => Promise<ScoreResult> | ScoreResult;

export async function runCustomScorer(
  scorerPath: string,
  response: ProviderResponse
): Promise<ScoreResult> {
  const absPath = resolve(scorerPath);
  try {
    const mod = await import(absPath);
    const scoreFn: CustomScorerFn = mod.default ?? mod.score;
    if (typeof scoreFn !== "function") {
      throw new Error(`No default export or 'score' function in ${absPath}`);
    }
    return await scoreFn(response);
  } catch (err) {
    return {
      dimension: "custom",
      score: 0,
      weight: 0,
      reasoning: `Custom scorer error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
