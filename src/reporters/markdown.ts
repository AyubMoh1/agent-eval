import type { TestResult } from "../types.js";

export function reportMarkdown(results: TestResult[]): string {
  const lines: string[] = ["# Agent Eval Results", ""];
  lines.push("| Test | Status | Score | Duration |");
  lines.push("|------|--------|-------|----------|");

  for (const r of results) {
    const status = r.passed ? "✅ Pass" : "❌ Fail";
    const score = r.aggregateScore != null ? r.aggregateScore.toFixed(2) : "—";
    const duration = `${(r.durationMs / 1000).toFixed(1)}s`;
    lines.push(`| ${r.name} | ${status} | ${score} | ${duration} |`);
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  lines.push("");
  lines.push(`**${passed}/${total} passed**`);

  return lines.join("\n");
}
