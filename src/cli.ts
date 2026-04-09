#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTestFile, loadTestDirectory } from "./loader.js";
import { runTests } from "./runner.js";
import { reportConsole } from "./reporters/console.js";
import { reportJson } from "./reporters/json.js";
import { reportMarkdown } from "./reporters/markdown.js";
import { reportGitHubActions } from "./reporters/github-actions.js";
import type { TestConfig } from "./types.js";

const program = new Command();

program
  .name("agent-eval")
  .description("Lightweight CLI for testing AI agent behavior")
  .version("0.1.0");

program
  .command("run")
  .description("Run agent test files")
  .argument("[paths...]", "test files or directories", ["tests/"])
  .option("-r, --reporter <type>", "output format", "console")
  .option("-c, --concurrency <n>", "parallel test files", "1")
  .option("-t, --timeout <ms>", "timeout per test", "30000")
  .option("--verbose", "show full LLM responses")
  .option("--provider <name>", "override provider for all tests")
  .option("--model <name>", "override model for all tests")
  .action(async (paths: string[], opts) => {
    const configs: TestConfig[] = [];

    for (const p of paths) {
      const abs = resolve(p);
      if (!existsSync(abs)) {
        console.error(`Not found: ${abs}`);
        process.exit(1);
      }
      if (statSync(abs).isDirectory()) {
        configs.push(...loadTestDirectory(abs));
      } else {
        configs.push(loadTestFile(abs));
      }
    }

    if (configs.length === 0) {
      console.error("No test files found.");
      process.exit(1);
    }

    // Apply overrides
    if (opts.provider || opts.model) {
      for (const c of configs) {
        if (opts.provider) c.agent.provider = opts.provider;
        if (opts.model) c.agent.model = opts.model;
      }
    }

    const results = await runTests(configs, {
      concurrency: parseInt(opts.concurrency, 10),
      timeout: parseInt(opts.timeout, 10),
    });

    switch (opts.reporter) {
      case "json":
        console.log(reportJson(results));
        break;
      case "markdown":
        console.log(reportMarkdown(results));
        break;
      case "github-actions":
        reportGitHubActions(results);
        break;
      default:
        reportConsole(results);
        break;
    }

    const hasFailures = results.some((r) => !r.passed);
    process.exit(hasFailures ? 1 : 0);
  });

program
  .command("init")
  .description("Create an example test file")
  .action(() => {
    const example = `name: "example-agent-test"
description: "Example test for an AI agent"

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
  - user: "What is TypeScript?"
  - assert:
      response_contains: "TypeScript"
      no_error: true
      latency_under: 5000
`;

    const outPath = "example.eval.yaml";
    writeFileSync(outPath, example);
    console.log(`Created ${outPath}`);
  });

program
  .command("diff")
  .description("Compare two JSON result files")
  .argument("<file1>", "first result file")
  .argument("<file2>", "second result file")
  .action(async (file1: string, file2: string) => {
    const { readFileSync } = await import("node:fs");
    const results1 = JSON.parse(readFileSync(resolve(file1), "utf-8"));
    const results2 = JSON.parse(readFileSync(resolve(file2), "utf-8"));

    console.log("\nRegression Report\n");
    const map1 = new Map(results1.map((r: any) => [r.name, r]));

    for (const r2 of results2) {
      const r1 = map1.get(r2.name) as any;
      if (!r1) {
        console.log(`  + NEW: ${r2.name} (${r2.passed ? "pass" : "fail"})`);
        continue;
      }
      if (r1.passed && !r2.passed) {
        console.log(`  ↓ REGRESSION: ${r2.name} (pass → fail)`);
      } else if (!r1.passed && r2.passed) {
        console.log(`  ↑ FIXED: ${r2.name} (fail → pass)`);
      } else {
        console.log(`  = ${r2.name} (${r2.passed ? "pass" : "fail"})`);
      }
    }
    console.log();
  });

program.parse();
