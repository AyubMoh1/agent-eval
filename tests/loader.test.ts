import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadTestFile, loadTestDirectory } from "../src/loader.js";

const TMP_DIR = join(import.meta.dirname, "__tmp_loader__");

const VALID_YAML = `
name: "test-basic"
description: "A basic test"
agent:
  provider: openai
  model: gpt-4o
  system_prompt: "You are a helpful assistant."
  tools:
    - name: search
      description: "Search the web"
      parameters:
        query: string
steps:
  - user: "Hello"
  - assert:
      response_contains: "hello"
  - mock_tool_response:
      search: { results: ["result1"] }
  - assert:
      tool_called: search
scoring:
  dimensions:
    correctness: 0.5
    relevance: 0.5
thresholds:
  pass: 0.8
  warn: 0.6
`;

const MINIMAL_YAML = `
name: "minimal"
agent:
  provider: anthropic
  model: claude-sonnet-4-20250514
  system_prompt: "Hi"
steps:
  - user: "test"
`;

const INVALID_NO_STEPS = `
name: "bad"
agent:
  provider: openai
  model: gpt-4o
  system_prompt: "test"
steps: []
`;

const INVALID_BAD_PROVIDER = `
name: "bad"
agent:
  provider: invalid_provider
  model: test
  system_prompt: "test"
steps:
  - user: "hello"
`;

const INVALID_EMPTY_ASSERT = `
name: "bad"
agent:
  provider: openai
  model: gpt-4o
  system_prompt: "test"
steps:
  - assert: {}
`;

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(join(TMP_DIR, "valid.yaml"), VALID_YAML);
  writeFileSync(join(TMP_DIR, "minimal.yml"), MINIMAL_YAML);
  writeFileSync(join(TMP_DIR, "not-yaml.txt"), "ignored");
});

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("loadTestFile", () => {
  it("parses a valid YAML file", () => {
    const config = loadTestFile(join(TMP_DIR, "valid.yaml"));
    expect(config.name).toBe("test-basic");
    expect(config.agent.provider).toBe("openai");
    expect(config.agent.model).toBe("gpt-4o");
    expect(config.agent.tools).toHaveLength(1);
    expect(config.steps).toHaveLength(4);
    expect(config.scoring?.dimensions.correctness).toBe(0.5);
    expect(config.thresholds?.pass).toBe(0.8);
  });

  it("parses a minimal YAML file", () => {
    const config = loadTestFile(join(TMP_DIR, "minimal.yml"));
    expect(config.name).toBe("minimal");
    expect(config.agent.provider).toBe("anthropic");
    expect(config.steps).toHaveLength(1);
    expect(config.scoring).toBeUndefined();
  });

  it("throws on missing file", () => {
    expect(() => loadTestFile(join(TMP_DIR, "nope.yaml"))).toThrow(
      "Cannot read test file"
    );
  });

  it("throws on empty steps", () => {
    writeFileSync(join(TMP_DIR, "no-steps.yaml"), INVALID_NO_STEPS);
    expect(() => loadTestFile(join(TMP_DIR, "no-steps.yaml"))).toThrow(
      "at least one step"
    );
  });

  it("throws on invalid provider", () => {
    writeFileSync(join(TMP_DIR, "bad-provider.yaml"), INVALID_BAD_PROVIDER);
    expect(() => loadTestFile(join(TMP_DIR, "bad-provider.yaml"))).toThrow(
      "Validation error"
    );
  });

  it("throws on empty assert", () => {
    writeFileSync(join(TMP_DIR, "empty-assert.yaml"), INVALID_EMPTY_ASSERT);
    expect(() => loadTestFile(join(TMP_DIR, "empty-assert.yaml"))).toThrow(
      "at least one assertion"
    );
  });
});

describe("loadTestDirectory", () => {
  it("loads all YAML files from a directory", () => {
    const validDir = join(TMP_DIR, "valid-only");
    mkdirSync(validDir, { recursive: true });
    writeFileSync(join(validDir, "a.yaml"), VALID_YAML);
    writeFileSync(join(validDir, "b.yml"), MINIMAL_YAML);
    const configs = loadTestDirectory(validDir);
    expect(configs).toHaveLength(2);
    const names = configs.map((c) => c.name);
    expect(names).toContain("minimal");
    expect(names).toContain("test-basic");
  });

  it("throws on non-existent directory", () => {
    expect(() => loadTestDirectory("/nonexistent")).toThrow(
      "Cannot read directory"
    );
  });

  it("throws on directory with no YAML files", () => {
    const emptyDir = join(TMP_DIR, "empty");
    mkdirSync(emptyDir, { recursive: true });
    expect(() => loadTestDirectory(emptyDir)).toThrow("No YAML test files");
  });
});
