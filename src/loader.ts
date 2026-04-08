import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { TestConfig } from "./types.js";

// ── Zod Schemas ───────────────────────────────────────────────────

const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()).default({}),
});

const AgentConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "ollama", "custom"]),
  model: z.string(),
  system_prompt: z.string(),
  tools: z.array(ToolDefinitionSchema).optional(),
  temperature: z.number().min(0).max(2).optional(),
  base_url: z.string().optional(),
});

const AssertionConfigSchema = z
  .object({
    tool_called: z.string().optional(),
    tool_not_called: z.string().optional(),
    tool_args: z.record(z.unknown()).optional(),
    min_tool_calls: z.number().int().min(0).optional(),
    max_tool_calls: z.number().int().min(0).optional(),
    response_contains: z.union([z.string(), z.array(z.string())]).optional(),
    contains_none: z.union([z.string(), z.array(z.string())]).optional(),
    response_matches: z.string().optional(),
    response_length: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    no_error: z.boolean().optional(),
    latency_under: z.number().optional(),
    tokens_under: z.number().optional(),
    cost_under: z.number().optional(),
    response_sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Assert step must contain at least one assertion",
  });

const UserStepSchema = z.object({ user: z.string() });
const AssertStepSchema = z.object({ assert: AssertionConfigSchema });
const MockToolResponseStepSchema = z.object({
  mock_tool_response: z.record(z.unknown()),
});

const StepSchema = z.union([
  UserStepSchema,
  AssertStepSchema,
  MockToolResponseStepSchema,
]);

const ScoringDimensionSchema = z.enum([
  "correctness",
  "relevance",
  "safety",
  "no_hallucination",
  "latency",
  "sentiment",
  "grounding",
  "custom",
]);

const ScoringConfigSchema = z.object({
  dimensions: z.record(ScoringDimensionSchema, z.number().min(0).max(1)),
  judge_provider: AgentConfigSchema.optional(),
  custom_scorer: z.string().optional(),
});

const ThresholdsConfigSchema = z.object({
  pass: z.number().min(0).max(1),
  warn: z.number().min(0).max(1).optional(),
});

const TestConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  agent: AgentConfigSchema,
  steps: z.array(StepSchema).min(1, "Test must contain at least one step"),
  scoring: ScoringConfigSchema.optional(),
  thresholds: ThresholdsConfigSchema.optional(),
});

// ── Loader Functions ──────────────────────────────────────────────

export function loadTestFile(filePath: string): TestConfig {
  const absPath = resolve(filePath);
  let raw: string;
  try {
    raw = readFileSync(absPath, "utf-8");
  } catch {
    throw new Error(`Cannot read test file: ${absPath}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid YAML in ${absPath}: ${msg}`);
  }

  const result = TestConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Validation error in ${absPath}:\n${issues}`);
  }

  return result.data as TestConfig;
}

export function loadTestDirectory(dirPath: string): TestConfig[] {
  const absDir = resolve(dirPath);
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    throw new Error(`Cannot read directory: ${absDir}`);
  }

  const yamlFiles = entries
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();

  if (yamlFiles.length === 0) {
    throw new Error(`No YAML test files found in ${absDir}`);
  }

  return yamlFiles.map((f) => loadTestFile(join(absDir, f)));
}
