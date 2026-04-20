// ── Agent & Tool Definitions ──────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentConfig {
  provider: "openai" | "anthropic" | "ollama" | "custom";
  model: string;
  system_prompt: string;
  tools?: ToolDefinition[];
  temperature?: number;
  base_url?: string;
}

// ── Messages ──────────────────────────────────────────────────────

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ── Steps (flat, discriminated) ───────────────────────────────────

export interface UserStep {
  user: string;
}

export interface AssertStep {
  assert: AssertionConfig;
}

export interface MockToolResponseStep {
  mock_tool_response: Record<string, unknown>;
}

export type Step = UserStep | AssertStep | MockToolResponseStep;

// ── Assertions ────────────────────────────────────────────────────

export interface AssertionConfig {
  // Tool-call assertions
  tool_called?: string;
  tool_not_called?: string;
  tool_args?: Record<string, unknown>;
  min_tool_calls?: number;
  max_tool_calls?: number;

  // Content assertions
  response_contains?: string | string[];
  contains_none?: string | string[];
  response_matches?: string;
  response_length?: { min?: number; max?: number };
  no_error?: boolean;

  // Cost/performance assertions
  latency_under?: number;
  tokens_under?: number;
  cost_under?: number;

  // Sentiment
  response_sentiment?: "positive" | "negative" | "neutral";
}

// ── Scoring ───────────────────────────────────────────────────────

export type ScoringDimension =
  | "correctness"
  | "relevance"
  | "safety"
  | "no_hallucination"
  | "latency"
  | "sentiment"
  | "grounding"
  | "custom";

export interface ScoringConfig {
  dimensions: Partial<Record<ScoringDimension, number>>; // dimension → weight
  judge_provider?: AgentConfig;
  custom_scorer?: string; // path to JS/TS file
}

export interface ThresholdsConfig {
  pass: number;
  warn?: number;
}

// ── Test Config (top-level YAML) ──────────────────────────────────

export interface TestConfig {
  name: string;
  description?: string;
  agent: AgentConfig;
  steps: Step[];
  scoring?: ScoringConfig;
  thresholds?: ThresholdsConfig;
}

// ── Provider Response ─────────────────────────────────────────────

export interface ProviderResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

// ── Results ───────────────────────────────────────────────────────

export interface AssertionResult {
  type: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message: string;
}

export interface ScoreResult {
  dimension: ScoringDimension;
  score: number; // 0–1
  weight: number;
  reasoning?: string;
}

export interface StepResult {
  stepIndex: number;
  step: Step;
  response?: ProviderResponse;
  assertions: AssertionResult[];
  scores: ScoreResult[];
}

export interface TestResult {
  name: string;
  description?: string;
  passed: boolean;
  steps: StepResult[];
  aggregateScore?: number;
  durationMs: number;
  error?: string;
}
