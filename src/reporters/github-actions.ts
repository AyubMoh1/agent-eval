import type { TestResult } from "../types.js";

export function reportGitHubActions(results: TestResult[]): void {
  for (const test of results) {
    if (test.error) {
      console.log(`::error title=${test.name}::${test.error}`);
      continue;
    }

    for (const step of test.steps) {
      for (const a of step.assertions) {
        if (!a.passed) {
          console.log(`::error title=${test.name}::${a.type}: ${a.message}`);
        }
      }
    }

    if (test.passed) {
      console.log(`::notice title=${test.name}::passed`);
    }
  }
}
