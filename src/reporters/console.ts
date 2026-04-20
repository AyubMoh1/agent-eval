import chalk from "chalk";
import type { TestResult } from "../types.js";

export interface ConsoleReporterOptions {
  verbose?: boolean;
}

export function reportConsole(
  results: TestResult[],
  options: ConsoleReporterOptions = {}
): void {
  console.log();

  for (const test of results) {
    const icon = test.passed ? chalk.green("✓") : chalk.red("✗");
    const duration = `(${(test.durationMs / 1000).toFixed(1)}s)`;
    const scorePart =
      test.aggregateScore != null
        ? chalk.dim(` score: ${test.aggregateScore.toFixed(2)}`)
        : "";

    console.log(`${icon} ${test.name} ${chalk.dim(duration)}${scorePart}`);

    if (test.error) {
      console.log(chalk.red(`  Error: ${test.error}`));
    }

    for (const step of test.steps) {
      if (options.verbose && step.response) {
        if (step.response.content) {
          console.log(chalk.dim("  response:"));
          for (const line of step.response.content.split("\n")) {
            console.log(chalk.dim(`    ${line}`));
          }
        }

        for (const toolCall of step.response.toolCalls) {
          console.log(
            chalk.dim(
              `  tool: ${toolCall.name} ${JSON.stringify(toolCall.arguments)}`
            )
          );
        }
      }

      for (const a of step.assertions) {
        const aIcon = a.passed ? chalk.green("  ✓") : chalk.red("  ✗");
        console.log(`${aIcon} ${a.type}: ${a.message}`);
      }
      for (const s of step.scores) {
        console.log(
          chalk.dim(`  ◆ ${s.dimension}: ${s.score.toFixed(2)} (w:${s.weight})`)
        );
      }
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log();
  console.log(
    `Results: ${total} tests, ${chalk.green(`${passed} passed`)}${failed > 0 ? `, ${chalk.red(`${failed} failed`)}` : ""}`
  );
  console.log();
}
