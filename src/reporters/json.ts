import type { TestResult } from "../types.js";

export function reportJson(results: TestResult[]): string {
  return JSON.stringify(results, null, 2);
}
