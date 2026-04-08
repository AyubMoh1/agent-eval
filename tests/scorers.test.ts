import { describe, it, expect } from "vitest";
import { runScoring } from "../src/scorers/index.js";
import { judgeDimension } from "../src/scorers/llm-judge.js";
import { scoreSentiment } from "../src/scorers/sentiment.js";
import { scoreGrounding } from "../src/scorers/grounding.js";
import { CustomProvider } from "../src/providers/custom.js";
import type { ProviderResponse } from "../src/types.js";

function mockJudge(response: string) {
  return new CustomProvider(async () => ({
    content: response,
    toolCalls: [],
    usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    latencyMs: 50,
  }));
}

const testResponse: ProviderResponse = {
  content: "Your booking has been cancelled. You'll receive a $50 refund.",
  toolCalls: [],
  usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
  latencyMs: 300,
};

describe("judgeDimension", () => {
  it("scores correctness via LLM judge", async () => {
    const judge = mockJudge('{"score": 0.9, "reasoning": "Accurate response"}');
    const result = await judgeDimension(judge, "correctness", "Cancel B-1234", testResponse.content);
    expect(result.dimension).toBe("correctness");
    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe("Accurate response");
  });

  it("clamps score to 0-1 range", async () => {
    const judge = mockJudge('{"score": 1.5, "reasoning": "Over"}');
    const result = await judgeDimension(judge, "relevance", "test", "test");
    expect(result.score).toBe(1);
  });

  it("handles unparseable judge response", async () => {
    const judge = mockJudge("I rate this 8/10");
    const result = await judgeDimension(judge, "correctness", "test", "test");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("Failed to parse");
  });

  it("returns zero for unknown dimension", async () => {
    const judge = mockJudge('{"score": 1}');
    const result = await judgeDimension(judge, "custom", "test", "test");
    expect(result.score).toBe(0);
  });
});

describe("scoreSentiment", () => {
  it("scores matching sentiment", async () => {
    const judge = mockJudge('{"sentiment": "positive", "confidence": 0.95}');
    const result = await scoreSentiment(judge, testResponse.content, "positive");
    expect(result.score).toBe(0.95);
  });

  it("scores mismatched sentiment", async () => {
    const judge = mockJudge('{"sentiment": "negative", "confidence": 0.8}');
    const result = await scoreSentiment(judge, testResponse.content, "positive");
    expect(result.score).toBeCloseTo(0.2);
  });
});

describe("scoreGrounding", () => {
  it("scores grounded response", async () => {
    const judge = mockJudge('{"score": 0.95, "reasoning": "Well grounded"}');
    const result = await scoreGrounding(
      judge,
      testResponse.content,
      ['{"success": true, "refund": 50}']
    );
    expect(result.score).toBe(0.95);
  });
});

describe("runScoring", () => {
  it("computes weighted aggregate", async () => {
    const judge = mockJudge('{"score": 0.8, "reasoning": "Good"}');
    const { scores, aggregate } = await runScoring(
      { dimensions: { correctness: 0.6, relevance: 0.4 } },
      judge,
      "Cancel booking",
      testResponse,
      []
    );
    expect(scores).toHaveLength(2);
    expect(aggregate).toBeCloseTo(0.8);
  });

  it("handles latency scoring without LLM call", async () => {
    const judge = mockJudge('{}');
    const { scores } = await runScoring(
      { dimensions: { latency: 1.0 } },
      judge,
      "test",
      testResponse,
      []
    );
    expect(scores[0].dimension).toBe("latency");
    expect(scores[0].score).toBe(1); // 300ms < 2000ms threshold
  });
});
